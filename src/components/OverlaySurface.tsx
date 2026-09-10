import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanonicalPoint, DisplayOrientation, DisplayViewport, OverlayMode, SceneItem, StrokePoint, StrokeSceneItem } from "../types/overlay";

export type PointerSample = { clientX: number; clientY: number };
export type SurfaceRect = { left: number; top: number; width: number; height: number };

export function viewportSize(viewport: DisplayViewport): { width: number; height: number } {
  const { width, height } = viewport.logicalSize;
  return viewport.orientation === "degrees90" || viewport.orientation === "degrees270"
    ? { width: height, height: width }
    : { width, height };
}

export function viewportBackingSize(viewport: DisplayViewport): { width: number; height: number } {
  const size = viewportSize(viewport);
  return {
    width: Math.max(1, Math.round(size.width * viewport.scaleFactor)),
    height: Math.max(1, Math.round(size.height * viewport.scaleFactor)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rotatePoint(point: CanonicalPoint, size: { width: number; height: number }, orientation: DisplayOrientation): CanonicalPoint {
  switch (orientation) {
    case "degrees90": return { x: size.height - point.y, y: point.x };
    case "degrees180": return { x: size.width - point.x, y: size.height - point.y };
    case "degrees270": return { x: point.y, y: size.width - point.x };
    case "degrees0": return point;
  }
}

function inverseRotatePoint(point: CanonicalPoint, size: { width: number; height: number }, orientation: DisplayOrientation): CanonicalPoint {
  switch (orientation) {
    case "degrees90": return { x: point.y, y: size.height - point.x };
    case "degrees180": return { x: size.width - point.x, y: size.height - point.y };
    case "degrees270": return { x: size.width - point.y, y: point.x };
    case "degrees0": return point;
  }
}

export function canonicalToViewport(point: CanonicalPoint, viewport: DisplayViewport): CanonicalPoint {
  const local = {
    x: clamp(point.x - viewport.origin.x, 0, viewport.logicalSize.width),
    y: clamp(point.y - viewport.origin.y, 0, viewport.logicalSize.height),
  };
  return rotatePoint(local, viewport.logicalSize, viewport.orientation);
}

export function viewportToCanonical(point: CanonicalPoint, viewport: DisplayViewport): CanonicalPoint {
  const size = viewportSize(viewport);
  const bounded = { x: clamp(point.x, 0, size.width), y: clamp(point.y, 0, size.height) };
  const local = inverseRotatePoint(bounded, viewport.logicalSize, viewport.orientation);
  return { x: local.x + viewport.origin.x, y: local.y + viewport.origin.y };
}

export function normalizePointerPath(samples: readonly PointerSample[], rect: SurfaceRect, viewport?: DisplayViewport): StrokePoint[] {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    return [];
  }

  return samples.flatMap((sample) => {
    const x = (sample.clientX - rect.left) / rect.width;
    const y = (sample.clientY - rect.top) / rect.height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    if (!viewport) return [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }];
    const size = viewportSize(viewport);
    return [viewportToCanonical({ x: x * size.width, y: y * size.height }, viewport)];
  });
}

export function createStroke(id: string, points: readonly StrokePoint[]): StrokeSceneItem {
  return { id, kind: "stroke", points };
}

export function transientStrokeForSamples(
  samples: readonly PointerSample[],
  rect: SurfaceRect,
  viewport?: DisplayViewport,
): StrokeSceneItem | null {
  const points = normalizePointerPath(samples, rect, viewport);
  return points.length < 2 ? null : createStroke("transient-stroke", points);
}

export function appendStroke(scene: readonly SceneItem[], stroke: StrokeSceneItem): readonly SceneItem[] {
  return scene.some((item) => item.id === stroke.id) ? scene : [...scene, stroke];
}

export function canvasPointerEvents(mode: OverlayMode): "auto" | "none" {
  return mode === "VisibleInteractive" ? "auto" : "none";
}

export function drawScene(
  context: Pick<CanvasRenderingContext2D, "clearRect" | "beginPath" | "moveTo" | "lineTo" | "stroke">,
  scene: readonly SceneItem[],
  width: number,
  height: number,
  viewport?: DisplayViewport,
  transientStroke?: StrokeSceneItem | null,
) {
  context.clearRect(0, 0, width, height);
  for (const item of transientStroke ? [...scene, transientStroke] : scene) {
    if (item.kind !== "stroke" || item.points.length < 2) continue;
    context.beginPath();
    const [first, ...rest] = item.points;
    const toViewport = viewport ? (point: CanonicalPoint) => canonicalToViewport(point, viewport) : (point: CanonicalPoint) => ({ x: point.x * width, y: point.y * height });
    const firstPoint = toViewport(first);
    context.moveTo(viewport ? firstPoint.x : firstPoint.x, viewport ? firstPoint.y : firstPoint.y);
    for (const point of rest) {
      const viewportPoint = toViewport(point);
      context.lineTo(viewportPoint.x, viewportPoint.y);
    }
    context.stroke();
  }
}

type Props = {
  mode: OverlayMode;
  scene: readonly SceneItem[];
  viewport: DisplayViewport;
  onCommitStroke: (stroke: StrokeSceneItem) => void;
};

export function OverlaySurface({ mode, scene, viewport, onCommitStroke }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const nextStrokeIdRef = useRef(0);
  const [transientStroke, setTransientStroke] = useState<StrokeSceneItem | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = viewport.scaleFactor;
    const size = viewportSize(viewport);
    const { width, height } = viewportBackingSize(viewport);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.strokeStyle = "rgba(239, 68, 68, 0.92)";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    drawScene(context, scene, size.width, size.height, viewport, transientStroke);
  }, [scene, transientStroke, viewport]);

  useEffect(() => {
    redraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(redraw);
    observer?.observe(canvas);
    window.addEventListener("resize", redraw);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", redraw);
    };
  }, [redraw]);

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "VisibleInteractive" || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    samplesRef.current = [{ clientX: event.clientX, clientY: event.clientY }];
    setTransientStroke(null);
  };

  const moveStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    samplesRef.current.push({ clientX: event.clientX, clientY: event.clientY });
    setTransientStroke(transientStrokeForSamples(samplesRef.current, event.currentTarget.getBoundingClientRect(), viewport));
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const canvas = event.currentTarget;
    const samples = samplesRef.current;
    pointerIdRef.current = null;
    samplesRef.current = [];
    setTransientStroke(null);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const points = normalizePointerPath(samples, rect, viewport);
    if (points.length < 2) return;
    nextStrokeIdRef.current += 1;
    onCommitStroke(createStroke(`stroke-${nextStrokeIdRef.current}`, points));
  };

  return (
    <canvas
      ref={canvasRef}
      aria-label="Annotation surface"
      className="overlay-surface"
      data-overlay-canvas="true"
      style={{ pointerEvents: canvasPointerEvents(mode), width: viewportSize(viewport).width, height: viewportSize(viewport).height }}
      width={Math.max(1, Math.round(viewportSize(viewport).width * viewport.scaleFactor))}
      height={Math.max(1, Math.round(viewportSize(viewport).height * viewport.scaleFactor))}
      onPointerDown={beginStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    />
  );
}

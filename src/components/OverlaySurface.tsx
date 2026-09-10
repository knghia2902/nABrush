import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  AnnotationStyle,
  AnnotationTool,
  CanonicalPoint,
  DisplayOrientation,
  DisplayViewport,
  OverlayMode,
  SceneItem,
  StrokePoint,
  StrokeSceneItem,
  StrokeTool,
} from "../types/overlay";
import { DEFAULT_PEN_STYLE } from "../types/overlay";

export type PointerSample = { clientX: number; clientY: number };
export type SurfaceRect = { left: number; top: number; width: number; height: number };

type CanvasRenderContext = Pick<CanvasRenderingContext2D, "clearRect" | "beginPath" | "moveTo" | "lineTo" | "stroke"> &
  Partial<Pick<CanvasRenderingContext2D, "strokeStyle" | "lineWidth" | "lineCap" | "lineJoin" | "globalAlpha">> & {
    globalCompositeOperation?: string;
  };

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

export function createStroke(
  id: string,
  points: readonly StrokePoint[],
  style: AnnotationStyle = DEFAULT_PEN_STYLE,
  tool: StrokeTool = "pen",
): StrokeSceneItem {
  return { id, kind: "stroke", tool, points, style };
}

export function transientSceneItemForGesture(
  samples: readonly PointerSample[],
  rect: SurfaceRect,
  viewport: DisplayViewport | undefined,
  tool: StrokeTool,
  style: AnnotationStyle,
): StrokeSceneItem | null {
  const points = normalizePointerPath(samples, rect, viewport);
  return points.length < 2 ? null : createStroke("transient-stroke", points, style, tool);
}

/** Backwards-compatible helper for the Phase 2 renderer tests and call sites. */
export function transientStrokeForSamples(
  samples: readonly PointerSample[],
  rect: SurfaceRect,
  viewport?: DisplayViewport,
): StrokeSceneItem | null {
  return transientSceneItemForGesture(samples, rect, viewport, "pen", DEFAULT_PEN_STYLE);
}

export function appendStroke(scene: readonly SceneItem[], stroke: StrokeSceneItem): readonly SceneItem[] {
  return scene.some((item) => item.id === stroke.id) ? scene : [...scene, stroke];
}

export function canvasPointerEvents(mode: OverlayMode): "auto" | "none" {
  return mode === "VisibleInteractive" ? "auto" : "none";
}

function drawStroke(context: CanvasRenderContext, item: StrokeSceneItem, width: number, height: number, viewport?: DisplayViewport) {
  if (item.points.length < 2) return;
  const toViewport = viewport
    ? (point: CanonicalPoint) => canonicalToViewport(point, viewport)
    : (point: CanonicalPoint) => ({ x: point.x * width, y: point.y * height });
  const [first, ...rest] = item.points;
  const firstPoint = toViewport(first);

  context.strokeStyle = item.style.color;
  context.lineWidth = item.style.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = item.style.opacity;
  context.globalCompositeOperation = item.tool === "highlighter" ? "multiply" : "source-over";
  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);
  for (const point of rest) {
    const viewportPoint = toViewport(point);
    context.lineTo(viewportPoint.x, viewportPoint.y);
  }
  context.stroke();
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}

export function drawScene(
  context: CanvasRenderContext,
  scene: readonly SceneItem[],
  width: number,
  height: number,
  viewport?: DisplayViewport,
  transientSceneItem?: StrokeSceneItem | null,
) {
  context.clearRect(0, 0, width, height);
  for (const item of transientSceneItem ? [...scene, transientSceneItem] : scene) {
    if (item.kind !== "stroke") continue;
    drawStroke(context, item, width, height, viewport);
  }
}

type Props = {
  mode: OverlayMode;
  scene: readonly SceneItem[];
  viewport: DisplayViewport;
  activeTool: AnnotationTool;
  toolStyle: AnnotationStyle;
  onCommitSceneItem: (item: SceneItem) => void;
};

export function OverlaySurface({ mode, scene, viewport, activeTool, toolStyle, onCommitSceneItem }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const gestureStyleRef = useRef<AnnotationStyle>(toolStyle);
  const gestureToolRef = useRef<StrokeTool>(activeTool === "highlighter" ? "highlighter" : "pen");
  const nextItemIdRef = useRef(0);
  const [transientSceneItem, setTransientSceneItem] = useState<StrokeSceneItem | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = viewport.scaleFactor;
    const size = viewportSize(viewport);
    const { width, height } = viewportBackingSize(viewport);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(context, scene, size.width, size.height, viewport, transientSceneItem);
  }, [scene, transientSceneItem, viewport]);

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

  const cancelGesture = useCallback(() => {
    const canvas = canvasRef.current;
    const pointerId = pointerIdRef.current;
    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    pointerIdRef.current = null;
    samplesRef.current = [];
    setTransientSceneItem(null);
  }, []);

  useEffect(() => {
    if (mode !== "VisibleInteractive" || (activeTool !== "pen" && activeTool !== "highlighter")) cancelGesture();
  }, [activeTool, cancelGesture, mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelGesture();
    };
    const handleBlur = () => cancelGesture();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [cancelGesture]);

  const beginGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "VisibleInteractive" || event.button !== 0 || (activeTool !== "pen" && activeTool !== "highlighter")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    samplesRef.current = [{ clientX: event.clientX, clientY: event.clientY }];
    gestureStyleRef.current = { ...toolStyle };
    gestureToolRef.current = activeTool;
    setTransientSceneItem(null);
  };

  const moveGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    samplesRef.current.push({ clientX: event.clientX, clientY: event.clientY });
    setTransientSceneItem(transientSceneItemForGesture(
      samplesRef.current,
      event.currentTarget.getBoundingClientRect(),
      viewport,
      gestureToolRef.current,
      gestureStyleRef.current,
    ));
  };

  const endGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const canvas = event.currentTarget;
    const samples = samplesRef.current;
    const style = gestureStyleRef.current;
    const tool = gestureToolRef.current;
    const points = normalizePointerPath(samples, canvas.getBoundingClientRect(), viewport);
    cancelGesture();
    if (points.length < 2) return;
    nextItemIdRef.current += 1;
    onCommitSceneItem(createStroke(`stroke-${nextItemIdRef.current}`, points, style, tool));
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
      onPointerDown={beginGesture}
      onPointerMove={moveGesture}
      onPointerUp={endGesture}
      onPointerCancel={cancelGesture}
    />
  );
}

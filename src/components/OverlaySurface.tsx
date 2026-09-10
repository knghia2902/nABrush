import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { OverlayMode, SceneItem, StrokePoint, StrokeSceneItem } from "../types/overlay";

export type PointerSample = { clientX: number; clientY: number };
export type SurfaceRect = { left: number; top: number; width: number; height: number };

export function normalizePointerPath(samples: readonly PointerSample[], rect: SurfaceRect): StrokePoint[] {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    return [];
  }

  return samples.flatMap((sample) => {
    const x = (sample.clientX - rect.left) / rect.width;
    const y = (sample.clientY - rect.top) / rect.height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    return [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }];
  });
}

export function createStroke(id: string, points: readonly StrokePoint[]): StrokeSceneItem {
  return { id, kind: "stroke", points };
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
) {
  context.clearRect(0, 0, width, height);
  for (const item of scene) {
    if (item.kind !== "stroke" || item.points.length < 2) continue;
    context.beginPath();
    const [first, ...rest] = item.points;
    context.moveTo(first.x * width, first.y * height);
    for (const point of rest) context.lineTo(point.x * width, point.y * height);
    context.stroke();
  }
}

type Props = {
  mode: OverlayMode;
  scene: readonly SceneItem[];
  onCommitStroke: (stroke: StrokeSceneItem) => void;
};

export function OverlaySurface({ mode, scene, onCommitStroke }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const nextStrokeIdRef = useRef(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.strokeStyle = "rgba(239, 68, 68, 0.92)";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    drawScene(context, scene, rect.width, rect.height);
  }, [scene]);

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
  };

  const moveStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    samplesRef.current.push({ clientX: event.clientX, clientY: event.clientY });
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const canvas = event.currentTarget;
    const samples = samplesRef.current;
    pointerIdRef.current = null;
    samplesRef.current = [];
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const points = normalizePointerPath(samples, rect);
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
      style={{ pointerEvents: canvasPointerEvents(mode) }}
      onPointerDown={beginStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    />
  );
}

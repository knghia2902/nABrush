import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  AnnotationStyle,
  AnnotationTool,
  CanonicalPoint,
  DisplayOrientation,
  DisplayViewport,
  GeometrySceneItem,
  LineGeometry,
  OverlayMode,
  SceneItem,
  SceneGeometry,
  StrokePoint,
  StrokeSceneItem,
  StrokeTool,
} from "../types/overlay";
import { DEFAULT_PEN_STYLE } from "../types/overlay";
import { isGeometryDragValid } from "../state/annotation";

export type PointerSample = { clientX: number; clientY: number };
export type SurfaceRect = { left: number; top: number; width: number; height: number };

type CanvasRenderContext = Pick<CanvasRenderingContext2D, "clearRect" | "beginPath" | "moveTo" | "lineTo" | "stroke"> &
  Partial<Pick<CanvasRenderingContext2D, "closePath" | "fill" | "rect" | "ellipse" | "save" | "restore" | "strokeStyle" | "fillStyle" | "lineWidth" | "lineCap" | "lineJoin" | "globalAlpha">> & {
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

export function createGeometryItem(
  id: string,
  tool: "line" | "arrow",
  geometry: LineGeometry,
  style: AnnotationStyle,
): GeometrySceneItem;
export function createGeometryItem(
  id: string,
  tool: GeometrySceneItem["tool"],
  geometry: SceneGeometry,
  style: AnnotationStyle,
): GeometrySceneItem {
  return { id, kind: "shape", tool, geometry, style };
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

export function transientGeometryForGesture(
  samples: readonly PointerSample[],
  rect: SurfaceRect,
  viewport: DisplayViewport | undefined,
  tool: "line" | "arrow",
  style: AnnotationStyle,
): GeometrySceneItem | null {
  const points = normalizePointerPath(samples, rect, viewport);
  const start = points[0];
  const end = points.at(-1);
  if (!start || !end || !isGeometryDragValid(start, end)) return null;
  return createGeometryItem("transient-geometry", tool, { type: "line", start, end }, style);
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

function viewportPoint(point: CanonicalPoint, width: number, height: number, viewport?: DisplayViewport): CanonicalPoint {
  return viewport ? canonicalToViewport(point, viewport) : { x: point.x * width, y: point.y * height };
}

export type ArrowheadPath = readonly [CanonicalPoint, CanonicalPoint, CanonicalPoint];

export function arrowheadPath(start: CanonicalPoint, end: CanonicalPoint, strokeWidth: number): ArrowheadPath | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance === 0) return null;
  const unitX = dx / distance;
  const unitY = dy / distance;
  const length = Math.min(distance * 0.45, Math.max(8, strokeWidth * 4));
  const halfWidth = Math.max(4, strokeWidth * 2.25);
  const baseX = end.x - unitX * length;
  const baseY = end.y - unitY * length;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;
  return [
    end,
    { x: baseX + perpendicularX * halfWidth, y: baseY + perpendicularY * halfWidth },
    { x: baseX - perpendicularX * halfWidth, y: baseY - perpendicularY * halfWidth },
  ];
}

export function drawLineGeometry(
  context: CanvasRenderContext,
  item: GeometrySceneItem,
  width: number,
  height: number,
  viewport?: DisplayViewport,
) {
  if (item.geometry.type !== "line") return;
  const start = viewportPoint(item.geometry.start, width, height, viewport);
  const end = viewportPoint(item.geometry.end, width, height, viewport);
  context.strokeStyle = item.style.color;
  context.lineWidth = item.style.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = item.style.opacity;
  context.globalCompositeOperation = "source-over";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.globalAlpha = 1;
}

export function drawArrowGeometry(
  context: CanvasRenderContext,
  item: GeometrySceneItem,
  width: number,
  height: number,
  viewport?: DisplayViewport,
) {
  if (item.geometry.type !== "line") return;
  drawLineGeometry(context, item, width, height, viewport);
  const path = arrowheadPath(item.geometry.start, item.geometry.end, item.style.width);
  if (!path) return;
  const [tip, left, right] = path.map((point) => viewportPoint(point, width, height, viewport));
  context.save?.();
  context.fillStyle = item.style.color;
  context.globalAlpha = item.style.opacity;
  context.beginPath();
  context.moveTo(tip.x, tip.y);
  context.lineTo(left.x, left.y);
  context.lineTo(right.x, right.y);
  context.closePath?.();
  context.fill?.();
  context.globalAlpha = 1;
  context.restore?.();
}

export function drawScene(
  context: CanvasRenderContext,
  scene: readonly SceneItem[],
  width: number,
  height: number,
  viewport?: DisplayViewport,
  transientSceneItem?: SceneItem | null,
) {
  context.clearRect(0, 0, width, height);
  for (const item of transientSceneItem ? [...scene, transientSceneItem] : scene) {
    if (item.kind === "stroke") drawStroke(context, item, width, height, viewport);
    if (item.kind === "shape" && item.tool === "line") drawLineGeometry(context, item, width, height, viewport);
    if (item.kind === "shape" && item.tool === "arrow") drawArrowGeometry(context, item, width, height, viewport);
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
  const gestureToolRef = useRef<AnnotationTool>(activeTool);
  const nextItemIdRef = useRef(0);
  const [transientSceneItem, setTransientSceneItem] = useState<SceneItem | null>(null);

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
    if (mode !== "VisibleInteractive" || !["pen", "highlighter", "line", "arrow", "rectangle", "ellipse"].includes(activeTool)) cancelGesture();
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
    if (mode !== "VisibleInteractive" || event.button !== 0 || !["pen", "highlighter", "line", "arrow", "rectangle", "ellipse"].includes(activeTool)) return;
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
    const rect = event.currentTarget.getBoundingClientRect();
    if (gestureToolRef.current === "pen" || gestureToolRef.current === "highlighter") {
      setTransientSceneItem(transientSceneItemForGesture(samplesRef.current, rect, viewport, gestureToolRef.current, gestureStyleRef.current));
    } else if (gestureToolRef.current === "line" || gestureToolRef.current === "arrow") {
      setTransientSceneItem(transientGeometryForGesture(samplesRef.current, rect, viewport, gestureToolRef.current, gestureStyleRef.current));
    }
  };

  const endGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const canvas = event.currentTarget;
    const samples = samplesRef.current;
    const style = gestureStyleRef.current;
    const tool = gestureToolRef.current;
    const rect = canvas.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    const points = normalizePointerPath(samples, rect, viewport);
    cancelGesture();
    if (outside) return;
    if (tool === "line" || tool === "arrow") {
      const geometryItem = transientGeometryForGesture(samples, rect, viewport, tool, style);
      if (!geometryItem) return;
      nextItemIdRef.current += 1;
      onCommitSceneItem(createGeometryItem(`${tool}-${nextItemIdRef.current}`, tool, geometryItem.geometry as LineGeometry, style));
      return;
    }
    if (tool !== "pen" && tool !== "highlighter") return;
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

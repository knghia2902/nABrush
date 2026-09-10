import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type {
  AnnotationStyle,
  AnnotationTool,
  CanonicalPoint,
  DisplayOrientation,
  DisplayViewport,
  GeometrySceneItem,
  EllipseGeometry,
  LineGeometry,
  OverlayMode,
  RectangleGeometry,
  SceneItem,
  SceneGeometry,
  ShapeGeometry,
  ShapeTool,
  StrokePoint,
  StrokeSceneItem,
  StrokeTool,
  TextDraft,
  TextSceneItem,
} from "../types/overlay";
import { DEFAULT_PEN_STYLE } from "../types/overlay";
import {
  HIT_TEST_PADDING,
  TEXT_LINE_HEIGHT,
  createTextItem,
  findTopmostHit,
  isGeometryDragValid,
  normalizeShapeBounds,
  textBounds,
  textDraftTransition,
} from "../state/annotation";

export type PointerSample = { clientX: number; clientY: number };
export type SurfaceRect = { left: number; top: number; width: number; height: number };

function isShapeTool(tool: AnnotationTool): tool is ShapeTool {
  return tool === "line" || tool === "arrow" || tool === "rectangle" || tool === "ellipse";
}

function isStrokeTool(tool: AnnotationTool): tool is StrokeTool {
  return tool === "pen" || tool === "highlighter";
}

type CanvasRenderContext = Pick<CanvasRenderingContext2D, "clearRect" | "beginPath" | "moveTo" | "lineTo" | "stroke"> &
  Partial<Pick<CanvasRenderingContext2D, "closePath" | "fill" | "rect" | "ellipse" | "fillText" | "measureText" | "save" | "restore" | "strokeStyle" | "fillStyle" | "lineWidth" | "lineCap" | "lineJoin" | "globalAlpha" | "font" | "textBaseline">> & {
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

export function createShapeItem(
  id: string,
  tool: "rectangle" | "ellipse",
  geometry: RectangleGeometry | EllipseGeometry,
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
  tool: ShapeTool,
  style: AnnotationStyle,
): GeometrySceneItem | null {
  const points = normalizePointerPath(samples, rect, viewport);
  const start = points[0];
  const end = points.at(-1);
  if (!start || !end || !isGeometryDragValid(start, end)) return null;
  if (tool === "line" || tool === "arrow") {
    return createGeometryItem("transient-geometry", tool, { type: "line", start, end }, style);
  }
  const bounds = normalizeShapeBounds(start, end);
  if (tool === "rectangle") {
    return createShapeItem("transient-geometry", tool, { type: "rectangle", ...bounds }, style);
  }
  return createShapeItem("transient-geometry", tool, {
    type: "ellipse",
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    radiusX: bounds.width / 2,
    radiusY: bounds.height / 2,
  }, style);
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

function drawShapePath(
  context: CanvasRenderContext,
  geometry: ShapeGeometry,
  width: number,
  height: number,
  viewport?: DisplayViewport,
) {
  if (geometry.type === "rectangle") {
    const topLeft = viewportPoint({ x: geometry.x, y: geometry.y }, width, height, viewport);
    if (!viewport || viewport.orientation === "degrees0") {
      const scaleX = viewport ? 1 : width;
      const scaleY = viewport ? 1 : height;
      context.rect?.(topLeft.x, topLeft.y, geometry.width * scaleX, geometry.height * scaleY);
      return;
    }
    const topRight = viewportPoint({ x: geometry.x + geometry.width, y: geometry.y }, width, height, viewport);
    const bottomRight = viewportPoint({ x: geometry.x + geometry.width, y: geometry.y + geometry.height }, width, height, viewport);
    const bottomLeft = viewportPoint({ x: geometry.x, y: geometry.y + geometry.height }, width, height, viewport);
    context.moveTo(topLeft.x, topLeft.y);
    context.lineTo(topRight.x, topRight.y);
    context.lineTo(bottomRight.x, bottomRight.y);
    context.lineTo(bottomLeft.x, bottomLeft.y);
    context.closePath?.();
    return;
  }
  const center = viewportPoint(geometry.center, width, height, viewport);
  const scaleX = viewport ? 1 : width;
  const scaleY = viewport ? 1 : height;
  const rotated = viewport?.orientation === "degrees90" || viewport?.orientation === "degrees270";
  const radiusX = geometry.radiusX * (rotated ? scaleY : scaleX);
  const radiusY = geometry.radiusY * (rotated ? scaleX : scaleY);
  const rotation = viewport?.orientation === "degrees90" ? Math.PI / 2
    : viewport?.orientation === "degrees270" ? -Math.PI / 2 : 0;
  context.ellipse?.(center.x, center.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
}

export function drawShapeGeometry(
  context: CanvasRenderContext,
  item: GeometrySceneItem,
  width: number,
  height: number,
  viewport?: DisplayViewport,
) {
  if ((item.tool !== "rectangle" && item.tool !== "ellipse") || (item.geometry.type !== item.tool)) return;
  context.save?.();
  context.beginPath();
  drawShapePath(context, item.geometry as ShapeGeometry, width, height, viewport);
  if (item.style.fill === "solid") {
    context.fillStyle = item.style.fillColor;
    context.globalAlpha = item.style.fillOpacity;
    context.fill?.();
  }
  context.strokeStyle = item.style.color;
  context.lineWidth = item.style.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = item.style.opacity;
  context.stroke();
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.restore?.();
}

function textFont(style: AnnotationStyle): string {
  return `${style.textSize}px system-ui, sans-serif`;
}

function canvasTextMetric(context: CanvasRenderContext, line: string, style: AnnotationStyle): number {
  context.font = textFont(style);
  return context.measureText?.(line)?.width ?? line.length * style.textSize * 0.6;
}

export function drawTextItem(
  context: CanvasRenderContext,
  item: TextSceneItem,
  width: number,
  height: number,
  viewport?: DisplayViewport,
) {
  const anchor = viewportPoint(item.anchor, width, height, viewport);
  context.save?.();
  context.font = textFont(item.style);
  context.textBaseline = "top";
  context.fillStyle = item.style.color;
  context.globalAlpha = item.style.opacity;
  item.text.split("\n").forEach((line, index) => {
    context.fillText?.(line, anchor.x, anchor.y + index * item.style.textSize * TEXT_LINE_HEIGHT);
  });
  context.globalAlpha = 1;
  context.restore?.();
}

function drawHitHighlight(
  context: CanvasRenderContext,
  item: SceneItem,
  width: number,
  height: number,
  viewport: DisplayViewport | undefined,
) {
  context.save?.();
  context.strokeStyle = "#38bdf8";
  context.lineWidth = 2;
  context.globalAlpha = 0.9;
  context.globalCompositeOperation = "source-over";
  context.beginPath();
  if (item.kind === "stroke") {
    const first = item.points[0];
    if (first) {
      const point = viewportPoint(first, width, height, viewport);
      context.moveTo(point.x, point.y);
      item.points.slice(1).forEach((value) => {
        const next = viewportPoint(value, width, height, viewport);
        context.lineTo(next.x, next.y);
      });
      context.stroke();
    }
  } else if (item.kind === "shape" && item.geometry.type === "line") {
    const start = viewportPoint(item.geometry.start, width, height, viewport);
    const end = viewportPoint(item.geometry.end, width, height, viewport);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  } else if (item.kind === "shape" && (item.geometry.type === "rectangle" || item.geometry.type === "ellipse")) {
    drawShapePath(context, item.geometry, width, height, viewport);
    context.stroke();
  } else if (item.kind === "text") {
    const metrics = (line: string, style: AnnotationStyle) => canvasTextMetric(context, line, style);
    const bounds = textBounds(item, metrics);
    const topLeft = viewportPoint({ x: bounds.x - HIT_TEST_PADDING, y: bounds.y - HIT_TEST_PADDING }, width, height, viewport);
    const bottomRight = viewportPoint({ x: bounds.x + bounds.width + HIT_TEST_PADDING, y: bounds.y + bounds.height + HIT_TEST_PADDING }, width, height, viewport);
    context.rect?.(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    context.stroke();
  }
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
  hoveredItemId?: string | null,
) {
  context.clearRect(0, 0, width, height);
  for (const item of transientSceneItem ? [...scene, transientSceneItem] : scene) {
    if (item.kind === "stroke") drawStroke(context, item, width, height, viewport);
    if (item.kind === "shape" && item.tool === "line") drawLineGeometry(context, item, width, height, viewport);
    if (item.kind === "shape" && item.tool === "arrow") drawArrowGeometry(context, item, width, height, viewport);
    if (item.kind === "shape" && (item.tool === "rectangle" || item.tool === "ellipse")) drawShapeGeometry(context, item, width, height, viewport);
    if (item.kind === "text") drawTextItem(context, item, width, height, viewport);
  }
  if (hoveredItemId) {
    const hovered = scene.find((item) => item.id === hoveredItemId);
    if (hovered) drawHitHighlight(context, hovered, width, height, viewport);
  }
}

type Props = {
  mode: OverlayMode;
  scene: readonly SceneItem[];
  viewport: DisplayViewport;
  activeTool: AnnotationTool;
  toolStyle: AnnotationStyle;
  textDraft: TextDraft | null;
  onPlaceTextDraft: (anchor: CanonicalPoint, style: AnnotationStyle) => void;
  onUpdateTextDraft: (value: string) => void;
  onCancelTextDraft: () => void;
  onCommitSceneItem: (item: SceneItem) => void;
  onEraseSceneItem: (id: string) => void;
};

export function OverlaySurface({
  mode,
  scene,
  viewport,
  activeTool,
  toolStyle,
  textDraft,
  onPlaceTextDraft,
  onUpdateTextDraft,
  onCancelTextDraft,
  onCommitSceneItem,
  onEraseSceneItem,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const gestureStyleRef = useRef<AnnotationStyle>(toolStyle);
  const gestureToolRef = useRef<AnnotationTool>(activeTool);
  const nextItemIdRef = useRef(0);
  const [transientSceneItem, setTransientSceneItem] = useState<SceneItem | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const measureTextForHitTest = useCallback((line: string, style: AnnotationStyle): number => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return line.length * style.textSize * 0.6;
    context.save();
    context.font = textFont(style);
    const width = context.measureText(line).width;
    context.restore();
    return width;
  }, []);

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
    drawScene(context, scene, size.width, size.height, viewport, transientSceneItem, hoveredItemId);
  }, [hoveredItemId, scene, transientSceneItem, viewport]);

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
    setHoveredItemId(null);
  }, []);

  useEffect(() => {
    if (mode !== "VisibleInteractive" || (!isStrokeTool(activeTool) && !isShapeTool(activeTool))) cancelGesture();
    if (mode !== "VisibleInteractive" || activeTool !== "text") onCancelTextDraft();
  }, [activeTool, cancelGesture, mode, onCancelTextDraft]);

  useEffect(() => {
    if (textDraft) textEditorRef.current?.focus();
  }, [textDraft]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelGesture();
    };
    const handleBlur = () => {
      cancelGesture();
      onCancelTextDraft();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [cancelGesture, onCancelTextDraft]);

  const eventPoint = (event: ReactPointerEvent<HTMLCanvasElement>): CanonicalPoint | null => {
    const point = normalizePointerPath([event], event.currentTarget.getBoundingClientRect(), viewport)[0];
    return point ?? null;
  };

  const beginGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "VisibleInteractive" || event.button !== 0) return;
    if (activeTool === "text") {
      if (!textDraft) {
        const point = eventPoint(event);
        if (point) onPlaceTextDraft(point, { ...toolStyle });
      }
      return;
    }
    if (activeTool === "eraser") {
      const point = eventPoint(event);
      if (!point) return;
      const targetId = findTopmostHit(scene, point, { hitPadding: HIT_TEST_PADDING, measureText: measureTextForHitTest });
      setHoveredItemId(targetId);
      if (targetId) onEraseSceneItem(targetId);
      return;
    }
    if (!isStrokeTool(activeTool) && !isShapeTool(activeTool)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    samplesRef.current = [{ clientX: event.clientX, clientY: event.clientY }];
    gestureStyleRef.current = { ...toolStyle };
    gestureToolRef.current = activeTool;
    setTransientSceneItem(null);
  };

  const moveGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "VisibleInteractive") return;
    if (activeTool === "eraser") {
      const point = eventPoint(event);
      setHoveredItemId(point ? findTopmostHit(scene, point, { hitPadding: HIT_TEST_PADDING, measureText: measureTextForHitTest }) : null);
      return;
    }
    if (pointerIdRef.current !== event.pointerId) return;
    samplesRef.current.push({ clientX: event.clientX, clientY: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    if (gestureToolRef.current === "pen" || gestureToolRef.current === "highlighter") {
      setTransientSceneItem(transientSceneItemForGesture(samplesRef.current, rect, viewport, gestureToolRef.current, gestureStyleRef.current));
    } else if (isShapeTool(gestureToolRef.current)) {
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
    if (isShapeTool(tool)) {
      const geometryItem = transientGeometryForGesture(samples, rect, viewport, tool, style);
      if (!geometryItem) return;
      nextItemIdRef.current += 1;
      const id = `${tool}-${nextItemIdRef.current}`;
      if (tool === "line" || tool === "arrow") {
        onCommitSceneItem(createGeometryItem(id, tool, geometryItem.geometry as LineGeometry, style));
      } else if (tool === "rectangle" || tool === "ellipse") {
        onCommitSceneItem(createShapeItem(id, tool, geometryItem.geometry as RectangleGeometry | EllipseGeometry, style));
      }
      return;
    }
    if (tool !== "pen" && tool !== "highlighter") return;
    if (points.length < 2) return;
    nextItemIdRef.current += 1;
    onCommitSceneItem(createStroke(`stroke-${nextItemIdRef.current}`, points, style, tool));
  };

  const handleTextKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!textDraft) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelTextDraft();
      return;
    }
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing) return;
    if (event.shiftKey) {
      event.preventDefault();
      const next = textDraftTransition(textDraft, { type: "insert-newline" });
      if (next) onUpdateTextDraft(next.value);
      return;
    }
    const next = textDraftTransition(textDraft, { type: "commit", isComposing: false });
    if (next !== null) return;
    const item = createTextItem(`text-${nextItemIdRef.current + 1}`, textDraft);
    nextItemIdRef.current += 1;
    onCancelTextDraft();
    onCommitSceneItem(item);
  };

  const draftPosition = textDraft ? viewportPoint(textDraft.anchor, viewportSize(viewport).width, viewportSize(viewport).height, viewport) : null;

  return (
    <>
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
        onPointerLeave={() => { if (activeTool === "eraser") setHoveredItemId(null); }}
      />
      {textDraft && draftPosition && mode === "VisibleInteractive" ? (
        <textarea
          ref={textEditorRef}
          aria-label="Text draft"
          className="text-draft-editor"
          data-text-draft="true"
          data-scene-excluded="true"
          value={textDraft.value}
          onChange={(event) => onUpdateTextDraft(event.target.value)}
          onKeyDown={handleTextKeyDown}
          onBlur={onCancelTextDraft}
          rows={1}
          style={{ left: draftPosition.x, top: draftPosition.y, color: textDraft.style.color, fontSize: textDraft.style.textSize }}
        />
      ) : null}
    </>
  );
}

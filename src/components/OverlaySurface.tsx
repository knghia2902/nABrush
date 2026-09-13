import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type {
  CompositionEvent as ReactCompositionEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type {
  AnnotationStyle,
  AnnotationLifecycleSnapshot,
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
import { DEFAULT_PEN_STYLE, isValidVanishingDuration } from "../types/overlay";
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
export type GesturePhase = "idle" | "pressed" | "previewing";
export type GestureTerminalAction = "ignore" | "cancel" | "commit";
export const VANISHING_FADE_WINDOW_MS = 1_000;
export const MAX_STROKE_POINTS = 4_096;
export const MAX_TEXT_UTF8_BYTES = 4_096;
export const MAX_TEXT_LINES = 256;

export function limitStrokePointCount(points: readonly StrokePoint[]): { points: StrokePoint[]; simplified: boolean } {
  if (points.length <= MAX_STROKE_POINTS) return { points: [...points], simplified: false };
  const lastIndex = points.length - 1;
  const limited = Array.from({ length: MAX_STROKE_POINTS }, (_, index) => (
    points[Math.round(index * lastIndex / (MAX_STROKE_POINTS - 1))]
  ));
  return { points: limited, simplified: true };
}

export function textSceneItemLimitError(text: string): string | null {
  const bytes = new TextEncoder().encode(text).length;
  const lines = text.split("\n").length;
  const violations: string[] = [];
  if (bytes > MAX_TEXT_UTF8_BYTES) violations.push(`${bytes} UTF-8 bytes (maximum ${MAX_TEXT_UTF8_BYTES})`);
  if (lines > MAX_TEXT_LINES) violations.push(`${lines} lines (maximum ${MAX_TEXT_LINES})`);
  return violations.length > 0 ? `Text is over the native limit: ${violations.join(" and ")}. Shorten it before saving; the draft is still here.` : null;
}

function sceneItemLimitError(item: SceneItem): string | null {
  if (item.kind === "text") return textSceneItemLimitError(item.text);
  if (item.kind === "stroke" && (item.points.length === 0 || item.points.length > MAX_STROKE_POINTS)) {
    return `This stroke has ${item.points.length} points; the native maximum is ${MAX_STROKE_POINTS}. The gesture is retained on screen.`;
  }
  return null;
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "unknown native error";
}

export function gesturePhaseFor(pointerId: number | null, transientSceneItem: SceneItem | null): GesturePhase {
  if (pointerId === null) return "idle";
  return transientSceneItem ? "previewing" : "pressed";
}

export function gestureTerminalAction(
  activePointerId: number | null,
  eventPointerId: number,
  outside: boolean,
): GestureTerminalAction {
  if (activePointerId === null || activePointerId !== eventPointerId) return "ignore";
  return outside ? "cancel" : "commit";
}

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
  lifecycle: AnnotationLifecycleSnapshot = { mode: "persistent" },
): StrokeSceneItem {
  return { id, kind: "stroke", tool, points, style, lifecycle };
}

export function createGeometryItem(
  id: string,
  tool: "line" | "arrow",
  geometry: LineGeometry,
  style: AnnotationStyle,
  lifecycle?: AnnotationLifecycleSnapshot,
): GeometrySceneItem;
export function createGeometryItem(
  id: string,
  tool: GeometrySceneItem["tool"],
  geometry: SceneGeometry,
  style: AnnotationStyle,
  lifecycle?: AnnotationLifecycleSnapshot,
): GeometrySceneItem {
  return { id, kind: "shape", tool, geometry, style, lifecycle: lifecycle ?? { mode: "persistent" } };
}

export function createShapeItem(
  id: string,
  tool: "rectangle" | "ellipse",
  geometry: RectangleGeometry | EllipseGeometry,
  style: AnnotationStyle,
  lifecycle: AnnotationLifecycleSnapshot = { mode: "persistent" },
): GeometrySceneItem {
  return { id, kind: "shape", tool, geometry, style, lifecycle };
}

export function transientSceneItemForGesture(
  samples: readonly PointerSample[],
  rect: SurfaceRect,
  viewport: DisplayViewport | undefined,
  tool: StrokeTool,
  style: AnnotationStyle,
  lifecycle: AnnotationLifecycleSnapshot = { mode: "persistent" },
): StrokeSceneItem | null {
  const points = normalizePointerPath(samples, rect, viewport);
  return points.length < 2 ? null : createStroke("transient-stroke", points, style, tool, lifecycle);
}

export function transientGeometryForGesture(
  samples: readonly PointerSample[],
  rect: SurfaceRect,
  viewport: DisplayViewport | undefined,
  tool: ShapeTool,
  style: AnnotationStyle,
  lifecycle: AnnotationLifecycleSnapshot = { mode: "persistent" },
): GeometrySceneItem | null {
  const points = normalizePointerPath(samples, rect, viewport);
  const start = points[0];
  const end = points.at(-1);
  if (!start || !end || !isGeometryDragValid(start, end)) return null;
  if (tool === "line" || tool === "arrow") {
    return createGeometryItem("transient-geometry", tool, { type: "line", start, end }, style, lifecycle);
  }
  const bounds = normalizeShapeBounds(start, end);
  if (tool === "rectangle") {
    return createShapeItem("transient-geometry", tool, { type: "rectangle", ...bounds }, style, lifecycle);
  }
  return createShapeItem("transient-geometry", tool, {
    type: "ellipse",
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    radiusX: bounds.width / 2,
    radiusY: bounds.height / 2,
  }, style, lifecycle);
}

export function sceneItemExpiryDeadlineMs(item: SceneItem): number | null {
  const lifecycle = item.lifecycle;
  if (!lifecycle || lifecycle.mode !== "vanishing") return null;
  if (!isValidVanishingDuration(lifecycle.durationSeconds)
    || !Number.isFinite(lifecycle.committedAtMs)
    || lifecycle.committedAtMs === undefined) return null;
  return lifecycle.committedAtMs + lifecycle.durationSeconds * 1_000;
}

/** Returns the lifecycle multiplier (not the item's style opacity) at a deterministic clock time. */
export function sceneItemOpacityMultiplier(item: SceneItem, nowMs: number): number {
  const deadline = sceneItemExpiryDeadlineMs(item);
  if (deadline === null || !Number.isFinite(nowMs)) return 1;
  if (nowMs >= deadline) return 0;
  const fadeStart = deadline - VANISHING_FADE_WINDOW_MS;
  if (nowMs <= fadeStart) return 1;
  return Math.max(0, (deadline - nowMs) / VANISHING_FADE_WINDOW_MS);
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
  const length = Math.min(distance * 0.6, Math.max(8, strokeWidth * 4));
  const halfWidth = Math.min(Math.max(4, strokeWidth * 2.25), length * 0.55);
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
  lineCap: CanvasLineCap = "round",
) {
  if (item.geometry.type !== "line") return;
  const start = viewportPoint(item.geometry.start, width, height, viewport);
  const end = viewportPoint(item.geometry.end, width, height, viewport);
  context.strokeStyle = item.style.color;
  context.lineWidth = item.style.width;
  context.lineCap = lineCap;
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
  const path = arrowheadPath(item.geometry.start, item.geometry.end, item.style.width);
  if (!path) {
    drawLineGeometry(context, item, width, height, viewport);
    return;
  }
  const [tip, left, right] = path;
  const shaftEnd = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  const shaft = { ...item, geometry: { ...item.geometry, end: shaftEnd } };
  drawLineGeometry(context, shaft, width, height, viewport, "butt");
  const [viewportTip, viewportLeft, viewportRight] = [tip, left, right]
    .map((point) => viewportPoint(point, width, height, viewport));
  context.save?.();
  context.fillStyle = item.style.color;
  context.globalAlpha = item.style.opacity;
  context.beginPath();
  context.moveTo(viewportTip.x, viewportTip.y);
  context.lineTo(viewportLeft.x, viewportLeft.y);
  context.lineTo(viewportRight.x, viewportRight.y);
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
  return context.measureText?.(line)?.width ?? Array.from(line).length * style.textSize * 0.6;
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
  nowMs = Date.now(),
) {
  context.clearRect(0, 0, width, height);
  const renderedScene = transientSceneItem
    ? scene.map((item) => item.id === transientSceneItem.id ? transientSceneItem : item)
    : scene;
  const items = transientSceneItem && !scene.some((item) => item.id === transientSceneItem.id)
    ? [...renderedScene, transientSceneItem]
    : renderedScene;
  const visibleItems: SceneItem[] = [];
  for (const item of items) {
    const lifecycleOpacity = sceneItemOpacityMultiplier(item, nowMs);
    if (lifecycleOpacity <= 0) continue;
    const renderedItem = lifecycleOpacity === 1
      ? item
      : {
        ...item,
        style: {
          ...item.style,
          opacity: item.style.opacity * lifecycleOpacity,
          fillOpacity: item.style.fillOpacity * lifecycleOpacity,
        },
      } as SceneItem;
    visibleItems.push(renderedItem);
  }
  for (const item of visibleItems) {
    if (item.kind === "stroke") drawStroke(context, item, width, height, viewport);
    if (item.kind === "shape" && item.tool === "line") drawLineGeometry(context, item, width, height, viewport);
    if (item.kind === "shape" && item.tool === "arrow") drawArrowGeometry(context, item, width, height, viewport);
    if (item.kind === "shape" && (item.tool === "rectangle" || item.tool === "ellipse")) drawShapeGeometry(context, item, width, height, viewport);
    if (item.kind === "text") drawTextItem(context, item, width, height, viewport);
  }
  if (hoveredItemId) {
    const hovered = visibleItems.find((item) => item.id === hoveredItemId);
    if (hovered) drawHitHighlight(context, hovered, width, height, viewport);
  }
}

type Props = {
  mode: OverlayMode;
  scene: readonly SceneItem[];
  viewport: DisplayViewport;
  activeTool: AnnotationTool;
  toolStyle: AnnotationStyle;
  lifecycleSnapshot: AnnotationLifecycleSnapshot;
  textDraft: TextDraft | null;
  onPlaceTextDraft: (anchor: CanonicalPoint, style: AnnotationStyle, lifecycle: AnnotationLifecycleSnapshot) => void;
  onUpdateTextDraft: (value: string) => void;
  onCancelTextDraft: () => void;
  onCommitSceneItem: (item: SceneItem) => void | Promise<void>;
  onMoveTextItem: (id: string, anchor: CanonicalPoint) => void;
  onEraseSceneItem: (id: string) => void;
};

type CanvasGestureEvent = {
  button: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: HTMLCanvasElement;
  canCapture: boolean;
};

const FALLBACK_POINTER_ID = 1;

export function OverlaySurface({
  mode,
  scene,
  viewport,
  activeTool,
  toolStyle,
  lifecycleSnapshot,
  textDraft,
  onPlaceTextDraft,
  onUpdateTextDraft,
  onCancelTextDraft,
  onCommitSceneItem,
  onMoveTextItem,
  onEraseSceneItem,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerSequenceRef = useRef(false);
  const suppressMouseUpRef = useRef(false);
  const suppressTextClickRef = useRef(false);
  const suppressNextTextDraftRef = useRef(false);
  const textDragRef = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const textShiftRef = useRef(false);
  const textDraftCommitHandledRef = useRef(false);
  const textCompositionRef = useRef(false);
  const deferredOutsideTextCommitRef = useRef(false);
  const compositionCommitCancelRef = useRef<(() => void) | null>(null);
  const textDraftRef = useRef(textDraft);
  const latestTextDraftValueRef = useRef(textDraft?.value ?? "");
  const sceneCommitInFlightRef = useRef(false);
  const pendingSceneCommitRef = useRef<SceneItem | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const gestureStyleRef = useRef<AnnotationStyle>(toolStyle);
  const gestureLifecycleRef = useRef<AnnotationLifecycleSnapshot>(lifecycleSnapshot);
  const gestureToolRef = useRef<AnnotationTool>(activeTool);
  const nextItemIdRef = useRef(0);
  const [transientSceneItem, setTransientSceneItem] = useState<SceneItem | null>(null);
  const [gesturePhase, setGesturePhase] = useState<GesturePhase>("idle");
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [pendingSceneItem, setPendingSceneItem] = useState<SceneItem | null>(null);
  const [commitSaving, setCommitSaving] = useState(false);
  const [commitFeedback, setCommitFeedback] = useState<{ kind: "error" | "notice"; message: string } | null>(null);
  textDraftRef.current = textDraft;
  latestTextDraftValueRef.current = textDraft?.value ?? "";

  const measureTextForHitTest = useCallback((line: string, style: AnnotationStyle): number => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return Array.from(line).length * style.textSize * 0.6;
    context.save();
    context.font = textFont(style);
    const width = context.measureText(line).width;
    context.restore();
    return width;
  }, []);

  const redraw = useCallback((nowMs = Date.now()) => {
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
    drawScene(context, scene, size.width, size.height, viewport, transientSceneItem, hoveredItemId, nowMs);
  }, [hoveredItemId, scene, transientSceneItem, viewport]);

  useEffect(() => {
    redraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleResize = () => redraw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);
    observer?.observe(canvas);
    window.addEventListener("resize", handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [redraw]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<number>("scene-lifecycle-frame", ({ payload }) => redraw(payload))
      .then((stopListening) => {
        if (disposed) stopListening();
        else unlisten = stopListening;
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [redraw]);

  const cancelGesture = useCallback(() => {
    if (pendingSceneCommitRef.current && pendingSceneCommitRef.current.kind !== "text") return;
    const canvas = canvasRef.current;
    const pointerId = pointerIdRef.current;
    pointerIdRef.current = null;
    textDragRef.current = null;
    samplesRef.current = [];
    setTransientSceneItem(null);
    setGesturePhase("idle");
    setHoveredItemId(null);
    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  }, []);

  const cancelTextDraft = useCallback(() => {
    compositionCommitCancelRef.current?.();
    compositionCommitCancelRef.current = null;
    textCompositionRef.current = false;
    deferredOutsideTextCommitRef.current = false;
    textShiftRef.current = false;
    onCancelTextDraft();
  }, [onCancelTextDraft]);

  const finishLocalCommit = useCallback((item: SceneItem) => {
    if (item.kind === "text") {
      cancelTextDraft();
      return;
    }
    cancelGesture();
  }, [cancelGesture, cancelTextDraft]);

  const submitSceneItem = useCallback((item: SceneItem, notice?: string) => {
    if (sceneCommitInFlightRef.current) return;
    const limitError = sceneItemLimitError(item);
    if (limitError) {
      setCommitFeedback({ kind: "error", message: limitError });
      return;
    }
    sceneCommitInFlightRef.current = true;
    pendingSceneCommitRef.current = item;
    setPendingSceneItem(item);
    setCommitSaving(true);
    setCommitFeedback(null);
    void Promise.resolve()
      .then(() => onCommitSceneItem(item))
      .then(() => {
        sceneCommitInFlightRef.current = false;
        pendingSceneCommitRef.current = null;
        setPendingSceneItem(null);
        setCommitSaving(false);
        finishLocalCommit(item);
        setCommitFeedback(notice ? { kind: "notice", message: notice } : null);
      })
      .catch((error: unknown) => {
        sceneCommitInFlightRef.current = false;
        setCommitSaving(false);
        if (item.kind === "text") textDraftCommitHandledRef.current = true;
        setCommitFeedback({
          kind: "error",
          message: `Could not save annotation: ${errorDetail(error)}. It remains on screen. Retry saving or discard it explicitly.${notice ? ` ${notice}` : ""}`,
        });
      });
  }, [finishLocalCommit, onCommitSceneItem]);

  const retryPendingSceneItem = () => {
    if (pendingSceneItem) submitSceneItem(pendingSceneItem);
  };

  const discardPendingSceneItem = () => {
    const item = pendingSceneCommitRef.current;
    if (!item || sceneCommitInFlightRef.current) return;
    pendingSceneCommitRef.current = null;
    setPendingSceneItem(null);
    setCommitFeedback(null);
    if (item.kind === "text") cancelTextDraft();
    else cancelGesture();
  };

  useEffect(() => {
    cancelGesture();
    if ((mode !== "VisibleInteractive" || activeTool !== "text")
      && !textDraftCommitHandledRef.current
      && !textCompositionRef.current
      && !deferredOutsideTextCommitRef.current
      && pendingSceneCommitRef.current?.kind !== "text") cancelTextDraft();
  }, [activeTool, cancelGesture, mode, cancelTextDraft]);

  useEffect(() => {
    if (textDraft) textEditorRef.current?.focus();
  }, [textDraft]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelGesture();
    };
    const handleBlur = () => {
      cancelGesture();
      textShiftRef.current = false;
      if (textCompositionRef.current || deferredOutsideTextCommitRef.current) return;
      if (!textDraftCommitHandledRef.current && pendingSceneCommitRef.current?.kind !== "text") {
        cancelTextDraft();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [cancelGesture, cancelTextDraft]);

  const eventPoint = (event: CanvasGestureEvent): CanonicalPoint | null => {
    const point = normalizePointerPath([event], event.currentTarget.getBoundingClientRect(), viewport)[0];
    return point ?? null;
  };

  const beginGesture = (event: CanvasGestureEvent) => {
    if (pendingSceneCommitRef.current) return;
    if (mode !== "VisibleInteractive" || event.button !== 0) return;
    if (activeTool === "text") {
      if (textDraft || pointerIdRef.current !== null) return;
      if (suppressNextTextDraftRef.current) {
        suppressNextTextDraftRef.current = false;
        return;
      }
      // A drag can finish without a synthesized click on some native input
      // paths. Its stale click-suppression flag must not block the next gesture.
      suppressTextClickRef.current = false;
      const point = eventPoint(event);
      if (!point) return;
      const targetId = findTopmostHit(scene, point, { hitPadding: HIT_TEST_PADDING, measureText: measureTextForHitTest });
      const target = targetId ? scene.find((item): item is TextSceneItem => item.id === targetId && item.kind === "text") : undefined;
      if (target) {
        if (event.canCapture) event.currentTarget.setPointerCapture(event.pointerId);
        pointerIdRef.current = event.pointerId;
        textDragRef.current = {
          id: target.id,
          pointerId: event.pointerId,
          offsetX: point.x - target.anchor.x,
          offsetY: point.y - target.anchor.y,
        };
        setTransientSceneItem({ ...target, anchor: { ...target.anchor } });
        setGesturePhase("pressed");
        suppressTextClickRef.current = true;
        return;
      }
      suppressTextClickRef.current = false;
      if (!textDraft) {
        textDraftCommitHandledRef.current = false;
        onPlaceTextDraft(point, { ...toolStyle }, lifecycleSnapshot);
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
    if (pointerIdRef.current !== null) return;
    if (event.canCapture) event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    samplesRef.current = [{ clientX: event.clientX, clientY: event.clientY }];
    gestureStyleRef.current = { ...toolStyle };
    gestureLifecycleRef.current = lifecycleSnapshot;
    gestureToolRef.current = activeTool;
    setTransientSceneItem(null);
    setGesturePhase("pressed");
  };

  const moveGesture = (event: CanvasGestureEvent) => {
    if (mode !== "VisibleInteractive") return;
    if (activeTool === "eraser") {
      const point = eventPoint(event);
      setHoveredItemId(point ? findTopmostHit(scene, point, { hitPadding: HIT_TEST_PADDING, measureText: measureTextForHitTest }) : null);
      return;
    }
    const textDrag = textDragRef.current;
    if (textDrag && pointerIdRef.current === event.pointerId) {
      const point = eventPoint(event);
      const target = scene.find((item): item is TextSceneItem => item.id === textDrag.id && item.kind === "text");
      if (!point || !target) return;
      setTransientSceneItem({
        ...target,
        anchor: {
          x: point.x - textDrag.offsetX,
          y: point.y - textDrag.offsetY,
        },
      });
      setGesturePhase("previewing");
      return;
    }
    if (pointerIdRef.current !== event.pointerId) return;
    samplesRef.current.push({ clientX: event.clientX, clientY: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    if (gestureToolRef.current === "pen" || gestureToolRef.current === "highlighter") {
      const transient = transientSceneItemForGesture(samplesRef.current, rect, viewport, gestureToolRef.current, gestureStyleRef.current, gestureLifecycleRef.current);
      setTransientSceneItem(transient);
      setGesturePhase(gesturePhaseFor(pointerIdRef.current, transient));
    } else if (isShapeTool(gestureToolRef.current)) {
      const transient = transientGeometryForGesture(samplesRef.current, rect, viewport, gestureToolRef.current, gestureStyleRef.current, gestureLifecycleRef.current);
      setTransientSceneItem(transient);
      setGesturePhase(gesturePhaseFor(pointerIdRef.current, transient));
    }
  };

  const endGesture = (event: CanvasGestureEvent) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    const terminalAction = gestureTerminalAction(pointerIdRef.current, event.pointerId, outside);
    if (terminalAction === "ignore") return;
    if (terminalAction === "cancel") {
      if (textDragRef.current?.pointerId === event.pointerId) suppressTextClickRef.current = true;
      cancelGesture();
      return;
    }
    const textDrag = textDragRef.current;
    if (textDrag?.pointerId === event.pointerId) {
      const point = eventPoint(event);
      const target = scene.find((item): item is TextSceneItem => item.id === textDrag.id && item.kind === "text");
      if (point && target) {
        const anchor = {
          x: point.x - textDrag.offsetX,
          y: point.y - textDrag.offsetY,
        };
        cancelGesture();
        onMoveTextItem(textDrag.id, anchor);
      } else {
        cancelGesture();
      }
      return;
    }
    samplesRef.current = [...samplesRef.current, { clientX: event.clientX, clientY: event.clientY }];
    const samples = samplesRef.current;
    const style = gestureStyleRef.current;
    const tool = gestureToolRef.current;
    const points = normalizePointerPath(samples, rect, viewport);
    const retainGestureUntilCommitted = (item: SceneItem) => {
      const activeCanvas = canvasRef.current;
      const activePointerId = pointerIdRef.current;
      pointerIdRef.current = null;
      textDragRef.current = null;
      samplesRef.current = [];
      if (activeCanvas && activePointerId !== null && activeCanvas.hasPointerCapture(activePointerId)) {
        activeCanvas.releasePointerCapture(activePointerId);
      }
      setTransientSceneItem(item);
      setGesturePhase("previewing");
    };
    if (isShapeTool(tool)) {
      const lifecycle = gestureLifecycleRef.current;
      const geometryItem = transientGeometryForGesture(samples, rect, viewport, tool, style, lifecycle);
      if (!geometryItem) {
        cancelGesture();
        return;
      }
      nextItemIdRef.current += 1;
      const id = `${tool}-${nextItemIdRef.current}`;
      if (tool === "line" || tool === "arrow") {
        const item = createGeometryItem(id, tool, geometryItem.geometry as LineGeometry, style, lifecycle);
        retainGestureUntilCommitted(item);
        submitSceneItem(item);
      } else if (tool === "rectangle" || tool === "ellipse") {
        const item = createShapeItem(id, tool, geometryItem.geometry as RectangleGeometry | EllipseGeometry, style, lifecycle);
        retainGestureUntilCommitted(item);
        submitSceneItem(item);
      }
      return;
    }
    if (tool !== "pen" && tool !== "highlighter") {
      cancelGesture();
      return;
    }
    if (points.length < 2) {
      cancelGesture();
      return;
    }
    nextItemIdRef.current += 1;
    const limitedPath = limitStrokePointCount(points);
    const item = createStroke(`stroke-${nextItemIdRef.current}`, limitedPath.points, style, tool, gestureLifecycleRef.current);
    retainGestureUntilCommitted(item);
    const notice = limitedPath.simplified
      ? `This long stroke was simplified from ${points.length} to ${MAX_STROKE_POINTS} points to meet the native limit; both endpoints are preserved.`
      : undefined;
    submitSceneItem(item, notice);
  };

  const toCanvasGestureEvent = (
    event: Pick<ReactPointerEvent<HTMLCanvasElement>, "button" | "clientX" | "clientY" | "pointerId" | "currentTarget">,
    canCapture: boolean,
  ): CanvasGestureEvent => ({
    button: event.button,
    clientX: event.clientX,
    clientY: event.clientY,
    pointerId: event.pointerId,
    currentTarget: event.currentTarget,
    canCapture,
  });

  const placeTextFromMouseActivation = (event: Pick<ReactMouseEvent<HTMLCanvasElement>, "clientX" | "clientY" | "currentTarget">) => {
    if (mode !== "VisibleInteractive" || activeTool !== "text" || textDraft) return;
    const point = normalizePointerPath([event], event.currentTarget.getBoundingClientRect(), viewport)[0];
    const targetId = point ? findTopmostHit(scene, point, { hitPadding: HIT_TEST_PADDING, measureText: measureTextForHitTest }) : null;
    if (targetId && scene.some((item) => item.id === targetId && item.kind === "text")) return;
    beginGesture({
      button: 0,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: FALLBACK_POINTER_ID,
      currentTarget: event.currentTarget,
      canCapture: false,
    });
  };

  const dispatchMouseAsPointer = (event: ReactMouseEvent<HTMLCanvasElement>, type: "pointerdown" | "pointermove" | "pointerup") => {
    event.currentTarget.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: event.button,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: event.clientX,
      clientY: event.clientY,
      isPrimary: true,
      pointerId: FALLBACK_POINTER_ID,
      pointerType: "mouse",
    }));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerSequenceRef.current = true;
    suppressMouseUpRef.current = false;
    beginGesture(toCanvasGestureEvent(event, true));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    moveGesture(toCanvasGestureEvent(event, true));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    endGesture(toCanvasGestureEvent(event, true));
    pointerSequenceRef.current = false;
    suppressMouseUpRef.current = true;
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    // The embedded tauri-plugin-wdio-webdriver translates W3C pointer actions
    // to MouseEvents. Adapt that legacy boundary back to PointerEvents so the
    // renderer keeps one gesture implementation for real and WDIO input.
    if (pointerSequenceRef.current || typeof PointerEvent === "undefined") return;
    pointerSequenceRef.current = true;
    suppressMouseUpRef.current = false;
    dispatchMouseAsPointer(event, "pointerdown");
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!pointerSequenceRef.current || typeof PointerEvent === "undefined") return;
    dispatchMouseAsPointer(event, "pointermove");
  };

  const handleMouseUp = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (suppressMouseUpRef.current) {
      suppressMouseUpRef.current = false;
      return;
    }
    if (!pointerSequenceRef.current || typeof PointerEvent === "undefined") return;
    dispatchMouseAsPointer(event, "pointerup");
    pointerSequenceRef.current = false;
  };

  const handleCanvasClick = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    // A few WebKit/native input paths deliver the click activation but skip
    // the React pointerdown branch. Text placement is a click interaction, so
    // use the click as a one-shot fallback only when no draft exists yet.
    if (suppressTextClickRef.current) {
      suppressTextClickRef.current = false;
      return;
    }
    placeTextFromMouseActivation(event);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current === event.pointerId) {
      if (textDragRef.current?.pointerId === event.pointerId) suppressTextClickRef.current = true;
      cancelGesture();
    }
    pointerSequenceRef.current = false;
    suppressMouseUpRef.current = true;
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current === event.pointerId) {
      if (textDragRef.current?.pointerId === event.pointerId) suppressTextClickRef.current = true;
      cancelGesture();
    }
    pointerSequenceRef.current = false;
    suppressMouseUpRef.current = true;
  };

  const handleTextKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!textDraft) return;
    // Some embedded WebKit/WebDriver paths deliver modifier keydown events
    // separately but leave `event.shiftKey` false on the following Enter.
    // Track the physical Shift key as well as the browser modifier flag so
    // multiline text remains reliable at that native keyboard boundary.
    if (event.key === "Shift") {
      textShiftRef.current = true;
      return;
    }
    if (event.key === "Escape") {
      // Let the IME consume its first Escape to cancel the active candidate;
      // the next Escape cancels the draft after the composition has ended.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      cancelTextDraft();
      return;
    }
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing) return;
    if (event.shiftKey || textShiftRef.current) {
      event.preventDefault();
      const next = textDraftTransition(textDraft, { type: "insert-newline" });
      if (next) {
        const start = event.currentTarget.selectionStart ?? textDraft.value.length;
        const end = event.currentTarget.selectionEnd ?? start;
        onUpdateTextDraft(`${textDraft.value.slice(0, start)}\n${textDraft.value.slice(end)}`);
      }
      return;
    }
    event.preventDefault();
    if (textDraftTransition(textDraft, { type: "commit", isComposing: false }) !== null) return;
    commitTextDraft(textDraft);
  };

  const handleTextKeyUp = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Shift") textShiftRef.current = false;
  };

  const handleTextBlur = () => {
    textShiftRef.current = false;
    if (textCompositionRef.current || deferredOutsideTextCommitRef.current
      || textDraftCommitHandledRef.current || pendingSceneCommitRef.current?.kind === "text") return;
    cancelTextDraft();
  };

  const handleTextDraftChange = (value: string) => {
    latestTextDraftValueRef.current = value;
    textDraftCommitHandledRef.current = false;
    if (pendingSceneCommitRef.current?.kind === "text" && !sceneCommitInFlightRef.current) {
      pendingSceneCommitRef.current = null;
      setPendingSceneItem(null);
    }
    const limitError = textSceneItemLimitError(value);
    setCommitFeedback(limitError ? { kind: "error", message: limitError } : null);
    onUpdateTextDraft(value);
  };

  const commitTextDraft = useCallback((draft: TextDraft | null) => {
    if (!draft || textDraftCommitHandledRef.current) return;
    textDraftCommitHandledRef.current = true;
    const next = textDraftTransition(draft, { type: "commit", isComposing: false });
    if (next !== null) {
      // Empty/whitespace-only drafts are not annotations. An outside click
      // dismisses them; Enter keeps the editor open through handleTextKeyDown.
      cancelTextDraft();
      return;
    }
    const item = createTextItem(`text-${nextItemIdRef.current + 1}`, draft);
    const limitError = sceneItemLimitError(item);
    if (limitError) {
      setCommitFeedback({ kind: "error", message: limitError });
      return;
    }
    nextItemIdRef.current += 1;
    textShiftRef.current = false;
    submitSceneItem(item);
  }, [cancelTextDraft, submitSceneItem]);

  const handleTextCompositionStart = () => {
    // A new IME session supersedes any outside-click commit deferred by the
    // previous composition; only its own compositionend may resume the commit.
    compositionCommitCancelRef.current?.();
    compositionCommitCancelRef.current = null;
    textCompositionRef.current = true;
  };

  const handleTextCompositionEnd = (event: ReactCompositionEvent<HTMLTextAreaElement>) => {
    textCompositionRef.current = false;
    latestTextDraftValueRef.current = event.currentTarget.value;
    if (!deferredOutsideTextCommitRef.current) return;
    compositionCommitCancelRef.current?.();
    const finishDeferredCommit = () => {
      compositionCommitCancelRef.current = null;
      if (!deferredOutsideTextCommitRef.current) return;
      if (textCompositionRef.current) return;
      deferredOutsideTextCommitRef.current = false;
      const draft = textDraftRef.current;
      if (!draft) return;
      const finalValue = textEditorRef.current?.value ?? latestTextDraftValueRef.current;
      handleTextDraftChange(finalValue);
      commitTextDraft({ ...draft, value: finalValue });
    };
    // Transparent overlay webviews can be hidden while still receiving IME
    // input; WebKit suspends requestAnimationFrame in that state. Defer one
    // task so the final composition input is applied without depending on a frame.
    const timer = window.setTimeout(finishDeferredCommit, 0);
    compositionCommitCancelRef.current = () => window.clearTimeout(timer);
  };

  useEffect(() => () => {
    compositionCommitCancelRef.current?.();
  }, []);

  useEffect(() => {
    if (!textDraft) return;
    const handleOutsidePointer = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || textEditorRef.current?.contains(target)) return;
      if (activeTool === "text" && canvasRef.current?.contains(target)) {
        // The same canvas click must commit this draft, not place another one.
        suppressTextClickRef.current = true;
        suppressNextTextDraftRef.current = true;
      }
      if (textCompositionRef.current || deferredOutsideTextCommitRef.current) {
        deferredOutsideTextCommitRef.current = true;
        return;
      }
      commitTextDraft(textDraft);
    };
    // The embedded WebDriver may synthesize mouse events instead of pointer
    // events. The commit guard makes the two paths idempotent when both fire.
    window.addEventListener("pointerdown", handleOutsidePointer, true);
    window.addEventListener("mousedown", handleOutsidePointer, true);
    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointer, true);
      window.removeEventListener("mousedown", handleOutsidePointer, true);
    };
  }, [activeTool, commitTextDraft, textDraft]);

  const draftPosition = textDraft ? viewportPoint(textDraft.anchor, viewportSize(viewport).width, viewportSize(viewport).height, viewport) : null;
  const draftEditorStyle = textDraft ? (() => {
    const lines = textDraft.value.split("\n");
    const longestLine = Math.max(1, ...lines.map((line) => measureTextForHitTest(line, textDraft.style)));
    return {
      width: `${Math.min(360, Math.max(80, Math.ceil(longestLine + 18)))}px`,
      minHeight: `${Math.max(28, Math.ceil(lines.length * textDraft.style.textSize * TEXT_LINE_HEIGHT + 8))}px`,
    };
  })() : undefined;

  return (
    <>
      {commitFeedback ? (
        <div
          role={commitFeedback.kind === "error" ? "alert" : "status"}
          aria-live={commitFeedback.kind === "error" ? "assertive" : "polite"}
          data-annotation-commit-feedback={commitFeedback.kind}
          style={{
            position: "fixed", top: 12, right: 12, zIndex: 10_000, maxWidth: "min(480px, calc(100vw - 24px))",
            padding: "10px 12px", borderRadius: 8,
            color: "#fff", background: commitFeedback.kind === "error" ? "#991b1b" : "#854d0e",
            font: "13px/1.4 system-ui, sans-serif", boxShadow: "0 2px 12px #0005", pointerEvents: "auto",
          }}
        >
          <span>{commitFeedback.message}</span>
          {pendingSceneItem && !commitSaving ? (
            <span style={{ display: "inline-flex", gap: 8, marginLeft: 10 }}>
              <button type="button" onClick={retryPendingSceneItem}>Retry save</button>
              <button type="button" onClick={discardPendingSceneItem}>Discard unsaved annotation</button>
            </span>
          ) : null}
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        aria-label="Annotation surface"
        className="overlay-surface"
        data-overlay-canvas="true"
        style={{ pointerEvents: canvasPointerEvents(mode), width: viewportSize(viewport).width, height: viewportSize(viewport).height }}
        width={Math.max(1, Math.round(viewportSize(viewport).width * viewport.scaleFactor))}
        height={Math.max(1, Math.round(viewportSize(viewport).height * viewport.scaleFactor))}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        onPointerLeave={() => { if (activeTool === "eraser") setHoveredItemId(null); }}
        data-gesture-phase={gesturePhase}
        data-transient-active={transientSceneItem ? "true" : "false"}
      />
      {textDraft && draftPosition && mode === "VisibleInteractive" ? (
        <textarea
          ref={textEditorRef}
          aria-label="Text draft"
          className="text-draft-editor"
          data-text-draft="true"
          data-scene-excluded="true"
          value={textDraft.value}
          readOnly={commitSaving && pendingSceneItem?.kind === "text"}
          onChange={(event) => handleTextDraftChange(event.target.value)}
          onKeyDown={handleTextKeyDown}
          onKeyUp={handleTextKeyUp}
          onCompositionStart={handleTextCompositionStart}
          onCompositionEnd={handleTextCompositionEnd}
          onBlur={handleTextBlur}
          rows={1}
          style={{ left: draftPosition.x, top: draftPosition.y, color: textDraft.style.color, fontSize: textDraft.style.textSize, ...draftEditorStyle }}
        />
      ) : null}
    </>
  );
}

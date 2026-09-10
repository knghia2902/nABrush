import { TOOL_ORDER } from "../types/platform-parity";
import type {
  AnnotationStyle,
  CanonicalPoint,
  EllipseGeometry,
  SceneItem,
  ShapeBounds,
  ShapeSceneItem,
  StrokeSceneItem,
  TextDraft,
  TextSceneItem,
} from "../types/overlay";
import type { AnnotationTool } from "../types/platform-parity";

export { TOOL_ORDER } from "../types/platform-parity";
export type { AnnotationTool } from "../types/platform-parity";

const outlineStyle = (color: string): AnnotationStyle => ({
  color,
  opacity: 0.92,
  width: 2,
  fill: "none",
  fillColor: color,
  fillOpacity: 0.18,
  textSize: 24,
});

export const DEFAULT_TOOL_STYLES: Readonly<Record<AnnotationTool, AnnotationStyle>> = {
  pen: outlineStyle("#ef4444"),
  highlighter: {
    color: "#facc15",
    opacity: 0.35,
    width: 12,
    fill: "none",
    fillColor: "#facc15",
    fillOpacity: 0.18,
    textSize: 24,
  },
  line: outlineStyle("#334155"),
  arrow: outlineStyle("#334155"),
  rectangle: outlineStyle("#334155"),
  ellipse: outlineStyle("#334155"),
  text: outlineStyle("#334155"),
  eraser: outlineStyle("#334155"),
};

export type AnnotationState = Readonly<{
  activeTool: AnnotationTool;
  stylesByTool: Readonly<Record<AnnotationTool, AnnotationStyle>>;
  textDraft: TextDraft | null;
  hoveredItemId: string | null;
}>;

export const MIN_GEOMETRY_DRAG = 4;

export function geometryDistance(start: CanonicalPoint, end: CanonicalPoint): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function isGeometryDragValid(start: CanonicalPoint, end: CanonicalPoint): boolean {
  return Number.isFinite(start.x)
    && Number.isFinite(start.y)
    && Number.isFinite(end.x)
    && Number.isFinite(end.y)
    && geometryDistance(start, end) >= MIN_GEOMETRY_DRAG;
}

export function normalizeShapeBounds(start: CanonicalPoint, end: CanonicalPoint): ShapeBounds {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/** Compatibility name for callers that normalize any rectangular shape bounds. */
export const normalizeGeometryBounds = normalizeShapeBounds;

export function createInitialAnnotationState(): AnnotationState {
  const stylesByTool = Object.fromEntries(
    TOOL_ORDER.map((tool) => [tool, { ...DEFAULT_TOOL_STYLES[tool] }]),
  ) as Record<AnnotationTool, AnnotationStyle>;
  return { activeTool: "pen", stylesByTool, textDraft: null, hoveredItemId: null };
}

export function selectAnnotationTool(state: AnnotationState, activeTool: AnnotationTool): AnnotationState {
  return state.activeTool === activeTool ? state : { ...state, activeTool };
}

export function updateToolStyle(
  state: AnnotationState,
  tool: AnnotationTool,
  patch: Partial<AnnotationStyle>,
): AnnotationState {
  return {
    ...state,
    stylesByTool: {
      ...state.stylesByTool,
      [tool]: { ...state.stylesByTool[tool], ...patch },
    },
  };
}

export const HIT_TEST_PADDING = 6;
export const TEXT_LINE_HEIGHT = 1.2;

export type TextDraftAction =
  | { type: "place"; anchor: CanonicalPoint; style: AnnotationStyle }
  | { type: "update"; value: string }
  | { type: "insert-newline" }
  | { type: "commit"; isComposing?: boolean }
  | { type: "cancel" };

export function textDraftTransition(draft: TextDraft | null, action: TextDraftAction): TextDraft | null {
  switch (action.type) {
    case "place":
      return { anchor: { ...action.anchor }, value: "", style: { ...action.style } };
    case "update":
      return draft ? { ...draft, value: action.value } : draft;
    case "insert-newline":
      return draft ? { ...draft, value: `${draft.value}\n` } : draft;
    case "commit":
      if (!draft || action.isComposing || draft.value.trim().length === 0) return draft;
      return null;
    case "cancel":
      return null;
  }
}

export type TextMetricProvider = (line: string, style: AnnotationStyle) => number;

export type TextBounds = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  lineWidths: readonly number[];
  lineHeight: number;
}>;

const defaultTextMetric: TextMetricProvider = (line, style) => line.length * style.textSize * 0.6;

export function measureTextBounds(
  anchor: CanonicalPoint,
  text: string,
  style: AnnotationStyle,
  measureText: TextMetricProvider = defaultTextMetric,
): TextBounds {
  const lines = text.split("\n");
  const lineWidths = lines.map((line) => Math.max(0, measureText(line, style)));
  return {
    x: anchor.x,
    y: anchor.y,
    width: Math.max(0, ...lineWidths),
    height: Math.max(1, lines.length * style.textSize * TEXT_LINE_HEIGHT),
    lineWidths,
    lineHeight: style.textSize * TEXT_LINE_HEIGHT,
  };
}

export function textBounds(
  item: Pick<TextSceneItem, "anchor" | "text" | "style">,
  measureText: TextMetricProvider = defaultTextMetric,
): TextBounds {
  return measureTextBounds(item.anchor, item.text, item.style, measureText);
}

export function createTextItem(id: string, draft: TextDraft): TextSceneItem {
  return {
    id,
    kind: "text",
    tool: "text",
    anchor: { ...draft.anchor },
    text: draft.value,
    style: { ...draft.style },
  };
}

export type HitTestOptions = Readonly<{
  hitPadding?: number;
  measureText?: TextMetricProvider;
}>;

function distanceToSegment(point: CanonicalPoint, start: CanonicalPoint, end: CanonicalPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
}

function pointInRectangle(point: CanonicalPoint, bounds: ShapeBounds, padding: number): boolean {
  return point.x >= bounds.x - padding
    && point.x <= bounds.x + bounds.width + padding
    && point.y >= bounds.y - padding
    && point.y <= bounds.y + bounds.height + padding;
}

function rectangleHit(point: CanonicalPoint, item: ShapeSceneItem, padding: number): boolean {
  if (item.geometry.type !== "rectangle") return false;
  const bounds = item.geometry;
  const halfStroke = item.style.width / 2 + padding;
  if (item.style.fill === "solid" && pointInRectangle(point, bounds, padding)) return true;
  const insideOuter = pointInRectangle(point, bounds, halfStroke);
  const insideInner = point.x > bounds.x + halfStroke
    && point.x < bounds.x + bounds.width - halfStroke
    && point.y > bounds.y + halfStroke
    && point.y < bounds.y + bounds.height - halfStroke;
  return insideOuter && !insideInner;
}

function ellipseHit(point: CanonicalPoint, geometry: EllipseGeometry, item: ShapeSceneItem, padding: number): boolean {
  if (geometry.radiusX <= 0 || geometry.radiusY <= 0) return false;
  const dx = point.x - geometry.center.x;
  const dy = point.y - geometry.center.y;
  const normalized = (dx * dx) / (geometry.radiusX * geometry.radiusX)
    + (dy * dy) / (geometry.radiusY * geometry.radiusY);
  if (item.style.fill === "solid" && normalized <= 1) return true;
  const tolerance = (item.style.width / 2 + padding) / Math.min(geometry.radiusX, geometry.radiusY);
  return Math.abs(Math.sqrt(Math.max(0, normalized)) - 1) <= tolerance;
}

function shapeHit(point: CanonicalPoint, item: ShapeSceneItem, padding: number): boolean {
  if (item.tool === "rectangle") return rectangleHit(point, item, padding);
  if (item.tool === "ellipse" && item.geometry.type === "ellipse") return ellipseHit(point, item.geometry, item, padding);
  if (item.geometry.type !== "line") return false;
  return distanceToSegment(point, item.geometry.start, item.geometry.end) <= item.style.width / 2 + padding;
}

function strokeHit(point: CanonicalPoint, item: StrokeSceneItem, padding: number): boolean {
  if (item.points.length === 0) return false;
  const threshold = item.style.width / 2 + padding;
  for (let index = 1; index < item.points.length; index += 1) {
    if (distanceToSegment(point, item.points[index - 1], item.points[index]) <= threshold) return true;
  }
  return Math.hypot(point.x - item.points[0].x, point.y - item.points[0].y) <= threshold;
}

export function hitTestSceneItem(
  item: SceneItem,
  point: CanonicalPoint,
  options: HitTestOptions = {},
): boolean {
  const padding = options.hitPadding ?? HIT_TEST_PADDING;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(padding) || padding < 0) return false;
  if (item.kind === "stroke") return strokeHit(point, item, padding);
  if (item.kind === "shape") return shapeHit(point, item, padding);
  const bounds = textBounds(item, options.measureText ?? defaultTextMetric);
  return point.x >= bounds.x - padding
    && point.x <= bounds.x + bounds.width + padding
    && point.y >= bounds.y - padding
    && point.y <= bounds.y + bounds.height + padding;
}

export function findTopmostHit(
  scene: readonly SceneItem[],
  point: CanonicalPoint,
  options: HitTestOptions = {},
): string | null {
  for (let index = scene.length - 1; index >= 0; index -= 1) {
    if (hitTestSceneItem(scene[index], point, options)) return scene[index].id;
  }
  return null;
}

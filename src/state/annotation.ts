import { TOOL_ORDER } from "../types/platform-parity";
import type { AnnotationStyle } from "../types/overlay";
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
}>;

export function createInitialAnnotationState(): AnnotationState {
  const stylesByTool = Object.fromEntries(
    TOOL_ORDER.map((tool) => [tool, { ...DEFAULT_TOOL_STYLES[tool] }]),
  ) as Record<AnnotationTool, AnnotationStyle>;
  return { activeTool: "pen", stylesByTool };
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

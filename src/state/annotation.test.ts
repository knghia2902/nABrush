import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOOL_STYLES,
  HIT_TEST_PADDING,
  MIN_GEOMETRY_DRAG,
  TOOL_ORDER,
  createTextItem,
  createInitialAnnotationState,
  findTopmostHit,
  hitTestSceneItem,
  isGeometryDragValid,
  measureTextBounds,
  normalizeGeometryBounds,
  selectAnnotationTool,
  textBounds,
  textDraftTransition,
  updateToolStyle,
} from "./annotation";
import type { AnnotationStyle, SceneItem, TextDraft } from "../types/overlay";

const textStyle: AnnotationStyle = {
  color: "#334155",
  opacity: 0.92,
  width: 2,
  fill: "none",
  fillColor: "#334155",
  fillOpacity: 0.18,
  textSize: 20,
};

const draft: TextDraft = { anchor: { x: 100, y: 200 }, value: "hello", style: textStyle };

const metric = (line: string): number => line.length * 10;

function stroke(id: string, x = 10): SceneItem {
  return { id, kind: "stroke", tool: "pen", points: [{ x, y: 10 }, { x: x + 80, y: 10 }], style: textStyle };
}

function rectangle(id: string): SceneItem {
  return { id, kind: "shape", tool: "rectangle", geometry: { type: "rectangle", x: 20, y: 20, width: 80, height: 60 }, style: textStyle };
}

function ellipse(id: string): SceneItem {
  return { id, kind: "shape", tool: "ellipse", geometry: { type: "ellipse", center: { x: 220, y: 50 }, radiusX: 40, radiusY: 25 }, style: textStyle };
}

describe("annotation tool state", () => {
  it("initializes every tool in the locked order with thin outline defaults", () => {
    const state = createInitialAnnotationState();

    expect([...TOOL_ORDER]).toEqual(["pen", "highlighter", "line", "arrow", "rectangle", "ellipse", "text", "eraser"]);
    expect(Object.keys(state.stylesByTool)).toEqual([...TOOL_ORDER]);
    expect(state.activeTool).toBe("pen");
    expect(state.stylesByTool.pen.width).toBe(2);
    expect(state.stylesByTool.line.width).toBe(2);
    expect(state.stylesByTool.highlighter).toMatchObject({ width: 12, opacity: 0.35, color: "#facc15" });
    expect(DEFAULT_TOOL_STYLES.pen.width).toBeLessThan(4);
  });

  it("selects a tool without resetting retained per-tool style memory", () => {
    const initial = createInitialAnnotationState();
    const styled = updateToolStyle(initial, "pen", { color: "#22c55e", width: 3 });
    const selected = selectAnnotationTool(styled, "highlighter");

    expect(selected.activeTool).toBe("highlighter");
    expect(selected.stylesByTool.pen).toMatchObject({ color: "#22c55e", width: 3 });
    expect(selected.stylesByTool.highlighter).toEqual(initial.stylesByTool.highlighter);
  });

  it("updates only the requested tool and returns immutable state", () => {
    const initial = createInitialAnnotationState();
    const next = updateToolStyle(initial, "highlighter", { opacity: 0.5 });

    expect(next).not.toBe(initial);
    expect(next.stylesByTool).not.toBe(initial.stylesByTool);
    expect(next.stylesByTool.highlighter).not.toBe(initial.stylesByTool.highlighter);
    expect(next.stylesByTool.highlighter.opacity).toBe(0.5);
    expect(next.stylesByTool.pen).toEqual(initial.stylesByTool.pen);
    expect(initial.stylesByTool.highlighter.opacity).toBe(0.35);
  });

  it("keeps geometry threshold and bound normalization pure", () => {
    expect(MIN_GEOMETRY_DRAG).toBe(4);
    expect(isGeometryDragValid({ x: 0, y: 0 }, { x: 3.9, y: 0 })).toBe(false);
    expect(isGeometryDragValid({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
    expect(normalizeGeometryBounds({ x: 8, y: 7 }, { x: 2, y: 1 })).toEqual({ x: 2, y: 1, width: 6, height: 6 });
  });

  it("keeps text transient until deliberate non-composing commit", () => {
    expect(textDraftTransition(null, { type: "place", anchor: draft.anchor, style: textStyle })).toEqual({
      anchor: draft.anchor,
      value: "",
      style: textStyle,
    });
    expect(textDraftTransition(draft, { type: "update", value: "hello world" })?.value).toBe("hello world");
    expect(textDraftTransition(draft, { type: "insert-newline" })?.value).toBe("hello\n");
    expect(textDraftTransition(draft, { type: "commit", isComposing: true })).toEqual(draft);
    expect(textDraftTransition({ ...draft, value: "   " }, { type: "commit" })).toEqual({ ...draft, value: "   " });
    expect(textDraftTransition(draft, { type: "commit" })).toBeNull();
    expect(textDraftTransition(draft, { type: "cancel" })).toBeNull();
  });

  it("creates typed text items and measures every line with deterministic bounds", () => {
    const item = createTextItem("text-1", draft);
    expect(item).toEqual({ id: "text-1", kind: "text", tool: "text", anchor: draft.anchor, text: "hello", style: textStyle });
    expect(measureTextBounds(draft.anchor, "hello\nworld!", textStyle, metric)).toMatchObject({
      x: 100,
      y: 200,
      width: 60,
      height: 48,
      lineWidths: [50, 60],
    });
    expect(textBounds(item, metric).lineWidths).toEqual([50]);
  });

  it("uses type-specific padded hit areas and reverse scene order", () => {
    expect(HIT_TEST_PADDING).toBe(6);
    expect(hitTestSceneItem(stroke("stroke"), { x: 50, y: 16 })).toBe(true);
    expect(hitTestSceneItem(stroke("stroke"), { x: 50, y: 30 })).toBe(false);
    expect(hitTestSceneItem(rectangle("rectangle"), { x: 50, y: 50 })).toBe(false);
    const filledRectangle = { ...rectangle("filled"), style: { ...textStyle, fill: "solid" as const } };
    expect(hitTestSceneItem(filledRectangle, { x: 50, y: 50 })).toBe(true);
    expect(hitTestSceneItem(ellipse("ellipse"), { x: 260, y: 50 })).toBe(true);
    const text = createTextItem("text", { ...draft, value: "hello" });
    expect(hitTestSceneItem(text, { x: 105, y: 210 }, { measureText: metric })).toBe(true);
    expect(hitTestSceneItem(text, { x: 170, y: 260 }, { measureText: metric })).toBe(false);

    const overlap = [stroke("bottom"), stroke("top")];
    expect(findTopmostHit(overlap, { x: 50, y: 10 })).toBe("top");
    expect(findTopmostHit(overlap, { x: 50, y: 100 })).toBeNull();
  });
});

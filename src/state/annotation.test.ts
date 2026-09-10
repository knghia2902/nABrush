import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOOL_STYLES,
  TOOL_ORDER,
  createInitialAnnotationState,
  selectAnnotationTool,
  updateToolStyle,
} from "./annotation";

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
});

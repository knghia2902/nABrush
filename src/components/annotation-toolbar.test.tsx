import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AnnotationToolbar,
  clampToolbarPosition,
  moveToolbarPosition,
  TOOLBAR_KEYBOARD_SHIFT_STEP,
  TOOLBAR_KEYBOARD_STEP,
} from "./AnnotationToolbar";
import type { AnnotationStyle, AnnotationTool } from "../types/overlay";
import { TOOL_ORDER } from "../state/annotation";

const baseStyle: AnnotationStyle = {
  color: "#334155",
  opacity: 0.82,
  width: 3,
  fill: "none",
  fillColor: "#f97316",
  fillOpacity: 0.28,
  textSize: 24,
};

function renderToolbar(activeTool: AnnotationTool, toolStyle: AnnotationStyle = baseStyle): string {
  return renderToStaticMarkup(
    <AnnotationToolbar
      activeTool={activeTool}
      toolStyle={toolStyle}
      propertyOpen
      onSelectTool={() => undefined}
      onToggleProperties={() => undefined}
      onUpdateStyle={() => undefined}
    />,
  );
}

describe("AnnotationToolbar", () => {
  it("keeps the shared order and exposes an accessible scene-excluded vertical palette", () => {
    const markup = renderToolbar("pen");
    const toolOrder = [...markup.matchAll(/data-tool="([^"]+)"/g)].map((match) => match[1]);

    expect(toolOrder).toEqual([...TOOL_ORDER]);
    expect(markup).toContain('data-annotation-toolbar="true"');
    expect(markup).toContain('data-scene-excluded="true"');
    expect(markup).toContain('data-toolbar-drag-handle="true"');
    expect(markup).toContain('aria-label="Move annotation toolbar"');
    expect(markup).toContain('data-toolbar-keyboard-step="8"');
    expect(markup).toContain('data-toolbar-keyboard-shift-step="32"');
    expect(markup).toContain('class="annotation-toolbar__header"');
    expect(markup).toContain('class="annotation-toolbar__tools"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-controls="annotation-property-popover"');
    expect(markup).toContain('type="button"');
  });

  it("clamps finite pointer positions, including oversized and invalid candidates", () => {
    expect(clampToolbarPosition(1200, 800, 96, 320, 16, -40, 900)).toEqual({ left: 16, top: 464 });
    expect(clampToolbarPosition(1200, 800, 96, 320, 16, 500, 200)).toEqual({ left: 500, top: 200 });
    expect(clampToolbarPosition(100, 80, 240, 160, 16, 60, 40)).toEqual({ left: 0, top: 0 });
    expect(clampToolbarPosition(1200, 800, 96, 320, 16, Number.NaN, 20)).toEqual({ left: 0, top: 0 });
    expect(clampToolbarPosition(1200, 800, 96, 320, 16, Number.POSITIVE_INFINITY, 20)).toEqual({ left: 0, top: 0 });
  });

  it("uses normal and shifted arrow steps through the same bounded position contract", () => {
    expect(TOOLBAR_KEYBOARD_STEP).toBe(8);
    expect(TOOLBAR_KEYBOARD_SHIFT_STEP).toBe(32);
    expect(moveToolbarPosition({ left: 100, top: 120 }, "ArrowRight", false, 1200, 800, 96, 320)).toEqual({ left: 108, top: 120 });
    expect(moveToolbarPosition({ left: 100, top: 120 }, "ArrowDown", true, 1200, 800, 96, 320)).toEqual({ left: 100, top: 152 });
    expect(moveToolbarPosition({ left: 16, top: 16 }, "ArrowLeft", true, 1200, 800, 96, 320)).toEqual({ left: 16, top: 16 });
    expect(moveToolbarPosition({ left: 1100, top: 700 }, "ArrowRight", true, 1200, 800, 96, 320)).toEqual({ left: 1088, top: 464 });
  });

  it("renders controlled fill controls for rectangle and ellipse tools", () => {
    for (const tool of ["rectangle", "ellipse"] as const) {
      const markup = renderToolbar(tool, {
        ...baseStyle,
        fill: "solid",
        fillColor: tool === "rectangle" ? "#16a34a" : "#7c3aed",
        fillOpacity: tool === "rectangle" ? 0.42 : 0.67,
      });

      expect(markup).toContain(`data-active-tool="${tool}"`);
      expect(markup).toContain('data-property-popover="true"');
      expect(markup).toContain('data-style-control="fill"');
      expect(markup).toContain('data-style-control="fillColor"');
      expect(markup).toContain(`value="${tool === "rectangle" ? "#16a34a" : "#7c3aed"}"`);
      expect(markup).toContain('data-style-control="fillOpacity"');
      expect(markup).toMatch(new RegExp(`<input type="range" min="0" max="1" step="0\\.01" data-style-control="fillOpacity" value="${tool === "rectangle" ? "0\\.42" : "0\\.67"}"`));
      expect(markup).toContain('option value="solid" selected=""');
      expect(markup).toContain('data-scene-excluded="true"');
    }
  });

  it("keeps shared controls while omitting shape-only controls for pen", () => {
    const markup = renderToolbar("pen");

    expect(markup).toContain('data-style-control="color"');
    expect(markup).toContain('data-style-control="opacity"');
    expect(markup).toContain('data-style-control="width"');
    expect(markup).not.toContain('data-style-control="fill"');
    expect(markup).not.toContain('data-style-control="fillColor"');
    expect(markup).not.toContain('data-style-control="fillOpacity"');
  });
});

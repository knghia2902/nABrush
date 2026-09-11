import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnotationToolbar } from "./AnnotationToolbar";
import type { AnnotationStyle, AnnotationTool } from "../types/overlay";

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

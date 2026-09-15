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

function renderToolbar(
  activeTool: AnnotationTool,
  toolStyle: AnnotationStyle = baseStyle,
  lifecycleMode: "persistent" | "vanishing" = "persistent",
  vanishingDurationSeconds = 3,
  history = { canUndo: false, canRedo: false, canClear: false },
): string {
  return renderToStaticMarkup(
    <AnnotationToolbar
      activeTool={activeTool}
      toolStyle={toolStyle}
      lifecycleMode={lifecycleMode}
      vanishingDurationSeconds={vanishingDurationSeconds}
      {...history}
      propertyOpen
      onSelectTool={() => undefined}
      onToggleProperties={() => undefined}
      onUpdateStyle={() => undefined}
      onToggleLifecycleMode={() => undefined}
      onSetVanishingDuration={() => undefined}
      onUndo={() => undefined}
      onRedo={() => undefined}
      onClearAll={() => undefined}
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

  it("shows toolbar icons without visible labels or hover descriptions while keeping accessible names", () => {
    const markup = renderToolbar("pen");
    const toolbar = markup.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";

    expect(toolbar).not.toContain("annotation-toolbar__tool-label");
    expect(toolbar).not.toContain("annotation-toolbar__handle-label");
    expect(toolbar).not.toContain("title=");
    expect(toolbar).not.toMatch(/>(?:Move|Undo|Redo|Clear all|Pen|Highlighter|Line|Arrow|Rectangle|Ellipse|Text|Eraser|Properties|Persistent|Vanishing)</);
    expect(toolbar).toContain('aria-label="Undo"');
    expect(toolbar).toContain('aria-label="Pen"');
    expect(toolbar).toContain('aria-label="Tool properties"');
  });

  it("uses a consistent decorative SVG icon for every toolbar control", () => {
    const markup = renderToolbar("pen");
    const toolbar = markup.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";

    expect(toolbar.match(/<svg\b/g)).toHaveLength(14);
    expect(toolbar.match(/aria-hidden="true"[^>]*class="annotation-toolbar__icon"/g)).toHaveLength(14);
    expect(toolbar).toContain('viewBox="0 0 24 24"');
    expect(toolbar).toContain('stroke-width="1.8"');
    expect(toolbar).toContain('aria-label="Clear all annotations"');
    expect(toolbar).toContain('aria-label="Ink lifecycle: Persistent"');
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

  it("exposes scene-excluded Undo, Redo, and undoable Clear All controls with matching availability", () => {
    const empty = renderToolbar("pen");
    expect(empty).toContain('aria-label="Undo"');
    expect(empty).toContain('data-history-undo="true"');
    expect(empty).toContain('aria-keyshortcuts="Meta+Z Control+Z"');
    expect(empty).toContain('data-history-redo="true"');
    expect(empty).toContain('aria-keyshortcuts="Meta+Y Control+Y"');
    expect(empty).toContain('aria-label="Clear all annotations"');
    expect(empty).toContain('data-history-clear="true"');
    expect(empty).toMatch(/data-history-undo="true"[^>]*data-scene-excluded="true"/);
    expect(empty).toMatch(/data-history-redo="true"[^>]*data-scene-excluded="true"/);
    expect(empty).toMatch(/data-history-clear="true"[^>]*data-scene-excluded="true"/);
    expect(empty).toMatch(/data-history-undo="true"[^>]*disabled=""/);
    expect(empty).toMatch(/data-history-redo="true"[^>]*disabled=""/);
    expect(empty).toMatch(/data-history-clear="true"[^>]*disabled=""/);

    const available = renderToolbar("pen", baseStyle, "persistent", 3, {
      canUndo: true,
      canRedo: true,
      canClear: true,
    });
    expect(available).toMatch(/data-history-undo="true"(?![^>]*disabled)/);
    expect(available).toMatch(/data-history-redo="true"(?![^>]*disabled)/);
    expect(available).toMatch(/data-history-clear="true"(?![^>]*disabled)/);
    expect(available.indexOf('data-history-undo="true"')).toBeLessThan(available.indexOf('data-tool="pen"'));
    expect(available).toContain('data-scene-excluded="true"');
  });

  it("always shows a scene-excluded lifecycle toggle and only shows durations for Vanishing", () => {
    const persistent = renderToolbar("pen");
    expect(persistent).toContain('data-lifecycle-toggle="true"');
    expect(persistent).toContain('data-lifecycle-mode="persistent"');
    expect(persistent).toContain('data-scene-excluded="true"');
    expect(persistent).not.toContain('data-lifecycle-controls="true"');
    expect(persistent).not.toContain('data-lifecycle-preset="true"');

    const vanishing = renderToolbar("pen", baseStyle, "vanishing", 5);
    expect(vanishing).toContain('data-lifecycle-mode="vanishing"');
    expect(vanishing).toContain('data-lifecycle-controls="true"');
    expect(vanishing).toContain('data-lifecycle-preset="true"');
    expect(vanishing).toContain('aria-label="Custom vanishing duration in seconds"');
    expect(vanishing).toContain('data-lifecycle-duration="true"');
    expect(vanishing).toContain('value="5"');
    expect(vanishing).toContain('data-scene-excluded="true"');
  });
});

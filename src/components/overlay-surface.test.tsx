import { describe, expect, it } from "vitest";
import type { OverlayMode, SceneItem } from "../types/overlay";
import {
  appendStroke,
  canvasPointerEvents,
  createStroke,
  drawScene,
  normalizePointerPath,
} from "./OverlaySurface";

describe("OverlaySurface scene helpers", () => {
  it("normalizes a pointer path into one stable stroke scene item", () => {
    const path = normalizePointerPath(
      [
        { clientX: 100, clientY: 50 },
        { clientX: 200, clientY: 150 },
      ],
      { left: 100, top: 50, width: 400, height: 200 },
    );

    const stroke = createStroke("stroke-1", path);
    expect(stroke).toMatchObject({ id: "stroke-1", kind: "stroke" });
    expect(stroke.points).toEqual([
      { x: 0, y: 0 },
      { x: 0.25, y: 0.5 },
    ]);
    expect(stroke.points.length).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates a stroke id while retaining the scene across mode transitions", () => {
    const stroke = createStroke("stroke-1", [{ x: 0.1, y: 0.2 }, { x: 0.2, y: 0.3 }]);
    const scene = appendStroke([], stroke);
    expect(appendStroke(scene, stroke)).toEqual(scene);
    expect(scene).toHaveLength(1);
    expect(scene[0]).toEqual(stroke);
  });

  it("captures only in interactive mode and clears an empty canvas", () => {
    const modes: OverlayMode[] = ["VisibleInteractive", "VisibleClickThrough", "Hidden"];
    expect(modes.map(canvasPointerEvents)).toEqual(["auto", "none", "none"]);

    const calls: string[] = [];
    const context = {
      clearRect: () => calls.push("clear"),
      beginPath: () => calls.push("begin"),
      moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"),
      stroke: () => calls.push("stroke"),
    };
    drawScene(context, [] as SceneItem[], 800, 600);
    expect(calls).toEqual(["clear"]);
  });
});

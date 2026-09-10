import { describe, expect, it } from "vitest";
import type { OverlayMode, SceneItem } from "../types/overlay";
import {
  appendStroke,
  canonicalToViewport,
  canvasPointerEvents,
  createStroke,
  drawScene,
  normalizePointerPath,
  viewportToCanonical,
} from "./OverlaySurface";

const viewport = {
  id: "left",
  origin: { x: -1920, y: -900 },
  logicalSize: { width: 1920, height: 1080 },
  scaleFactor: 2,
  orientation: "degrees90" as const,
};

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

  it("converts negative-origin canonical points through a rotated viewport and back", () => {
    const canonical = { x: -1400, y: 100 };
    const local = canonicalToViewport(canonical, viewport);
    expect(local).toEqual({ x: 80, y: 520 });
    expect(viewportToCanonical(local, viewport)).toEqual(canonical);
  });

  it("commits pointer-up samples in canonical coordinates using the viewport scale", () => {
    const path = normalizePointerPath(
      [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 200 }],
      { left: 0, top: 0, width: 1080, height: 1920 },
      viewport,
    );
    expect(path).toEqual([{ x: -1920, y: 180 }, { x: -1720, y: 80 }]);
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

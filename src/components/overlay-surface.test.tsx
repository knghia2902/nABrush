import { describe, expect, it } from "vitest";
import type { OverlayMode, SceneItem } from "../types/overlay";
import {
  arrowheadPath,
  appendStroke,
  canonicalToViewport,
  canvasPointerEvents,
  createGeometryItem,
  createShapeItem,
  createStroke,
  drawShapeGeometry,
  drawScene,
  normalizePointerPath,
  transientGeometryForGesture,
  transientSceneItemForGesture,
  transientStrokeForSamples,
  viewportBackingSize,
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

  it("round-trips every supported quarter-turn orientation", () => {
    const canonical = { x: -1500, y: -300 };
    for (const orientation of ["degrees0", "degrees90", "degrees180", "degrees270"] as const) {
      const rotated = { ...viewport, orientation };
      const local = canonicalToViewport(canonical, rotated);
      expect(viewportToCanonical(local, rotated)).toEqual(canonical);
    }
  });

  it("sizes the backing store from each viewport's logical dimensions and DPR", () => {
    expect(viewportBackingSize(viewport)).toEqual({ width: 2160, height: 3840 });
    expect(viewportBackingSize({ ...viewport, scaleFactor: 1.25, orientation: "degrees0" })).toEqual({ width: 2400, height: 1350 });
  });

  it("clamps pointer samples to the viewport before converting to canonical space", () => {
    const path = normalizePointerPath(
      [{ clientX: -100, clientY: -100 }, { clientX: 2000, clientY: 2000 }],
      { left: 0, top: 0, width: 1080, height: 1920 },
      viewport,
    );
    expect(path).toEqual([{ x: -1920, y: 180 }, { x: 0, y: -900 }]);
  });

  it("commits pointer-up samples in canonical coordinates using the viewport scale", () => {
    const path = normalizePointerPath(
      [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 200 }],
      { left: 0, top: 0, width: 1080, height: 1920 },
      viewport,
    );
    expect(path).toEqual([{ x: -1920, y: 180 }, { x: -1720, y: 80 }]);
  });

  it("builds a transient stroke from pointer moves without changing the retained scene", () => {
    const scene: SceneItem[] = [];
    const transient = transientStrokeForSamples(
      [
        { clientX: 0, clientY: 0 },
        { clientX: 100, clientY: 200 },
      ],
      { left: 0, top: 0, width: 1080, height: 1920 },
      viewport,
    );

    expect(transient).toEqual(createStroke("transient-stroke", [{ x: -1920, y: 180 }, { x: -1720, y: 80 }]));
    expect(scene).toEqual([]);
  });

  it("keeps pen and highlighter styles on the transient item snapshot", () => {
    const style = { color: "#facc15", opacity: 0.35, width: 12, fill: "none" as const, fillColor: "#facc15", fillOpacity: 0.18, textSize: 24 };
    const transient = transientSceneItemForGesture(
      [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 200 }],
      { left: 0, top: 0, width: 1080, height: 1920 },
      viewport,
      "highlighter",
      style,
    );

    expect(transient?.tool).toBe("highlighter");
    expect(transient?.style).toEqual(style);
  });

  it("builds canonical line and arrow candidates only after the 4px logical threshold", () => {
    const style = { color: "#2563eb", opacity: 0.8, width: 3, fill: "none" as const, fillColor: "#2563eb", fillOpacity: 0.2, textSize: 24 };
    const rect = { left: 0, top: 0, width: 1080, height: 1920 };
    expect(transientGeometryForGesture(
      [{ clientX: 0, clientY: 0 }, { clientX: 2, clientY: 2 }],
      rect,
      viewport,
      "line",
      style,
    )).toBeNull();
    const candidate = transientGeometryForGesture(
      [{ clientX: 0, clientY: 0 }, { clientX: 20, clientY: 0 }],
      rect,
      viewport,
      "arrow",
      style,
    );
    expect(candidate).toEqual(createGeometryItem(
      "transient-geometry",
      "arrow",
      { type: "line", start: { x: -1920, y: 180 }, end: { x: -1920, y: 160 } },
      style,
    ));
    expect(candidate?.style).toBe(style);
  });

  it("creates one solid triangular arrowhead aligned to the start-to-end vector", () => {
    const path = arrowheadPath({ x: 10, y: 10 }, { x: 30, y: 10 }, 2);
    expect(path).not.toBeNull();
    const [tip, left, right] = path!;
    expect(tip).toEqual({ x: 30, y: 10 });
    expect(left.x).toBeLessThan(30);
    expect(right.x).toBeLessThan(30);
    expect(left.y).toBeGreaterThan(right.y);
  });

  it("draws an arrow body and filled head without a second retained stroke", () => {
    const calls: string[] = [];
    const context = {
      clearRect: () => calls.push("clear"),
      beginPath: () => calls.push("begin"),
      moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"),
      stroke: () => calls.push("stroke"),
      closePath: () => calls.push("close"),
      fill: () => calls.push("fill"),
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    };
    const item = createGeometryItem("arrow-1", "arrow", { type: "line", start: { x: 10, y: 10 }, end: { x: 100, y: 10 } }, {
      color: "#16a34a", opacity: 0.75, width: 2, fill: "none", fillColor: "#16a34a", fillOpacity: 0.18, textSize: 24,
    });
    drawScene(context, [item], 200, 100);
    expect(calls).toEqual(["clear", "begin", "move", "line", "stroke", "save", "begin", "move", "line", "line", "close", "fill", "restore"]);
    expect(context.fillStyle).toBe("#16a34a");
    expect(context.globalAlpha).toBe(1);
  });

  it("normalizes reverse drags into canonical rectangle bounds and ellipse radii", () => {
    const style = { color: "#334155", opacity: 0.92, width: 2, fill: "solid" as const, fillColor: "#f97316", fillOpacity: 0.3, textSize: 24 };
    const rect = { left: 0, top: 0, width: 100, height: 100 };
    const logicalViewport = { id: "test", origin: { x: 0, y: 0 }, logicalSize: { width: 100, height: 100 }, scaleFactor: 1, orientation: "degrees0" as const };
    const rectangle = transientGeometryForGesture(
      [{ clientX: 80, clientY: 70 }, { clientX: 20, clientY: 10 }], rect, logicalViewport, "rectangle", style,
    );
    const ellipse = transientGeometryForGesture(
      [{ clientX: 80, clientY: 70 }, { clientX: 20, clientY: 10 }], rect, logicalViewport, "ellipse", style,
    );
    expect(rectangle?.geometry).toEqual({ type: "rectangle", x: 20, y: 10, width: 60, height: 60 });
    expect(ellipse?.geometry).toEqual({ type: "ellipse", center: { x: 50, y: 40 }, radiusX: 30, radiusY: 30 });
    expect(rectangle?.style).toBe(style);
    expect(ellipse?.style).toBe(style);
  });

  it("rejects shape drags below the same logical threshold as line and arrow", () => {
    const style = { color: "#334155", opacity: 0.92, width: 2, fill: "none" as const, fillColor: "#334155", fillOpacity: 0.18, textSize: 24 };
    const logicalViewport = { id: "test", origin: { x: 0, y: 0 }, logicalSize: { width: 100, height: 100 }, scaleFactor: 1, orientation: "degrees0" as const };
    expect(transientGeometryForGesture(
      [{ clientX: 10, clientY: 10 }, { clientX: 13, clientY: 10 }],
      { left: 0, top: 0, width: 100, height: 100 },
      logicalViewport,
      "ellipse",
      style,
    )).toBeNull();
  });

  it("renders independent rectangle and ellipse fill/stroke opacity in a restored context", () => {
    const calls: string[] = [];
    const context = {
      clearRect: () => calls.push("clear"),
      beginPath: () => calls.push("begin"),
      moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"),
      rect: () => calls.push("rect"),
      ellipse: () => calls.push("ellipse"),
      stroke: () => calls.push("stroke"),
      fill: () => calls.push("fill"),
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      closePath: () => calls.push("close"),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    };
    const rectangle = createShapeItem("rectangle-1", "rectangle", { type: "rectangle", x: 0.1, y: 0.2, width: 0.4, height: 0.3 }, {
      color: "#1d4ed8", opacity: 0.8, width: 2, fill: "solid", fillColor: "#bfdbfe", fillOpacity: 0.4, textSize: 24,
    });
    const ellipse = createShapeItem("ellipse-1", "ellipse", { type: "ellipse", center: { x: 0.7, y: 0.5 }, radiusX: 0.1, radiusY: 0.2 }, {
      color: "#15803d", opacity: 0.6, width: 3, fill: "solid", fillColor: "#bbf7d0", fillOpacity: 0.15, textSize: 24,
    });
    drawScene(context, [rectangle, ellipse], 100, 100);
    expect(calls).toEqual(["clear", "save", "begin", "rect", "fill", "stroke", "restore", "save", "begin", "ellipse", "fill", "stroke", "restore"]);
    expect(context.globalAlpha).toBe(1);
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

  it("draws the transient stroke in the same frame as committed scene items", () => {
    const calls: string[] = [];
    const context = {
      clearRect: () => calls.push("clear"),
      beginPath: () => calls.push("begin"),
      moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"),
      stroke: () => calls.push("stroke"),
    };
    const transient = createStroke("transient-stroke", [{ x: 0, y: 0 }, { x: 1, y: 1 }]);

    drawScene(context, [] as SceneItem[], 800, 600, undefined, transient);

    expect(calls).toEqual(["clear", "begin", "move", "line", "stroke"]);
  });

  it("renders each retained stroke with its immutable style snapshot", () => {
    const calls: string[] = [];
    const context = {
      clearRect: () => calls.push("clear"),
      beginPath: () => calls.push("begin"),
      moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"),
      stroke: () => calls.push("stroke"),
      strokeStyle: "",
      lineWidth: 0,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    };
    const highlighter = createStroke("highlighter-1", [{ x: 0, y: 0 }, { x: 1, y: 1 }], {
      color: "#facc15",
      opacity: 0.35,
      width: 12,
      fill: "none",
      fillColor: "#facc15",
      fillOpacity: 0.18,
      textSize: 24,
    }, "highlighter");

    drawScene(context, [highlighter], 800, 600);

    expect(context.strokeStyle).toBe("#facc15");
    expect(context.lineWidth).toBe(12);
    expect(context.globalCompositeOperation).toBe("source-over");
    expect(calls).toEqual(["clear", "begin", "move", "line", "stroke"]);
  });
});

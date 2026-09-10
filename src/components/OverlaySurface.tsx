import type { OverlayMode, SceneItem, StrokePoint, StrokeSceneItem } from "../types/overlay";

export type PointerSample = { clientX: number; clientY: number };
export type SurfaceRect = { left: number; top: number; width: number; height: number };

export function normalizePointerPath(_samples: readonly PointerSample[], _rect: SurfaceRect): StrokePoint[] {
  return [];
}

export function createStroke(id: string, points: readonly StrokePoint[]): StrokeSceneItem {
  return { id, kind: "stroke", points };
}

export function appendStroke(scene: readonly SceneItem[], stroke: StrokeSceneItem): readonly SceneItem[] {
  return scene.some((item) => item.id === stroke.id) ? scene : [...scene, stroke];
}

export function canvasPointerEvents(_mode: OverlayMode): "auto" | "none" {
  return "none";
}

export function drawScene(
  context: Pick<CanvasRenderingContext2D, "clearRect" | "beginPath" | "moveTo" | "lineTo" | "stroke">,
  _scene: readonly SceneItem[],
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
}

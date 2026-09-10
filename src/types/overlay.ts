export const OVERLAY_MODES = ["Hidden", "VisibleInteractive", "VisibleClickThrough"] as const;
export type OverlayMode = (typeof OVERLAY_MODES)[number];

export const SHORTCUT_ACTIONS = [
  "Show",
  "Hide",
  "ToggleVisibility",
  "ToggleClickThrough",
  "Esc",
  "Retry",
] as const;
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export type StrokePoint = { x: number; y: number };
export type CanonicalPoint = StrokePoint;
export type DisplayOrientation = "degrees0" | "degrees90" | "degrees180" | "degrees270";
export type DisplayViewport = {
  id: string;
  origin: CanonicalPoint;
  logicalSize: { width: number; height: number };
  scaleFactor: number;
  orientation: DisplayOrientation;
};
export type StrokeSceneItem = { id: string; kind: "stroke"; points: readonly StrokePoint[] };
export type SceneItem = StrokeSceneItem | { id: string; kind: "shape" | "text" };
export type ModeEffect = "show" | "hide" | "interactive" | "click-through" | "retry";

export type ModeState = {
  mode: OverlayMode;
  scene: readonly SceneItem[];
  effects: readonly ModeEffect[];
};

export type OverlayModeEvent = { mode: OverlayMode; sceneId?: string };

export const initialModeState = (): ModeState => ({ mode: "Hidden", scene: [], effects: [] });

export function transition(state: ModeState, action: ShortcutAction): ModeState {
  switch (action) {
    case "Show":
    case "ToggleVisibility":
      return state.mode === "Hidden"
        ? { ...state, mode: "VisibleInteractive", effects: ["show", "interactive"] }
        : state;
    case "Hide":
    case "Esc":
      return state.mode === "Hidden" ? state : { ...state, mode: "Hidden", effects: ["hide"] };
    case "ToggleClickThrough":
      return state.mode === "VisibleInteractive"
        ? { ...state, mode: "VisibleClickThrough", effects: ["click-through"] }
        : state.mode === "VisibleClickThrough"
          ? { ...state, mode: "VisibleInteractive", effects: ["interactive"] }
          : state;
    case "Retry":
      return { ...state, effects: ["retry"] };
  }
}

export function addSceneItem(state: ModeState, item: SceneItem): ModeState {
  return state.scene.some((existing) => existing.id === item.id)
    ? state
    : { ...state, scene: [...state.scene, item] };
}

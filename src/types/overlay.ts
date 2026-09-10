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
export type SceneSnapshot = { sceneId: string; items: readonly SceneItem[] };
export type SceneEventPayload = SceneSnapshot & {
  /** The viewport that originated a local scene commit, when supplied by native. */
  displayId?: string;
};
export type ViewportEventPayload = DisplayViewport & { sceneId?: string };
export type SerializedDisplayViewport = {
  displayId: string;
  origin: CanonicalPoint;
  logicalSize: { width: number; height: number };
  scaleFactor: number;
  rotation: DisplayOrientation;
  sceneId: string;
};
export type DisplaySceneEventPayload = SerializedDisplayViewport & { items: readonly SceneItem[] };
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

export function isDisplayOrientation(value: unknown): value is DisplayOrientation {
  return value === "degrees0" || value === "degrees90" || value === "degrees180" || value === "degrees270";
}

export function isDisplayViewport(value: unknown): value is DisplayViewport {
  if (!value || typeof value !== "object") return false;
  const viewport = value as Partial<DisplayViewport>;
  const origin = viewport.origin;
  const logicalSize = viewport.logicalSize;
  const scaleFactor = viewport.scaleFactor;
  return typeof viewport.id === "string"
    && origin !== undefined
    && Number.isFinite(origin.x)
    && Number.isFinite(origin.y)
    && logicalSize !== undefined
    && Number.isFinite(logicalSize.width)
    && Number.isFinite(logicalSize.height)
    && logicalSize.width > 0
    && logicalSize.height > 0
    && scaleFactor !== undefined
    && Number.isFinite(scaleFactor)
    && scaleFactor > 0
    && isDisplayOrientation(viewport.orientation);
}

/** Accept the native Rust field names and the stable wire aliases used by newer clients. */
export function normalizeDisplayViewport(value: unknown): DisplayViewport | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const origin = raw.origin;
  const logicalSize = raw.logicalSize;
  const id = raw.id ?? raw.displayId;
  const orientation = raw.orientation ?? raw.rotation;
  const normalized = { id, origin, logicalSize, scaleFactor: raw.scaleFactor, orientation };
  return isDisplayViewport(normalized) ? normalized : null;
}

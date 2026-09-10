import schema from "../types/mode-schema.json";
import { describe, expect, it } from "vitest";
import {
  OVERLAY_MODES,
  SHORTCUT_ACTIONS,
  addSceneItem,
  initialModeState,
  transition,
} from "./overlay";
import { createStroke } from "../components/OverlaySurface";

describe("overlay mode reducer", () => {
  it("shows interactively from Hidden and emits one activation effect", () => {
    const next = transition(initialModeState(), "ToggleVisibility");
    expect(next.mode).toBe("VisibleInteractive");
    expect(next.effects).toEqual(["show", "interactive"]);
  });

  it("toggles click-through without changing the scene", () => {
    const visible = transition(initialModeState(), "Show");
    const withScene = addSceneItem(visible, createStroke("phase1-sentinel", [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }]));
    const next = transition(withScene, "ToggleClickThrough");
    expect(next.mode).toBe("VisibleClickThrough");
    expect(next.scene).toEqual(withScene.scene);
  });

  it("preserves the retained sentinel across emergency hide and Show", () => {
    const sentinel = createStroke("phase1-sentinel", [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }]);
    const withScene = addSceneItem(transition(initialModeState(), "Show"), sentinel);
    const hidden = transition(withScene, "Esc");
    const restored = transition(hidden, "Show");
    expect(hidden.mode).toBe("Hidden");
    expect(restored.mode).toBe("VisibleInteractive");
    expect(restored.scene).toContainEqual(sentinel);
  });

  it("is idempotent for repeated current transitions", () => {
    const hidden = initialModeState();
    expect(transition(hidden, "Esc")).toBe(hidden);
    const visible = transition(hidden, "Show");
    expect(transition(visible, "Show")).toBe(visible);
  });

  it("matches the canonical serialized schema", () => {
    expect([...OVERLAY_MODES]).toEqual(schema.modes);
    expect([...SHORTCUT_ACTIONS]).toEqual(schema.actions);
  });
});

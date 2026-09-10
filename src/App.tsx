import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ModeBadge } from "./components/ModeBadge";
import { SettingsPanel } from "./components/SettingsPanel";
import { ErrorBadge } from "./components/ErrorBadge";
import { OverlaySurface } from "./components/OverlaySurface";
import { normalizeDisplayViewport } from "./types/overlay";
import type { DisplayViewport, OverlayMode, SceneEventPayload, SceneItem, SceneSnapshot, StrokeSceneItem } from "./types/overlay";

const DEFAULT_VIEWPORT: DisplayViewport = {
  id: "default",
  origin: { x: 0, y: 0 },
  logicalSize: { width: 1, height: 1 },
  scaleFactor: 1,
  orientation: "degrees0",
};

export default function App() {
  const windowLabel = getCurrentWindow().label;
  const isSettingsWindow = windowLabel === "settings";
  const [mode, setMode] = useState<OverlayMode>("Hidden");
  const [scene, setScene] = useState<readonly SceneItem[]>([]);
  const [sceneId, setSceneId] = useState("webview-scene");
  const [viewport, setViewport] = useState<DisplayViewport>(DEFAULT_VIEWPORT);

  useEffect(() => {
    if (isSettingsWindow) return;
    let disposeMode: (() => void) | undefined;
    let disposeViewport: (() => void) | undefined;
    let disposeScene: (() => void) | undefined;
    void invoke<SceneSnapshot>("get_scene_snapshot").then((snapshot) => {
      setSceneId(snapshot.sceneId);
      setScene(snapshot.items);
    }).catch(() => undefined);
    void listen<OverlayMode>("overlay-mode-changed", (event) => setMode(event.payload)).then((unlisten) => { disposeMode = unlisten; });
    void listen<unknown>("overlay-viewport-changed", (event) => {
      const next = normalizeDisplayViewport(event.payload);
      if (next) setViewport(next);
    }).then((unlisten) => { disposeViewport = unlisten; });
    void listen<SceneEventPayload>("scene-changed", (event) => {
      const payload = event.payload;
      if (payload && Array.isArray(payload.items)) {
        setSceneId(payload.sceneId);
        setScene(payload.items);
      }
    }).then((unlisten) => { disposeScene = unlisten; });
    return () => { disposeMode?.(); disposeViewport?.(); disposeScene?.(); };
  }, [isSettingsWindow]);

  const commitStroke = (stroke: StrokeSceneItem) => {
    void invoke<SceneSnapshot>("commit_scene_item", { item: stroke })
      .then((snapshot) => {
        setSceneId(snapshot.sceneId);
        setScene(snapshot.items);
      });
  };

  const sceneIds = scene.map((item) => item.id).join(",");

  return (
    <main
      aria-label={isSettingsWindow ? "nABrush settings" : "nABrush overlay"}
      data-mode={mode}
      data-window-label={windowLabel}
      data-scene-count={!isSettingsWindow ? scene.length : undefined}
      data-scene-ids={!isSettingsWindow ? sceneIds : undefined}
      data-scene-id={!isSettingsWindow ? sceneId : undefined}
      {...(!isSettingsWindow ? { "data-overlay-surface": "loaded" } : {})}
    >
      {isSettingsWindow ? (
        <SettingsPanel />
      ) : (
        <>
          <OverlaySurface mode={mode} scene={scene} viewport={viewport} onCommitStroke={commitStroke} />
          {mode === "VisibleInteractive" ? <span aria-label="Drawing mode" /> : null}
          <ModeBadge mode={mode} viewport={viewport} />
          <ErrorBadge mode={mode} viewport={viewport} />
        </>
      )}
    </main>
  );
}

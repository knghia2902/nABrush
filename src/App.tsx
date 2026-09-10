import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ModeBadge } from "./components/ModeBadge";
import { SettingsPanel } from "./components/SettingsPanel";
import { ErrorBadge } from "./components/ErrorBadge";
import { OverlaySurface } from "./components/OverlaySurface";
import { addSceneItem } from "./state/overlay";
import type { DisplayViewport, OverlayMode, SceneItem, StrokeSceneItem } from "./types/overlay";

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
  const [viewport, setViewport] = useState<DisplayViewport>(DEFAULT_VIEWPORT);

  useEffect(() => {
    let disposeMode: (() => void) | undefined;
    let disposeViewport: (() => void) | undefined;
    void listen<OverlayMode>("overlay-mode-changed", (event) => setMode(event.payload)).then((unlisten) => { disposeMode = unlisten; });
    void listen<DisplayViewport>("overlay-viewport-changed", (event) => setViewport(event.payload)).then((unlisten) => { disposeViewport = unlisten; });
    return () => { disposeMode?.(); disposeViewport?.(); };
  }, []);

  const commitStroke = (stroke: StrokeSceneItem) => {
    setScene((current) => addSceneItem({ mode, scene: current, effects: [] }, stroke).scene);
  };

  const sceneIds = scene.map((item) => item.id).join(",");

  return (
    <main
      aria-label={isSettingsWindow ? "nABrush settings" : "nABrush overlay"}
      data-mode={mode}
      data-window-label={windowLabel}
      data-scene-count={!isSettingsWindow ? scene.length : undefined}
      data-scene-ids={!isSettingsWindow ? sceneIds : undefined}
      {...(!isSettingsWindow ? { "data-overlay-surface": "loaded" } : {})}
    >
      {isSettingsWindow ? (
        <SettingsPanel />
      ) : (
        <>
          <OverlaySurface mode={mode} scene={scene} viewport={viewport} onCommitStroke={commitStroke} />
          {mode === "VisibleInteractive" ? <span aria-label="Drawing mode" /> : null}
          <ModeBadge mode={mode} />
          <ErrorBadge />
        </>
      )}
    </main>
  );
}

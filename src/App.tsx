import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ModeBadge } from "./components/ModeBadge";
import { SettingsPanel } from "./components/SettingsPanel";
import { ErrorBadge } from "./components/ErrorBadge";
import { OverlaySurface } from "./components/OverlaySurface";
import { addSceneItem } from "./state/overlay";
import type { OverlayMode, SceneItem, StrokeSceneItem } from "./types/overlay";

export default function App() {
  const windowLabel = getCurrentWindow().label;
  const isSettingsWindow = windowLabel === "settings";
  const [mode, setMode] = useState<OverlayMode>("Hidden");
  const [scene, setScene] = useState<readonly SceneItem[]>([]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    void listen<OverlayMode>("overlay-mode-changed", (event) => {
      setMode(event.payload);
    }).then((unlisten) => {
      dispose = unlisten;
    });
    return () => dispose?.();
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
          <OverlaySurface mode={mode} scene={scene} onCommitStroke={commitStroke} />
          {mode === "VisibleInteractive" ? <span aria-label="Drawing mode" /> : null}
          <ModeBadge mode={mode} />
          <ErrorBadge />
        </>
      )}
    </main>
  );
}

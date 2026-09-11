import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ModeBadge } from "./components/ModeBadge";
import { SettingsPanel } from "./components/SettingsPanel";
import { ErrorBadge } from "./components/ErrorBadge";
import { OverlaySurface } from "./components/OverlaySurface";
import { AnnotationToolbar } from "./components/AnnotationToolbar";
import {
  createInitialAnnotationState,
  selectAnnotationTool,
  textDraftTransition,
  updateToolStyle,
} from "./state/annotation";
import { DEFAULT_PEN_STYLE, normalizeDisplayViewport } from "./types/overlay";
import type { AnnotationStyle, AnnotationTool, DisplayViewport, OverlayMode, SceneEventPayload, SceneItem, SceneSnapshot } from "./types/overlay";

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
  const [annotationState, setAnnotationState] = useState(createInitialAnnotationState);
  const [propertyOpen, setPropertyOpen] = useState(false);

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
    void invoke<{ mode: OverlayMode; viewport?: unknown }>("get_overlay_bootstrap_state")
      .then((bootstrap) => {
        setMode(bootstrap.mode);
        const nextViewport = normalizeDisplayViewport(bootstrap.viewport);
        if (nextViewport) setViewport(nextViewport);
      })
      .catch(() => undefined);
    return () => { disposeMode?.(); disposeViewport?.(); disposeScene?.(); };
  }, [isSettingsWindow, windowLabel]);

  const commitSceneItem = (item: SceneItem) => {
    void invoke<SceneSnapshot>("commit_scene_item", { item })
      .then((snapshot) => {
        setSceneId(snapshot.sceneId);
        setScene(snapshot.items);
      });
  };

  const placeTextDraft = (anchor: { x: number; y: number }, style: AnnotationStyle) => {
    setAnnotationState((state) => ({
      ...state,
      textDraft: textDraftTransition(state.textDraft, { type: "place", anchor, style }),
    }));
  };
  const updateTextDraft = (value: string) => {
    setAnnotationState((state) => ({
      ...state,
      textDraft: textDraftTransition(state.textDraft, { type: "update", value }),
    }));
  };
  const cancelTextDraft = () => {
    setAnnotationState((state) => state.textDraft ? { ...state, textDraft: null } : state);
  };
  const eraseSceneItem = (id: string) => {
    void invoke<SceneSnapshot>("erase_scene_item", { id })
      .then((snapshot) => {
        setSceneId(snapshot.sceneId);
        setScene(snapshot.items);
      });
  };

  const activeTool = annotationState.activeTool;
  const toolStyle = annotationState.stylesByTool[activeTool];
  const selectTool = (tool: AnnotationTool) => {
    setAnnotationState((state) => selectAnnotationTool(state, tool));
  };
  const updateActiveToolStyle = (patch: Partial<AnnotationStyle>) => {
    setAnnotationState((state) => updateToolStyle(state, state.activeTool, patch));
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
          <OverlaySurface
            mode={mode}
            scene={scene}
            viewport={viewport}
            activeTool={activeTool}
            toolStyle={toolStyle ?? DEFAULT_PEN_STYLE}
            textDraft={annotationState.textDraft}
            onPlaceTextDraft={placeTextDraft}
            onUpdateTextDraft={updateTextDraft}
            onCancelTextDraft={cancelTextDraft}
            onCommitSceneItem={commitSceneItem}
            onEraseSceneItem={eraseSceneItem}
          />
          {mode === "VisibleInteractive" ? (
            <AnnotationToolbar
              activeTool={activeTool}
              toolStyle={toolStyle ?? DEFAULT_PEN_STYLE}
              propertyOpen={propertyOpen}
              onSelectTool={selectTool}
              onToggleProperties={() => setPropertyOpen((open) => !open)}
              onUpdateStyle={updateActiveToolStyle}
            />
          ) : null}
          {mode === "VisibleInteractive" ? <span aria-label="Drawing mode" /> : null}
          <ModeBadge mode={mode} viewport={viewport} />
          <ErrorBadge mode={mode} viewport={viewport} />
        </>
      )}
    </main>
  );
}

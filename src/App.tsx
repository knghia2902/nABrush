import { useCallback, useEffect, useRef, useState } from "react";
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
  lifecycleSnapshotFor,
  selectAnnotationTool,
  selectLifecycleMode,
  setVanishingDuration,
  textDraftTransition,
  updateToolStyle,
} from "./state/annotation";
import { DEFAULT_PEN_STYLE, historyActionForShortcut, normalizeDisplayViewport } from "./types/overlay";
import type { AnnotationLifecycleMode, AnnotationLifecycleSnapshot, AnnotationStyle, AnnotationTool, DisplayViewport, OverlayMode, SceneEventPayload, SceneItem, SceneSnapshot } from "./types/overlay";

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
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const appliedSceneRevisionRef = useRef<{ sceneId: string; revision: number } | null>(null);
  const [viewport, setViewport] = useState<DisplayViewport>(DEFAULT_VIEWPORT);
  const [annotationState, setAnnotationState] = useState(createInitialAnnotationState);
  const [propertyOpen, setPropertyOpen] = useState(false);

  const applySceneSnapshot = useCallback((snapshot: SceneSnapshot) => {
    const applied = appliedSceneRevisionRef.current;
    const revisionValue = (snapshot as SceneSnapshot & { revision?: number }).revision;
    const revision = Number.isSafeInteger(revisionValue) ? revisionValue! : null;
    if (applied?.sceneId === snapshot.sceneId) {
      // A legacy/unversioned reply must not replace a versioned snapshot already
      // applied by this overlay, and delayed events/replies cannot move it back.
      if (revision === null && applied.revision >= 0) return;
      if (revision !== null && revision < applied.revision) return;
    }
    if (revision !== null) {
      appliedSceneRevisionRef.current = { sceneId: snapshot.sceneId, revision };
    } else if (applied?.sceneId !== snapshot.sceneId) {
      appliedSceneRevisionRef.current = { sceneId: snapshot.sceneId, revision: -1 };
    }
    setSceneId(snapshot.sceneId);
    setScene(snapshot.items);
    setCanUndo(snapshot.canUndo === true);
    setCanRedo(snapshot.canRedo === true);
  }, []);

  useEffect(() => {
    if (isSettingsWindow) return;
    let disposeMode: (() => void) | undefined;
    let disposeViewport: (() => void) | undefined;
    let disposeScene: (() => void) | undefined;
    void invoke<SceneSnapshot>("get_scene_snapshot").then((snapshot) => {
      applySceneSnapshot(snapshot);
    }).catch(() => undefined);
    void listen<OverlayMode>("overlay-mode-changed", (event) => setMode(event.payload)).then((unlisten) => { disposeMode = unlisten; });
    void listen<unknown>("overlay-viewport-changed", (event) => {
      const next = normalizeDisplayViewport(event.payload);
      if (next) setViewport(next);
    }).then((unlisten) => { disposeViewport = unlisten; });
    void listen<SceneEventPayload>("scene-changed", (event) => {
      const payload = event.payload;
      if (payload && Array.isArray(payload.items)) {
        applySceneSnapshot(payload);
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
  }, [applySceneSnapshot, isSettingsWindow, windowLabel]);

  useEffect(() => {
    if (isSettingsWindow) return;
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement
        && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"))) return;
      const action = historyActionForShortcut(event, navigator.platform.toLowerCase().includes("mac"));
      if (!action) return;
      event.preventDefault();
      const command = action === "undo" ? "undo_scene" : "redo_scene";
      void invoke<SceneSnapshot>(command).then(applySceneSnapshot).catch(() => undefined);
    };
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [applySceneSnapshot, isSettingsWindow]);

  const commitSceneItem = (item: SceneItem) => {
    return invoke<SceneSnapshot>("commit_scene_item", { item })
      .then(applySceneSnapshot);
  };

  const moveTextItem = (id: string, anchor: { x: number; y: number }) => {
    void invoke<SceneSnapshot>("move_text_scene_item", { id, anchor })
      .then(applySceneSnapshot);
  };

  const placeTextDraft = (anchor: { x: number; y: number }, style: AnnotationStyle, lifecycle: AnnotationLifecycleSnapshot) => {
    setAnnotationState((state) => ({
      ...state,
      textDraft: textDraftTransition(state.textDraft, { type: "place", anchor, style, lifecycle }),
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
      .then(applySceneSnapshot);
  };

  const runSceneCommand = (command: "undo_scene" | "redo_scene" | "clear_scene") => {
    void invoke<SceneSnapshot>(command).then(applySceneSnapshot).catch(() => undefined);
  };

  const activeTool = annotationState.activeTool;
  const toolStyle = annotationState.stylesByTool[activeTool];
  const selectTool = (tool: AnnotationTool) => {
    setAnnotationState((state) => selectAnnotationTool(state, tool));
  };
  const updateActiveToolStyle = (patch: Partial<AnnotationStyle>) => {
    setAnnotationState((state) => updateToolStyle(state, state.activeTool, patch));
  };
  const changeLifecycleMode = (lifecycleMode: AnnotationLifecycleMode) => {
    setAnnotationState((state) => selectLifecycleMode(state, lifecycleMode));
  };
  const changeVanishingDuration = (durationSeconds: number) => {
    setAnnotationState((state) => setVanishingDuration(state, durationSeconds));
  };
  const lifecycleSnapshot = lifecycleSnapshotFor(annotationState);

  const sceneIds = scene.map((item) => item.id).join(",");
  const sceneLifecycles = JSON.stringify(scene.map((item) => ({
    id: item.id,
    lifecycle: item.lifecycle ?? { mode: "persistent" },
  })));

  return (
    <main
      aria-label={isSettingsWindow ? "nABrush settings" : "nABrush overlay"}
      data-mode={mode}
      data-window-label={windowLabel}
      data-scene-count={!isSettingsWindow ? scene.length : undefined}
      data-scene-ids={!isSettingsWindow ? sceneIds : undefined}
      data-scene-lifecycles={!isSettingsWindow ? sceneLifecycles : undefined}
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
            lifecycleSnapshot={lifecycleSnapshot}
            textDraft={annotationState.textDraft}
            onPlaceTextDraft={placeTextDraft}
            onUpdateTextDraft={updateTextDraft}
            onCancelTextDraft={cancelTextDraft}
            onCommitSceneItem={commitSceneItem}
            onMoveTextItem={moveTextItem}
            onEraseSceneItem={eraseSceneItem}
          />
          {mode === "VisibleInteractive" ? (
            <AnnotationToolbar
              activeTool={activeTool}
              toolStyle={toolStyle ?? DEFAULT_PEN_STYLE}
              lifecycleMode={annotationState.lifecycleMode}
              vanishingDurationSeconds={annotationState.vanishingDurationSeconds}
              canUndo={canUndo}
              canRedo={canRedo}
              canClear={scene.length > 0}
              propertyOpen={propertyOpen}
              onSelectTool={selectTool}
              onToggleProperties={() => setPropertyOpen((open) => !open)}
              onUpdateStyle={updateActiveToolStyle}
              onToggleLifecycleMode={() => changeLifecycleMode(annotationState.lifecycleMode === "persistent" ? "vanishing" : "persistent")}
              onSetVanishingDuration={changeVanishingDuration}
              onUndo={() => runSceneCommand("undo_scene")}
              onRedo={() => runSceneCommand("redo_scene")}
              onClearAll={() => runSceneCommand("clear_scene")}
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

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ModeBadge } from "./components/ModeBadge";
import { SettingsPanel } from "./components/SettingsPanel";
import { ErrorBadge } from "./components/ErrorBadge";
import { OverlaySurface } from "./components/OverlaySurface";
import {
  TOOL_ORDER,
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

const TOOL_LABELS: Record<AnnotationTool, string> = {
  pen: "Pen",
  highlighter: "Highlighter",
  line: "Line",
  arrow: "Arrow",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  text: "Text",
  eraser: "Eraser",
};

type AnnotationToolbarProps = {
  activeTool: AnnotationTool;
  toolStyle: AnnotationStyle;
  propertyOpen: boolean;
  onSelectTool: (tool: AnnotationTool) => void;
  onToggleProperties: () => void;
  onUpdateStyle: (patch: Partial<AnnotationStyle>) => void;
};

function AnnotationToolbar({
  activeTool,
  toolStyle,
  propertyOpen,
  onSelectTool,
  onToggleProperties,
  onUpdateStyle,
}: AnnotationToolbarProps) {
  const supportsFill = activeTool === "rectangle" || activeTool === "ellipse";
  const supportsTextSize = activeTool === "text";

  return (
    <>
      <nav className="annotation-toolbar" aria-label="Annotation tools" data-annotation-toolbar="true" data-scene-excluded="true">
        <div className="annotation-toolbar__tools">
          {TOOL_ORDER.map((tool) => (
            <button
              key={tool}
              type="button"
              className="annotation-toolbar__tool"
              aria-label={TOOL_LABELS[tool]}
              aria-pressed={activeTool === tool}
              data-tool={tool}
              onClick={() => onSelectTool(tool)}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
          <button
            type="button"
            className="annotation-toolbar__properties"
            aria-label="Tool properties"
            aria-expanded={propertyOpen}
            aria-controls="annotation-property-popover"
            onClick={onToggleProperties}
          >
            ⚙
          </button>
        </div>
      </nav>
      {propertyOpen ? (
        <section
          id="annotation-property-popover"
          className="property-popover"
          aria-label={`${TOOL_LABELS[activeTool]} properties`}
          data-property-popover="true"
          data-active-tool={activeTool}
          data-scene-excluded="true"
        >
          <label>
            Color
            <input type="color" value={toolStyle.color} onChange={(event) => onUpdateStyle({ color: event.target.value })} data-style-control="color" />
          </label>
          <label>
            Opacity
            <input type="range" min="0" max="1" step="0.01" value={toolStyle.opacity} onChange={(event) => onUpdateStyle({ opacity: Number(event.target.value) })} data-style-control="opacity" />
          </label>
          <label>
            Width
            <input type="range" min="0.5" max="128" step="0.5" value={toolStyle.width} onChange={(event) => onUpdateStyle({ width: Number(event.target.value) })} data-style-control="width" />
          </label>
          {supportsFill ? (
            <label>
              Fill
              <select value={toolStyle.fill} onChange={(event) => onUpdateStyle({ fill: event.target.value as AnnotationStyle["fill"] })} data-style-control="fill">
                <option value="none">None</option>
                <option value="solid">Solid</option>
              </select>
            </label>
          ) : null}
          {supportsTextSize ? (
            <label>
              Text size
              <input type="range" min="8" max="256" step="1" value={toolStyle.textSize} onChange={(event) => onUpdateStyle({ textSize: Number(event.target.value) })} data-style-control="textSize" />
            </label>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

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
    setAnnotationState((state) => ({ ...state, textDraft: null }));
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
          <AnnotationToolbar
            activeTool={activeTool}
            toolStyle={toolStyle ?? DEFAULT_PEN_STYLE}
            propertyOpen={propertyOpen}
            onSelectTool={selectTool}
            onToggleProperties={() => setPropertyOpen((open) => !open)}
            onUpdateStyle={updateActiveToolStyle}
          />
          {mode === "VisibleInteractive" ? <span aria-label="Drawing mode" /> : null}
          <ModeBadge mode={mode} viewport={viewport} />
          <ErrorBadge mode={mode} viewport={viewport} />
        </>
      )}
    </main>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  MAX_VANISHING_DURATION_SECONDS,
  MIN_VANISHING_DURATION_SECONDS,
  VANISHING_DURATION_PRESETS,
} from "../types/overlay";
import type { AnnotationLifecycleMode, AnnotationStyle, AnnotationTool } from "../types/overlay";
import { TOOL_ORDER } from "../state/annotation";

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

type ToolbarIconName = AnnotationTool | "move" | "undo" | "redo" | "clear" | "properties" | "lifecycle";

function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  const icon = (() => {
    switch (name) {
      case "move":
        return <g fill="currentColor" stroke="none"><circle cx="8" cy="5" r="1.25" /><circle cx="16" cy="5" r="1.25" /><circle cx="8" cy="12" r="1.25" /><circle cx="16" cy="12" r="1.25" /><circle cx="8" cy="19" r="1.25" /><circle cx="16" cy="19" r="1.25" /></g>;
      case "pen":
        return <><path d="m4.5 19.5 4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.7 15.6l-1.2 3.9Z" /><path d="m13.8 7.5 3 3" /></>;
      case "highlighter":
        return <><path d="m5 14.5 8.8-8.8 5.5 5.5-8.8 8.8H5v-5.5Z" /><path d="m11.8 7.7 5.5 5.5M4 21h16" /></>;
      case "line":
        return <path d="M5 19 19 5" />;
      case "arrow":
        return <path d="M4.5 12h15m-6-6 6 6-6 6" />;
      case "rectangle":
        return <rect x="5" y="6" width="14" height="12" rx="1.75" />;
      case "ellipse":
        return <ellipse cx="12" cy="12" rx="7.5" ry="5.75" />;
      case "text":
        return <path d="M5.5 6h13M12 6v13m-3.5 0h7" />;
      case "eraser":
        return <><path d="m8.1 19.5-3.3-3.3a2 2 0 0 1 0-2.8l6.8-6.8a2 2 0 0 1 2.8 0l4.7 4.7a2 2 0 0 1 0 2.8l-5.4 5.4H8.1Z" /><path d="m7.4 11.2 6.1 6.1M13.8 19.5H21" /></>;
      case "undo":
        return <><path d="m9 7-4 4 4 4" /><path d="M5 11h8a5 5 0 0 1 0 10h-1" /></>;
      case "redo":
        return <><path d="m15 7 4 4-4 4" /><path d="M19 11h-8a5 5 0 0 0 0 10h1" /></>;
      case "clear":
        return <><path d="M4.5 7h15m-10-2.5h5V7m-8 0 .9 13h10.2l.9-13" /><path d="M10 10.5v6m4-6v6" /></>;
      case "properties":
        return <><circle cx="12" cy="12" r="3" /><path d="M12 3.75v2m0 12.5v2m8.25-8.25h-2m-12.5 0h-2m14.09-5.84-1.42 1.42m-8.84 8.84-1.42 1.42m11.68 0-1.42-1.42m-8.84-8.84L6.16 6.16" /></>;
      case "lifecycle":
        return <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.25 2" /></>;
    }
  })();

  return (
    <svg
      aria-hidden="true"
      className="annotation-toolbar__icon"
      focusable="false"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon}
    </svg>
  );
}

export const TOOLBAR_MARGIN = 16;
export const TOOLBAR_KEYBOARD_STEP = 8;
export const TOOLBAR_KEYBOARD_SHIFT_STEP = 32;

export type ToolbarPosition = { left: number; top: number };

/** Keep the toolbar's measured bounding box within the viewport when possible. */
export function clampToolbarPosition(
  viewportWidth: number,
  viewportHeight: number,
  toolbarWidth: number,
  toolbarHeight: number,
  margin: number,
  candidateLeft: number,
  candidateTop: number,
): ToolbarPosition {
  if (![viewportWidth, viewportHeight, toolbarWidth, toolbarHeight, margin, candidateLeft, candidateTop].every(Number.isFinite)) {
    return { left: 0, top: 0 };
  }

  const safeMargin = Math.max(0, margin);
  const clampAxis = (candidate: number, viewport: number, size: number) => {
    const safeViewport = Math.max(0, viewport);
    const safeSize = Math.max(0, size);
    const available = Math.max(0, safeViewport - safeSize);
    const min = Math.min(safeMargin, available);
    const max = Math.max(min, safeViewport - safeSize - safeMargin);
    return Math.min(max, Math.max(min, candidate));
  };

  return {
    left: clampAxis(candidateLeft, viewportWidth, toolbarWidth),
    top: clampAxis(candidateTop, viewportHeight, toolbarHeight),
  };
}

export function moveToolbarPosition(
  position: ToolbarPosition,
  key: string,
  shiftKey: boolean,
  viewportWidth: number,
  viewportHeight: number,
  toolbarWidth: number,
  toolbarHeight: number,
  margin = TOOLBAR_MARGIN,
): ToolbarPosition {
  const step = shiftKey ? TOOLBAR_KEYBOARD_SHIFT_STEP : TOOLBAR_KEYBOARD_STEP;
  let left = position.left;
  let top = position.top;
  if (key === "ArrowLeft") left -= step;
  if (key === "ArrowRight") left += step;
  if (key === "ArrowUp") top -= step;
  if (key === "ArrowDown") top += step;
  return clampToolbarPosition(viewportWidth, viewportHeight, toolbarWidth, toolbarHeight, margin, left, top);
}

export type AnnotationToolbarProps = {
  activeTool: AnnotationTool;
  toolStyle: AnnotationStyle;
  lifecycleMode: AnnotationLifecycleMode;
  vanishingDurationSeconds: number;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  propertyOpen: boolean;
  onSelectTool: (tool: AnnotationTool) => void;
  onToggleProperties: () => void;
  onUpdateStyle: (patch: Partial<AnnotationStyle>) => void;
  onToggleLifecycleMode: () => void;
  onSetVanishingDuration: (durationSeconds: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
};

type DragState = { pointerId: number; offsetX: number; offsetY: number };

function viewportSize() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function AnnotationToolbar({
  activeTool,
  toolStyle,
  lifecycleMode,
  vanishingDurationSeconds,
  canUndo,
  canRedo,
  canClear,
  propertyOpen,
  onSelectTool,
  onToggleProperties,
  onUpdateStyle,
  onToggleLifecycleMode,
  onSetVanishingDuration,
  onUndo,
  onRedo,
  onClearAll,
}: AnnotationToolbarProps) {
  const toolbarRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const propertiesButtonRef = useRef<HTMLButtonElement>(null);
  const propertiesPanelRef = useRef<HTMLElement>(null);
  const lifecycleButtonRef = useRef<HTMLButtonElement>(null);
  const lifecyclePanelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointerSequenceRef = useRef(false);
  const mouseFallbackActiveRef = useRef(false);
  const suppressMouseUpRef = useRef(false);
  const syntheticPointerDispatchRef = useRef(false);
  const positionRef = useRef<ToolbarPosition>({ left: TOOLBAR_MARGIN, top: TOOLBAR_MARGIN });
  const [position, setPosition] = useState<ToolbarPosition>(positionRef.current);
  const [propertiesPosition, setPropertiesPosition] = useState<ToolbarPosition>({ left: TOOLBAR_MARGIN + 64, top: TOOLBAR_MARGIN });
  const [lifecyclePosition, setLifecyclePosition] = useState<ToolbarPosition>({ left: TOOLBAR_MARGIN + 64, top: TOOLBAR_MARGIN });
  const [dragging, setDragging] = useState(false);

  const toolbarSize = useCallback(() => {
    const rect = toolbarRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }, []);

  const setClampedPosition = useCallback((candidate: ToolbarPosition, measured = toolbarSize()) => {
    const viewport = viewportSize();
    const next = clampToolbarPosition(
      viewport.width,
      viewport.height,
      measured.width,
      measured.height,
      TOOLBAR_MARGIN,
      candidate.left,
      candidate.top,
    );
    positionRef.current = next;
    setPosition((current) => current.left === next.left && current.top === next.top ? current : next);
  }, [toolbarSize]);

  const reClampPosition = useCallback(() => {
    setClampedPosition(positionRef.current);
  }, [setClampedPosition]);

  const clampPanelPosition = useCallback((
    panel: HTMLElement | null,
    anchor: HTMLElement | null,
  ): ToolbarPosition | null => {
    if (!panel || !anchor) return null;
    const bounds = panel.getBoundingClientRect();
    const anchorBounds = anchor.getBoundingClientRect();
    return clampToolbarPosition(
      window.innerWidth,
      window.innerHeight,
      bounds.width,
      bounds.height,
      TOOLBAR_MARGIN,
      anchorBounds.right + 8,
      anchorBounds.top,
    );
  }, []);

  const repositionPanels = useCallback(() => {
    if (propertyOpen) {
      const next = clampPanelPosition(propertiesPanelRef.current, propertiesButtonRef.current);
      if (next) setPropertiesPosition(next);
    }
    if (lifecycleMode === "vanishing") {
      const next = clampPanelPosition(lifecyclePanelRef.current, lifecycleButtonRef.current);
      if (next) setLifecyclePosition(next);
    }
  }, [clampPanelPosition, lifecycleMode, propertyOpen]);

  const finishDrag = useCallback((pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return;
    dragRef.current = null;
    setDragging(false);
    pointerSequenceRef.current = false;
    mouseFallbackActiveRef.current = false;
    suppressMouseUpRef.current = true;
    const handle = handleRef.current;
    if (handle?.hasPointerCapture(drag.pointerId)) handle.releasePointerCapture(drag.pointerId);
  }, []);

  useLayoutEffect(() => {
    reClampPosition();
    repositionPanels();
  }, [reClampPosition, repositionPanels, lifecycleMode, propertyOpen, vanishingDurationSeconds]);

  useEffect(() => {
    const handleWindowBlur = () => finishDrag();
    const handleResize = () => {
      reClampPosition();
      repositionPanels();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("blur", handleWindowBlur);
      finishDrag();
    };
  }, [finishDrag, reClampPosition, repositionPanels]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    pointerSequenceRef.current = true;
    suppressMouseUpRef.current = false;
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    setDragging(true);
    if (!syntheticPointerDispatchRef.current) event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setClampedPosition({ left: event.clientX - drag.offsetX, top: event.clientY - drag.offsetY });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      pointerSequenceRef.current = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    finishDrag(event.pointerId);
  };

  const dispatchMouseAsPointer = (event: ReactMouseEvent<HTMLButtonElement>, type: "pointerdown" | "pointermove" | "pointerup") => {
    if (typeof PointerEvent === "undefined") return;
    syntheticPointerDispatchRef.current = true;
    try {
      event.currentTarget.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: event.button,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: event.clientX,
        clientY: event.clientY,
        isPrimary: true,
        pointerId: 1,
        pointerType: "mouse",
      }));
    } finally {
      syntheticPointerDispatchRef.current = false;
    }
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    // The embedded tauri-plugin-wdio-webdriver translates W3C pointer actions
    // to MouseEvents. Adapt that legacy boundary back to PointerEvents so the
    // toolbar drag state uses the same path as real pointer input.
    if (event.button !== 0 || pointerSequenceRef.current || typeof PointerEvent === "undefined") return;
    event.preventDefault();
    event.stopPropagation();
    mouseFallbackActiveRef.current = true;
    suppressMouseUpRef.current = false;
    dispatchMouseAsPointer(event, "pointerdown");
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!mouseFallbackActiveRef.current || typeof PointerEvent === "undefined") return;
    dispatchMouseAsPointer(event, "pointermove");
  };

  const handleMouseUp = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressMouseUpRef.current) {
      suppressMouseUpRef.current = false;
      mouseFallbackActiveRef.current = false;
      return;
    }
    if (!mouseFallbackActiveRef.current || typeof PointerEvent === "undefined") return;
    event.preventDefault();
    event.stopPropagation();
    dispatchMouseAsPointer(event, "pointerup");
    mouseFallbackActiveRef.current = false;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const size = toolbarSize();
    const viewport = viewportSize();
    setClampedPosition(moveToolbarPosition(
      positionRef.current,
      event.key,
      event.shiftKey,
      viewport.width,
      viewport.height,
      size.width,
      size.height,
    ), size);
  };

  const popoverStyle = { left: propertiesPosition.left, top: propertiesPosition.top };
  const lifecyclePopoverStyle = { left: lifecyclePosition.left, top: lifecyclePosition.top };
  const supportsFill = activeTool === "rectangle" || activeTool === "ellipse";
  const supportsTextSize = activeTool === "text";

  return (
    <>
      <nav
        ref={toolbarRef}
        className="annotation-toolbar"
        aria-label="Annotation tools"
        data-annotation-toolbar="true"
        data-scene-excluded="true"
        data-dragging={dragging ? "true" : "false"}
        data-toolbar-left={Math.round(position.left)}
        data-toolbar-top={Math.round(position.top)}
        style={{ left: position.left, top: position.top }}
      >
        <div className="annotation-toolbar__header" data-scene-excluded="true">
          <button
            ref={handleRef}
            type="button"
            className="annotation-toolbar__drag-handle"
            aria-label="Move annotation toolbar"
            aria-keyshortcuts="Arrow keys, Shift+Arrow keys"
            data-toolbar-drag-handle="true"
            data-toolbar-keyboard-step={TOOLBAR_KEYBOARD_STEP}
            data-toolbar-keyboard-shift-step={TOOLBAR_KEYBOARD_SHIFT_STEP}
            data-scene-excluded="true"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onKeyDown={handleKeyDown}
          >
            <span aria-hidden="true" className="annotation-toolbar__grip"><ToolbarIcon name="move" /></span>
          </button>
        </div>
        <div className="annotation-toolbar__tools" data-scene-excluded="true">
          <div className="annotation-toolbar__history" aria-label="Scene history" data-scene-excluded="true">
            <button
              type="button"
              aria-label="Undo"
              aria-keyshortcuts="Meta+Z Control+Z"
              data-history-undo="true"
              data-scene-excluded="true"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <span aria-hidden="true" className="annotation-toolbar__history-icon"><ToolbarIcon name="undo" /></span>
            </button>
            <button
              type="button"
              aria-label="Redo"
              aria-keyshortcuts="Meta+Y Control+Y"
              data-history-redo="true"
              data-scene-excluded="true"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <span aria-hidden="true" className="annotation-toolbar__history-icon"><ToolbarIcon name="redo" /></span>
            </button>
            <button
              type="button"
              aria-label="Clear all annotations"
              data-history-clear="true"
              data-scene-excluded="true"
              disabled={!canClear}
              onClick={onClearAll}
            >
              <span aria-hidden="true" className="annotation-toolbar__history-icon"><ToolbarIcon name="clear" /></span>
            </button>
          </div>
          {TOOL_ORDER.map((tool) => (
            <button
              key={tool}
              type="button"
              className="annotation-toolbar__tool"
              aria-label={TOOL_LABELS[tool]}
              aria-pressed={activeTool === tool}
              data-tool={tool}
              data-scene-excluded="true"
              onClick={() => onSelectTool(tool)}
            >
              <span aria-hidden="true" className="annotation-toolbar__tool-glyph"><ToolbarIcon name={tool} /></span>
            </button>
          ))}
          <button
            ref={propertiesButtonRef}
            type="button"
            className="annotation-toolbar__properties"
            aria-label="Tool properties"
            aria-expanded={propertyOpen}
            aria-controls="annotation-property-popover"
            data-scene-excluded="true"
            onClick={onToggleProperties}
          >
            <span aria-hidden="true" className="annotation-toolbar__control-icon"><ToolbarIcon name="properties" /></span>
          </button>
          <div className="annotation-toolbar__lifecycle" data-scene-excluded="true">
            <button
              ref={lifecycleButtonRef}
              type="button"
              className="annotation-toolbar__lifecycle-toggle"
              aria-label={`Ink lifecycle: ${lifecycleMode === "persistent" ? "Persistent" : "Vanishing"}`}
              aria-pressed={lifecycleMode === "vanishing"}
              data-lifecycle-toggle="true"
              data-lifecycle-mode={lifecycleMode}
              data-scene-excluded="true"
              onClick={onToggleLifecycleMode}
            >
              <span aria-hidden="true" className="annotation-toolbar__control-icon"><ToolbarIcon name="lifecycle" /></span>
            </button>
          </div>
        </div>
      </nav>
      {lifecycleMode === "vanishing" ? (
        <div
          ref={lifecyclePanelRef}
          className="lifecycle-popover"
          aria-label="Vanishing ink duration"
          data-lifecycle-controls="true"
          data-scene-excluded="true"
          style={lifecyclePopoverStyle}
        >
          <label>
            Duration
            <select
              aria-label="Vanishing duration preset"
              data-lifecycle-preset="true"
              value={VANISHING_DURATION_PRESETS.includes(vanishingDurationSeconds as (typeof VANISHING_DURATION_PRESETS)[number]) ? String(vanishingDurationSeconds) : "custom"}
              onChange={(event) => {
                if (event.target.value !== "custom") onSetVanishingDuration(Number(event.target.value));
              }}
            >
              {VANISHING_DURATION_PRESETS.map((seconds) => <option key={seconds} value={seconds}>{seconds} sec</option>)}
              <option value="custom">Custom</option>
            </select>
          </label>
          <label>
            Custom seconds
            <input
              type="number"
              min={MIN_VANISHING_DURATION_SECONDS}
              max={MAX_VANISHING_DURATION_SECONDS}
              step="any"
              value={vanishingDurationSeconds}
              aria-label="Custom vanishing duration in seconds"
              data-lifecycle-duration="true"
              onChange={(event) => onSetVanishingDuration(Number(event.target.value))}
            />
          </label>
        </div>
      ) : null}
      {propertyOpen ? (
        <section
          ref={propertiesPanelRef}
          id="annotation-property-popover"
          className="property-popover"
          aria-label={`${TOOL_LABELS[activeTool]} properties`}
          data-property-popover="true"
          data-active-tool={activeTool}
          data-scene-excluded="true"
          style={popoverStyle}
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
            <>
              <label>
                Fill
                <select value={toolStyle.fill} onChange={(event) => onUpdateStyle({ fill: event.target.value as AnnotationStyle["fill"] })} data-style-control="fill">
                  <option value="none">None</option>
                  <option value="solid">Solid</option>
                </select>
              </label>
              <label>
                Fill color
                <input type="color" value={toolStyle.fillColor} onChange={(event) => onUpdateStyle({ fillColor: event.target.value })} data-style-control="fillColor" />
              </label>
              <label>
                Fill opacity
                <input type="range" min="0" max="1" step="0.01" value={toolStyle.fillOpacity} onChange={(event) => onUpdateStyle({ fillOpacity: Number(event.target.value) })} data-style-control="fillOpacity" />
              </label>
            </>
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

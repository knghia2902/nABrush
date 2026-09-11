import type { AnnotationStyle, AnnotationTool } from "../types/overlay";
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

export type AnnotationToolbarProps = {
  activeTool: AnnotationTool;
  toolStyle: AnnotationStyle;
  propertyOpen: boolean;
  onSelectTool: (tool: AnnotationTool) => void;
  onToggleProperties: () => void;
  onUpdateStyle: (patch: Partial<AnnotationStyle>) => void;
};

export function AnnotationToolbar({
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

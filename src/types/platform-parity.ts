import fixture from "./platform-parity-schema.json";

export const PARITY_SCHEMA_VERSION = 1 as const;

export const SHORTCUT_CONCEPTS = [
  "Show",
  "ToggleVisibility",
  "ToggleClickThrough",
  "Esc",
] as const;
export type ShortcutConcept = (typeof SHORTCUT_CONCEPTS)[number];

export const TOOL_ORDER = [
  "pen",
  "highlighter",
  "line",
  "arrow",
  "rectangle",
  "ellipse",
  "text",
  "eraser",
] as const;
export type AnnotationTool = (typeof TOOL_ORDER)[number];

export type PlatformParityContract = {
  readonly version: typeof PARITY_SCHEMA_VERSION;
  readonly shortcutConcepts: readonly ShortcutConcept[];
  readonly toolOrder: readonly AnnotationTool[];
  readonly modeFeedback: {
    readonly interactiveLabel: "Đang vẽ";
    readonly clickThroughLabel: "Xuyên qua";
    readonly anchors: {
      readonly modeBadge: "mode-badge";
      readonly errorBadge: "error-badge";
    };
    readonly sceneExcluded: true;
  };
  readonly exportSemantics: {
    readonly composition: "canonical-logical-desktop";
    readonly compositionPasses: 1;
    readonly pixelDensity: "display";
    readonly included: readonly ["background", "annotations"];
    readonly excluded: readonly ["toolbar", "mode-badge", "error-badge"];
  };
};

const expectedShortcutConcepts = [...SHORTCUT_CONCEPTS];
const expectedToolOrder = [...TOOL_ORDER];
const expectedIncluded = ["background", "annotations"] as const;
const expectedExcluded = ["toolbar", "mode-badge", "error-badge"] as const;

function sameOrderedValues(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function freezeContract(contract: PlatformParityContract): PlatformParityContract {
  Object.freeze(contract.shortcutConcepts);
  Object.freeze(contract.toolOrder);
  Object.freeze(contract.modeFeedback.anchors);
  Object.freeze(contract.modeFeedback);
  Object.freeze(contract.exportSemantics.included);
  Object.freeze(contract.exportSemantics.excluded);
  Object.freeze(contract.exportSemantics);
  return Object.freeze(contract);
}

/**
 * Validate the checked-in contract at the webview boundary.
 *
 * Exact ordered comparisons are intentional: the tool palette and shortcut
 * vocabulary are compatibility values shared with the native command.
 */
export function validatePlatformParityContract(value: unknown): PlatformParityContract {
  if (!isRecord(value)) throw new Error("Platform parity contract must be an object");
  if (value.version !== PARITY_SCHEMA_VERSION) throw new Error("Unsupported platform parity schema version");
  if (!Array.isArray(value.shortcutConcepts) || !sameOrderedValues(value.shortcutConcepts, expectedShortcutConcepts)) {
    throw new Error("Platform parity shortcut concepts are invalid or out of order");
  }
  if (!Array.isArray(value.toolOrder) || !sameOrderedValues(value.toolOrder, expectedToolOrder)) {
    throw new Error("Platform parity tool order is invalid or out of order");
  }

  const modeFeedback = value.modeFeedback;
  if (!isRecord(modeFeedback)
    || modeFeedback.interactiveLabel !== "Đang vẽ"
    || modeFeedback.clickThroughLabel !== "Xuyên qua"
    || modeFeedback.sceneExcluded !== true
    || !isRecord(modeFeedback.anchors)
    || modeFeedback.anchors.modeBadge !== "mode-badge"
    || modeFeedback.anchors.errorBadge !== "error-badge") {
    throw new Error("Platform parity mode feedback is invalid");
  }

  const exportSemantics = value.exportSemantics;
  const included = isRecord(exportSemantics) ? exportSemantics.included : undefined;
  const excluded = isRecord(exportSemantics) ? exportSemantics.excluded : undefined;
  if (!isRecord(exportSemantics)
    || exportSemantics.composition !== "canonical-logical-desktop"
    || exportSemantics.compositionPasses !== 1
    || exportSemantics.pixelDensity !== "display"
    || !isStringArray(included)
    || !sameOrderedValues(included, expectedIncluded)
    || !isStringArray(excluded)
    || !sameOrderedValues(excluded, expectedExcluded)
    || excluded.some((item) => included.includes(item))) {
    throw new Error("Platform parity export semantics are invalid");
  }

  return freezeContract({
    version: PARITY_SCHEMA_VERSION,
    shortcutConcepts: [...value.shortcutConcepts] as ShortcutConcept[],
    toolOrder: [...value.toolOrder] as AnnotationTool[],
    modeFeedback: {
      interactiveLabel: "Đang vẽ",
      clickThroughLabel: "Xuyên qua",
      anchors: { modeBadge: "mode-badge", errorBadge: "error-badge" },
      sceneExcluded: true,
    },
    exportSemantics: {
      composition: "canonical-logical-desktop",
      compositionPasses: 1,
      pixelDensity: "display",
      included: [...expectedIncluded],
      excluded: [...expectedExcluded],
    },
  });
}

export const PLATFORM_PARITY_CONTRACT = validatePlatformParityContract(fixture);

/** Return the immutable checked-in contract used by renderer and E2E assertions. */
export function loadPlatformParityContract(): PlatformParityContract {
  return PLATFORM_PARITY_CONTRACT;
}

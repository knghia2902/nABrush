import { describe, expect, it } from "vitest";
import {
  loadPlatformParityContract,
  PLATFORM_PARITY_CONTRACT,
  validatePlatformParityContract,
} from "./platform-parity";

describe("platform parity contract", () => {
  it("keeps the shared shortcut concepts and tool order stable", () => {
    const contract = loadPlatformParityContract();

    expect(contract.shortcutConcepts).toEqual([
      "Show",
      "ToggleVisibility",
      "ToggleClickThrough",
      "Esc",
    ]);
    expect(contract.toolOrder).toEqual([
      "pen",
      "highlighter",
      "line",
      "arrow",
      "rectangle",
      "ellipse",
      "text",
      "eraser",
    ]);
  });

  it("defines scene-excluded mode feedback anchors and labels", () => {
    expect(PLATFORM_PARITY_CONTRACT.modeFeedback).toEqual({
      interactiveLabel: "Đang vẽ",
      clickThroughLabel: "Xuyên qua",
      anchors: { modeBadge: "mode-badge", errorBadge: "error-badge" },
      sceneExcluded: true,
    });
  });

  it("describes one display-density composition without UI chrome", () => {
    expect(PLATFORM_PARITY_CONTRACT.exportSemantics).toEqual({
      composition: "canonical-logical-desktop",
      compositionPasses: 1,
      pixelDensity: "display",
      included: ["background", "annotations"],
      excluded: ["toolbar", "mode-badge", "error-badge"],
    });
  });

  it("rejects changed shortcut and tool ordering", () => {
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      shortcutConcepts: [...PLATFORM_PARITY_CONTRACT.shortcutConcepts].reverse(),
    })).toThrow(/shortcut concepts/);
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      toolOrder: [...PLATFORM_PARITY_CONTRACT.toolOrder].reverse(),
    })).toThrow(/tool order/);
  });

  it("rejects missing or renamed mode feedback anchors", () => {
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      modeFeedback: {
        ...PLATFORM_PARITY_CONTRACT.modeFeedback,
        anchors: { ...PLATFORM_PARITY_CONTRACT.modeFeedback.anchors, errorBadge: "toolbar" },
      },
    })).toThrow(/mode feedback/);
  });

  it("rejects duplicate passes, non-display density, and UI chrome inclusion", () => {
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      exportSemantics: { ...PLATFORM_PARITY_CONTRACT.exportSemantics, compositionPasses: 2 },
    })).toThrow(/export semantics/);
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      exportSemantics: { ...PLATFORM_PARITY_CONTRACT.exportSemantics, pixelDensity: "logical" },
    })).toThrow(/export semantics/);
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      exportSemantics: { ...PLATFORM_PARITY_CONTRACT.exportSemantics, included: ["background", "toolbar"] },
    })).toThrow(/export semantics/);
  });
});

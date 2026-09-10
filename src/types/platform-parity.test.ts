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

  it("rejects changed ordering and duplicate export passes", () => {
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      toolOrder: [...PLATFORM_PARITY_CONTRACT.toolOrder].reverse(),
    })).toThrow(/tool order/);
    expect(() => validatePlatformParityContract({
      ...PLATFORM_PARITY_CONTRACT,
      exportSemantics: { ...PLATFORM_PARITY_CONTRACT.exportSemantics, compositionPasses: 2 },
    })).toThrow(/export semantics/);
  });
});

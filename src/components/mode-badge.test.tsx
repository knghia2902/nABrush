import { describe, expect, it } from "vitest";
import { BADGE_TIMEOUT_MS, badgeCopy } from "./ModeBadge";

describe("ModeBadge", () => {
  it("has readable mode-specific feedback outside scene composition", () => {
    expect(badgeCopy("VisibleInteractive")).toBe("Drawing");
    expect(badgeCopy("VisibleClickThrough")).toBe("Click-through");
    expect(badgeCopy("Hidden")).toBeNull();
  });

  it("uses the documented short auto-hide duration", () => {
    expect(BADGE_TIMEOUT_MS).toBe(2000);
  });
});

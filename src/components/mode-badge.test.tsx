import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BADGE_TIMEOUT_MS, ModeBadge, badgeCopy } from "./ModeBadge";

describe("ModeBadge", () => {
  it("has readable mode-specific feedback outside scene composition", () => {
    expect(badgeCopy("VisibleInteractive")).toBe("Đang vẽ");
    expect(badgeCopy("VisibleClickThrough")).toBe("Xuyên qua");
    expect(badgeCopy("Hidden")).toBeNull();
  });

  it("uses the documented short auto-hide duration", () => {
    expect(BADGE_TIMEOUT_MS).toBe(2000);
  });

  it("keeps the badge outside scene data with accessible status semantics", () => {
    const markup = renderToStaticMarkup(<ModeBadge mode="VisibleInteractive" viewport={{
      id: "display-left",
      origin: { x: -1920, y: 0 },
      logicalSize: { width: 1920, height: 1080 },
      scaleFactor: 2,
      orientation: "degrees0",
    }} />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('data-scene-excluded="true"');
    expect(markup).toContain('data-display-id="display-left"');
    expect(markup).toContain("Đang vẽ");
  });

  it("suppresses feedback for hidden surfaces", () => {
    expect(renderToStaticMarkup(<ModeBadge mode="Hidden" />)).toBe("");
  });
});

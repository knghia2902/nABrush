import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBadge, errorCopy, errorHasAction, type ErrorPayload } from "./ErrorBadge";

describe("ErrorBadge", () => {
  const initialization: ErrorPayload = { code: "OverlayInitialization", message: "Overlay unavailable", actions: ["Retry", "OpenSystemSettings"] };
  it("exposes contextual recovery actions without modal semantics", () => {
    expect(errorHasAction(initialization, "Retry")).toBe(true);
    expect(errorHasAction(initialization, "OpenSystemSettings")).toBe(true);
  });
  it("does not offer system settings for a shortcut conflict unless native state allows it", () => {
    const conflict: ErrorPayload = { code: "ShortcutConflict", message: "Choose another key", actions: ["Retry"] };
    expect(errorHasAction(conflict, "OpenSystemSettings")).toBe(false);
  });
  it("renders a stable native error code marker for recovery assertions", () => {
    const markup = renderToStaticMarkup(<ErrorBadge initialError={initialization} />);
    expect(markup).toContain('data-error-code="OverlayInitialization"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Thử lại lớp phủ");
    expect(markup).toContain('data-scene-excluded="true"');
  });

  it("uses platform-specific permission guidance and keeps system settings gated", () => {
    const macos: ErrorPayload = { code: "DisplayPermission", message: "ignored", actions: ["Retry", "OpenSystemSettings"], platform: "macos" };
    const windows: ErrorPayload = { code: "DisplayPermission", message: "ignored", actions: ["Retry"], platform: "windows" };
    expect(errorCopy(macos)).toContain("Quyền riêng tư & Bảo mật");
    expect(errorCopy(windows)).toContain("quyền hiển thị cửa sổ phủ");
    expect(errorHasAction(windows, "OpenSystemSettings")).toBe(false);
  });

  it("suppresses scoped errors while the viewport is hidden", () => {
    expect(renderToStaticMarkup(<ErrorBadge mode="Hidden" initialError={initialization} />)).toBe("");
  });
});

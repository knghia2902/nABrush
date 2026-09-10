import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBadge, errorHasAction, type ErrorPayload } from "./ErrorBadge";

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
  });
});

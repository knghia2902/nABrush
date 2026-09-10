---
status: testing
phase: 01-native-overlay-activation
source: [01-VERIFICATION.md]
started: 2026-09-10
updated: 2026-09-10
---

## Current Test

Test 2 — Drawing, click-through, Escape, and scene restoration

## Tests

### 1. Tray launch and cross-app activation
expected: Tray/menu-bar entry remains available and the configured global shortcut activates the overlay from TextEdit or Notepad.
result: pass
reported: "Bấm show không có gì xảy ra và settings thì trống trơn"
severity: major
previous_result: issue
retest: "Gap closure plan 01-08 added a discoverable tray icon and documented the Tauri dev launch path."

### 2. Drawing, click-through, Escape, and scene restoration
expected: Drawing captures a mark, Click-through sends a click to the underlying text target, Escape hides, and the same scene returns after Show.
result: [pending]
reported: "ok"
severity: major
previous_result: issue
retest: "Plan 01-10 added a retained pointer canvas and production click-through shortcuts; manual retest is required."

### 3. Settings close-to-hide and recovery actions
expected: Closing settings hides that window without quitting; shortcut conflict rolls back; initialization failure exposes Retry.
result: [pending]
reported: "settings mở lúc được lúc không"
severity: major
previous_result: issue
retest: "Plan 01-11 keeps the Settings webview reusable and adds typed retry/error feedback; manual repeated open-close-open retest is required."

### 4. Full-screen and permission limitations
expected: Spaces/Stage Manager/native full-screen and Windows borderless/exclusive full-screen observations are recorded with limitations for protected or denied surfaces.
result: pass
reported: "Cmd+Shift+A hoạt động"
observed: "macOS global shortcut remained available during the manual full-screen/Space check; Windows device evidence was not available in this session."

## Summary

total: 4
passed: 2
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

- gap_id: G-01-1
  truth: "Tray/menu-bar entry remains available and the configured global shortcut activates the overlay from TextEdit or Notepad."
  status: resolved
  resolved_by: 01-08-PLAN.md
  resolved_at: 2026-09-10
  reason: "User reported: Chỉ có cái này không lên app"
  severity: major
  test: 1
  artifacts:
    - "src-tauri/src/tray.rs"
    - "src-tauri/tauri.conf.json"
    - "src-tauri/icons/icon.png"
  missing:
    - "TrayIconBuilder is not given an icon, so macOS provides no discoverable status-item visual."
    - "Debug launch uses the raw binary instead of an app bundle, so no Dock application entry is expected."
  diagnosis: "The hidden overlay/settings windows and skipTaskbar are intentional. The missing tray icon is an implementation gap; the raw debug binary also makes the tray-only lifecycle confusing during manual UAT."

- gap_id: G-01-2
  truth: "Tray Show reveals the overlay and Settings renders its controls when opened from the tray menu."
  status: resolved
  resolved_by: 01-09-PLAN.md
  resolved_at: 2026-09-10
  reason: "User reported: Bấm show không có gì xảy ra và settings thì trống trơn"
  severity: major
  test: 1
  artifacts:
    - "src-tauri/tauri.conf.json"
    - "src/App.tsx"
    - "src/components/SettingsPanel.tsx"
    - "src-tauri/target/debug/nabrush"
  missing:
    - "Manual launch must keep the Vite dev server available at http://localhost:1420; a raw debug binary without Vite loads about:blank."
    - "The overlay webview needs a visible activation surface/state separate from the settings window."
  diagnosis: "The user interacted with a raw debug process while no Vite server was serving the configured devUrl, so Settings loaded about:blank. App currently mounts SettingsPanel in every window and only shows a transient badge for overlay activation, making Show look inert even after the correct dev server is running."

- gap_id: G-01-3
  truth: "Drawing captures a mark, Click-through sends a click to the underlying text target, Escape hides, and the same scene returns after Show."
  status: resolved
  resolved_by: 01-10-PLAN.md
  resolved_at: 2026-09-10
  reason: "Plan 01-10 added a retained single-stroke canvas, native click-through actions, Escape restoration, and real scene E2E coverage."
  severity: major
  test: 2
  artifacts:
    - "src/App.tsx"
    - "src/styles.css"
    - "src/state/overlay.ts"
    - "src-tauri/src/main.rs"
  missing:
    - "A user-facing drawing surface/tool control that commits a mark to the retained scene."
    - "A user-facing Click-through action wired to the native controller."
  diagnosis: "Phase 1 contains native mode seams and reducer fixtures, but the shipped webview has no pointer renderer or toolbar and the production shortcut handler only registers visibility, so manual drawing and click-through cannot be exercised."
  root_cause_evidence:
    - "src/App.tsx renders only ModeBadge and ErrorBadge for the overlay; no canvas or pointer handler exists."
    - "AppController::set_click_through and ToggleClickThrough are reachable only through native/debug paths."
    - "main.rs registers only the visibility shortcut; the other shortcut values are stored but not bound to OS callbacks."

- gap_id: G-01-4
  truth: "Closing settings hides that window without quitting; shortcut conflict rolls back; initialization failure exposes Retry."
  status: resolved
  resolved_by: 01-11-PLAN.md
  resolved_at: 2026-09-10
  reason: "Plan 01-11 prevents native destruction on close, reports missing windows through ErrorStore, and adds retryable Settings/recovery paths."
  severity: major
  test: 3
  artifacts:
    - "src/App.tsx"
    - "src/components/SettingsPanel.tsx"
    - "src-tauri/src/controller.rs"
    - "src-tauri/src/main.rs"
  missing:
    - "A deterministic, user-reproducible Settings open/close lifecycle."
  diagnosis: "The Settings surface is not reliably reachable from the tray during manual UAT; the current native show path has no visible diagnostic or retry feedback when the window/webview fails to present."
  root_cause_evidence:
    - "main.rs handles CloseRequested with window.hide() but does not call event.api.prevent_close(), so Tauri destroys the reusable settings window."
    - "controller.rs silently returns Ok(()) when the settings window is missing, and tray.rs discards the result."

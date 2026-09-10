---
status: testing
phase: 01-native-overlay-activation
source: [01-VERIFICATION.md]
started: 2026-09-10
updated: 2026-09-10
---

## Current Test

number: 3
name: Settings close-to-hide and recovery actions
expected: |
  Closing settings hides that window without quitting; shortcut conflict rolls back; initialization failure exposes Retry.
awaiting: user response

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
result: issue
reported: "ok"
severity: major
note: "User confirmed the current build lacks a drawing toolbar/canvas and a Click-through control, so this test cannot be completed."

### 3. Settings close-to-hide and recovery actions
expected: Closing settings hides that window without quitting; shortcut conflict rolls back; initialization failure exposes Retry.
result: [pending]

### 4. Full-screen and permission limitations
expected: Spaces/Stage Manager/native full-screen and Windows borderless/exclusive full-screen observations are recorded with limitations for protected or denied surfaces.
result: [pending]

## Summary

total: 4
passed: 1
issues: 1
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
  status: failed
  reason: "User confirmed the test cannot be completed because the current build has no drawing toolbar/canvas or Click-through control."
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

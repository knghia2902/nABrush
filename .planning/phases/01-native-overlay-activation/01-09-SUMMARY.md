---
phase: 01-native-overlay-activation
plan: 09
subsystem: ui
tags: [tauri, react, pnpm, webdriver, settings, overlay]

# Dependency graph
requires:
  - phase: 01-native-overlay-activation
    provides: hidden reusable overlay lifecycle, tray callbacks, debug WebDriver fixture, and Tauri window labels
provides:
  - Reproducible pnpm 11 build-script policy for the Vite beforeDevCommand
  - Window-label-scoped settings and overlay React surfaces with stable test markers
  - Debug-only settings-open command and labeled WebDriver coverage
affects: [phase-01-uat, release-validation, native-overlay]

# Actuals (#2632)
actuals:
  tokens: 1482
  tasks: 2
  commits: 2

# Measured plan ledger (#3968)
commits: 2
plan_head_before: f86d3478a95695e2c86790352624cdfea93a0125

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fixed Tauri window labels select the React surface rendered by each webview
    - Debug-only native commands exercise deterministic multi-window lifecycle paths
    - Embedded WebDriver window handles backstop unavailable plugin window-list IPC

key-files:
  created:
    - pnpm-workspace.yaml
  modified:
    - src/App.tsx
    - src-tauri/src/main.rs
    - tests/e2e/overlay.e2e.ts

key-decisions:
  - "Keep explicit pnpm build approvals in a tracked workspace file: esbuild true, edgedriver false, and geckodriver false."
  - "Use the existing overlay and settings labels as the only React surface routing boundary."
  - "Keep test_show_settings debug-only and fail closed in release builds."

patterns-established:
  - "Window surface routing: read getCurrentWindow().label once and render only the controls valid for that native window."
  - "Native smoke fixtures: expose deterministic debug commands while preserving the production tray lifecycle."

requirements-completed: [OVLY-01, OVLY-02, OVLY-04]

coverage:
  - id: D1
    description: "Fresh installs apply an explicit pnpm 11 build policy while tauri:dev retains the configured Vite launch contract."
    requirement: OVLY-02
    verification:
      - kind: other
        ref: "pnpm install --frozen-lockfile"
        status: pass
      - kind: other
        ref: "pnpm exec tauri build --debug"
        status: pass
    human_judgment: false
  - id: D2
    description: "The settings webview renders editable bindings, fixed Escape, and launch-at-login controls while the overlay webview exposes stable loaded-surface and mode markers."
    requirement: OVLY-01
    verification:
      - kind: e2e
        ref: "tests/e2e/overlay.e2e.ts#keeps settings controls in the settings window and the overlay surface isolated"
        status: pass
    human_judgment: false
  - id: D3
    description: "Show, Esc, and Show again preserve the loaded overlay document and retained scene sentinel across labeled webviews."
    requirement: OVLY-04
    verification:
      - kind: e2e
        ref: "pnpm exec wdio run wdio.conf.ts --suite short-lifecycle"
        status: pass
      - kind: e2e
        ref: "pnpm exec wdio run wdio.conf.ts --suite phase1-matrix"
        status: pass
    human_judgment: false

duration: 34min
completed: 2026-09-10
status: complete
---

# Phase 1: Native Overlay & Activation — Plan 09 Summary

**Loaded Tauri development surfaces with label-scoped settings controls and deterministic overlay lifecycle coverage**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-10T02:34:00Z
- **Completed:** 2026-09-10T03:02:38Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Tracked pnpm 11's explicit build-script decisions so the configured Vite server can be started reproducibly by `pnpm tauri:dev`.
- Routed `SettingsPanel` only to the `settings` webview and added stable `data-window-label` and `data-overlay-surface="loaded"` markers to the overlay while preserving transparent styling, mode feedback, and scene-excluded badges.
- Added a debug-only, release-fail-closed `test_show_settings` command and extended WebDriver coverage for settings controls, Drawing mode, labeled surfaces, Esc hide, and scene retention.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make dev launch reproducible and scope each Tauri window to its surface** — `7346c1e` (feat)
2. **Task 2: Prove settings controls and overlay activation through labeled WebDriver windows** — `9f2cec5` (test)

## Files Created/Modified

- `pnpm-workspace.yaml` — explicit pnpm 11 build-script allow/deny policy.
- `src/App.tsx` — fixed-label window routing and stable overlay markers.
- `src-tauri/src/main.rs` — debug-only settings-open command registered with Tauri invoke.
- `tests/e2e/overlay.e2e.ts` — multi-window settings and overlay assertions.

## Decisions Made

- The existing `overlay` and `settings` labels remain the sole routing boundary, keeping settings controls out of the transparent overlay.
- The production lifecycle remains tray-owned; `test_show_settings` is only available in debug builds and returns an error in release builds.
- The embedded WebDriver provider's plugin IPC list failed in this host, so the suite attempts `browser.tauri.listWindows()` and falls back to native WebDriver window handles; switching still uses `browser.tauri.switchWindow(label)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a deterministic WebDriver fallback for multi-window discovery and command invocation**

- **Found during:** Task 2 (Prove settings controls and overlay activation through labeled WebDriver windows)
- **Issue:** The embedded provider timed out on its `core.invoke` path for `browser.tauri.listWindows()` and the helper's `browser.tauri.execute()` while the active webview exposed the internal Tauri bridge and native window handles.
- **Fix:** Invoke `test_show_settings` through the existing internal bridge, try the official `browser.tauri.listWindows()` API, and fall back to `browser.getWindowHandles()`; retain `browser.tauri.switchWindow("settings")` for labeled switching.
- **Files modified:** `tests/e2e/overlay.e2e.ts`
- **Verification:** Short-lifecycle and phase1-matrix suites each passed with 6 tests.
- **Committed in:** `9f2cec5`

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** The fallback is test-only and leaves production IPC and window lifecycle unchanged.

## Issues Encountered

- The existing tauri-service diagnostic emits a warning when querying window states because the app uses `withGlobalTauri: false`; this did not affect the passing test assertions.
- Native Rust warnings remain in pre-existing Phase 1 modules; no new warnings were introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The manual UAT gap is ready for recheck from the repository root with `pnpm tauri:dev`. Settings should render its controls after the tray Settings action, and Show should reveal a loaded transparent overlay. The phase still requires physical-device confirmation for tray visuals and cross-application shortcut behavior.

## Self-Check: PASSED

- `01-09-SUMMARY.md` exists at the expected phase path.
- Task commits `7346c1e` and `9f2cec5` are present in git history.
- Install, typecheck, Vitest (9 tests), Cargo check/test (15 tests), debug build, and both WebDriver suites pass.

---
*Phase: 01-native-overlay-activation*
*Plan: 09*
*Completed: 2026-09-10*

---
phase: 01-native-overlay-activation
plan: 07
subsystem: native-validation
tags: [webdriver, tauri, ci, support-matrix, macos, windows]
requires:
  - phase: 01-native-overlay-activation
    provides: overlay lifecycle, shortcut settings, platform hit-testing, and recovery state
provides:
  - Built-app WebDriver short-lifecycle and phase1-matrix smoke suites
  - Debug-only embedded Tauri WebDriver action fixture for deterministic native transitions
  - Separate macOS 13 and Windows 2022 CI jobs plus versioned support matrix
affects: [release-validation, phase-gates, cross-platform-support]
actuals:
  tokens: 5200
  tasks: 3
  commits: 1
tech-stack:
  added: [WebdriverIO 9, @wdio/tauri-service 1.4, tauri-plugin-wdio-webdriver 1.4]
  patterns: [single-worker native smoke, debug-only action fixture, explicit device evidence rows]
key-files:
  created: [wdio.conf.ts, tests/e2e/overlay.e2e.ts, .github/workflows/phase1.yml, docs/support-matrix.md]
  modified: [package.json, pnpm-lock.yaml, src-tauri/Cargo.toml, src-tauri/Cargo.lock, src-tauri/src/main.rs, src-tauri/capabilities/default.json]
key-decisions:
  - "Use the official embedded Tauri WebDriver server so macOS can run smoke tests without an external driver; register it only in debug builds."
  - "Keep deterministic mode/recovery assertions in the built-app suite while reserving real global shortcut and pointer delivery for the macOS TextEdit and Windows Notepad device rows."
patterns-established:
  - "Run smoke suites one worker at a time to avoid global shortcut races."
  - "Record platform claims with OS versions and evidence locations instead of inferring support from host tests."
requirements-completed: [OVLY-01, OVLY-02, OVLY-03, OVLY-04]
coverage:
  - id: D1
    description: "Built Tauri app exposes tray-owned cold launch, native mode transitions, Escape hide, scene sentinel restoration, conflict rollback, and retry fixture through WebDriver."
    requirement: OVLY-01
    verification:
      - kind: smoke
        ref: "pnpm exec wdio run wdio.conf.ts --suite short-lifecycle"
        status: pass
      - kind: smoke
        ref: "pnpm exec wdio run wdio.conf.ts --suite phase1-matrix"
        status: pass
  - id: D2
    description: "Separate macOS and Windows CI jobs run the same type, unit, native, build, and short smoke commands, with a later matrix gate."
    requirement: OVLY-02
    verification:
      - kind: static
        ref: ".github/workflows/phase1.yml"
        status: pass
      - kind: static
        ref: "docs/support-matrix.md"
        status: pass
  - id: D3
    description: "Real-device shortcut delivery, click-through pointer delivery, close-to-hide, and full-screen observations are recorded for supported macOS and Windows baselines."
    requirement: OVLY-03
    verification: []
    human_judgment: true
    rationale: "The host smoke run cannot prove another-app focus, TextEdit/Notepad pointer delivery, Spaces, Stage Manager, or exclusive full-screen compositor behavior."
duration: 32min
completed: 2026-09-10
status: complete
---

# Phase 1: Native Overlay & Activation — Plan 07 Summary

**Built-app lifecycle smoke coverage and an explicit macOS/Windows support contract**

## Performance

- **Tasks:** 3 completed
- **Files modified:** 10

## Accomplishments

- Added a WebdriverIO Tauri configuration with separate `short-lifecycle` and `phase1-matrix` suites.
- Added deterministic built-app assertions for hidden startup, Drawing/Click-through transitions, Escape restoration, shortcut conflict rollback, and Retry state.
- Added the official embedded WebDriver plugin to debug builds so native macOS smoke runs do not depend on an external driver.
- Added `macos-13` and `windows-2022` jobs plus a later matrix job that repeats the full smoke command.
- Documented the macOS 13+/Windows 10 22H2+ baseline, TextEdit/Notepad pointer fixtures, private-API signing consequence, and full-screen limitations.

## Task Commits

1. **Tasks 1–3: Add reviewed WebDriver dependencies, smoke suites, CI, and support evidence** — recorded in the Plan 07 execution commit.

## Verification

- `pnpm typecheck` — pass.
- `pnpm exec vitest run` — 3 files, 9 tests passed.
- `pnpm exec tauri build --debug` — pass; debug executable launched with embedded WebDriver.
- `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` — 5 tests passed.
- `pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` — 5 tests passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` — pass.

## Deviations and limitations

- The first smoke attempt correctly failed because the embedded server plugin was absent; adding the official `tauri-plugin-wdio-webdriver` debug integration resolved it.
- Global shortcut delivery from a separate application and pointer pass-through remain real-device checks. Complete the pending macOS TextEdit and Windows Notepad rows in `docs/support-matrix.md` before treating the phase as fully verified.

## Next Phase Readiness

The repeatable native smoke path and CI contract are ready. Phase-level completion still requires the two physical-device evidence rows and the full-screen observations described in the support matrix.

---
*Phase: 01-native-overlay-activation*
*Plan: 07*

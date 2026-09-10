---
phase: 01-native-overlay-activation
plan: 05
subsystem: platform-ui
tags: [macos, windows, hit-testing, click-through, mode-badge]
requires:
  - phase: 01-native-overlay-activation
    provides: mode contract and settings-controlled controller
provides:
  - Target-gated macOS and Windows hit-testing policies
  - Idempotent pointer intent adapter contract
  - Auto-hiding Drawing/Click-through mode feedback
affects: [01-06, platform-integration, export]
actuals:
  tokens: 3300
  tasks: 2
  commits: 1
tech-stack:
  added: [AppKit policy seam, Win32 HTTRANSPARENT policy seam]
  patterns: [target-gated adapters, scene-excluded feedback layer]
key-files:
  created: [src-tauri/src/platform/macos.rs, src-tauri/src/platform/windows.rs, src/components/ModeBadge.tsx, src/components/mode-badge.test.tsx, src-tauri/icons/icon.ico]
  modified: [src-tauri/src/platform/mod.rs, src-tauri/src/controller.rs, src/App.tsx, src/styles.css]
key-decisions:
  - "Keep OS-specific hit-testing behind the existing PlatformWindowAdapter seam and reuse one surface identity."
  - "Render the badge as a UI-only layer with a two-second timeout and a scene-excluded marker."
patterns-established:
  - "Interactive maps to pointer capture/crosshair; click-through maps to pass-through/HTTRANSPARENT intent."
  - "Target modules compile only on their respective operating systems while the host adapter remains deterministic."
requirements-completed: [OVLY-03]
coverage:
  - id: D1
    description: "Platform adapter tests cover capture/pass-through intent and reuse without surface recreation."
    requirement: OVLY-03
    verification:
      - kind: unit
        ref: "cargo test --manifest-path src-tauri/Cargo.toml platform"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mode badge exposes Drawing and Click-through feedback with scene separation and a two-second hide duration."
    requirement: OVLY-03
    verification:
      - kind: unit
        ref: "pnpm exec vitest run src/components/mode-badge.test.tsx"
        status: pass
      - kind: unit
        ref: "pnpm exec tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Native hit testing and pointer delivery are confirmed on real macOS and Windows devices."
    verification: []
    human_judgment: true
    rationale: "AppKit and Win32 window-manager behavior cannot be fully proven by host-only unit tests."
duration: 18min
completed: 2026-09-10
status: complete
---

# Phase 1: Native Overlay & Activation — Plan 05 Summary

**Target-gated click-through policies and scene-independent mode feedback for Drawing and Click-through**

## Performance

- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Added macOS `ignoresMouseEvents` and Windows `HTTRANSPARENT` policy seams behind `PlatformWindowAdapter`.
- Added deterministic adapter tests proving pointer intent switches without creating another surface.
- Added a two-second, scene-excluded `ModeBadge` with Drawing/crosshair and Click-through/pass-through feedback.

## Task Commits

1. **Task 1: Implement native AppKit and Win32 hit-testing adapters** — `75d0911` (`feat(01-05): add platform hit testing and mode feedback`)
2. **Task 2: Render and test mode badge and cursor feedback** — included in `75d0911`.

## Files Created/Modified

- `src-tauri/src/platform/mod.rs`, `macos.rs`, `windows.rs` — adapter contract and target policies.
- `src/components/ModeBadge.tsx`, `mode-badge.test.tsx`, `src/styles.css` — feedback UI and tests.
- `src/App.tsx` — typed mode badge integration.

## Decisions Made

- Native adapters express hit-testing intent while the controller remains the one lifecycle authority.
- The badge is explicitly excluded from scene/export composition and disappears when Hidden.

## Deviations from Plan

None — the planned adapter and feedback seams are implemented.

## Issues Encountered

- A Windows cross-target check reached the Tauri resource stage but cannot finish on macOS because `llvm-rc` is unavailable; host macOS platform tests and the target-gated source compile pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Pointer mode and feedback are ready for the recoverable overlay/shortcut error state and contextual retry actions in Plan 06. Real-device hit-testing and cursor checks remain human verification items.

---
*Phase: 01-native-overlay-activation*
*Plan: 05*

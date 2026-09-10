---
phase: 01-native-overlay-activation
plan: 08
subsystem: native-tray
tags: [tauri, tray, macos, windows, png, uat]
requires:
  - phase: 01-native-overlay-activation
    provides: hidden overlay lifecycle, tray menu callbacks, global shortcut registration, and Phase 1 support matrix
provides:
  - Visible tray/status icon backed by the checked-in PNG asset
  - macOS template rendering for menu-bar appearance changes
  - Reproducible `pnpm tauri:dev` manual review path and tray-only lifecycle evidence checklist
affects: [phase-01-uat, release-validation, macos-support, windows-support]
actuals:
  tokens: 1700
  tasks: 2
  commits: 2
  plan_head_before: 8c021caaab75782750c1c7538b2219db7ab544f7
tech-stack:
  added: []
  patterns:
    - Compile-time PNG decoding through Tauri's `Image::from_bytes` result path
    - macOS tray template rendering enabled from the target platform
key-files:
  created: []
  modified:
    - src-tauri/src/tray.rs
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - docs/support-matrix.md
key-decisions:
  - "Use the existing `src-tauri/icons/icon.png` through `include_bytes!` and `Image::from_bytes` so malformed artwork fails app setup rather than producing an unidentifiable tray item."
  - "Keep the overlay and settings windows hidden at startup and out of the taskbar; document `pnpm tauri:dev` as the manual entry point while retaining the raw debug executable for WebDriver automation."
requirements-completed: [OVLY-01, OVLY-02]
coverage:
  - id: D1
    description: "Native tray registration consumes the checked-in PNG and requests macOS template rendering while preserving the existing Show/Hide/Settings/Quit callbacks."
    requirement: OVLY-01
    verification:
      - kind: other
        ref: "cargo check --manifest-path src-tauri/Cargo.toml"
        status: pass
      - kind: other
        ref: "cargo test --manifest-path src-tauri/Cargo.toml"
        status: pass
      - kind: other
        ref: "pnpm exec tauri build --debug"
        status: pass
    human_judgment: true
    rationale: "The host automation can validate native setup and the built binary, but a person must confirm the macOS menu-bar or Windows notification-area icon is visually discoverable and that its menu opens."
  - id: D2
    description: "Support documentation gives one repository-root launch path, explains tray-only hidden-window behavior, distinguishes the raw automation binary, and lists evidence to record."
    requirement: OVLY-02
    verification:
      - kind: other
        ref: "rg -q 'Manual debug launch|pnpm tauri:dev|target/debug/nabrush|Cmd/Ctrl\\+Shift\\+A' docs/support-matrix.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "Existing hidden startup, mode transitions, Escape hide, scene persistence, conflict rollback, and recovery behavior continue to pass after tray icon registration."
    verification:
      - kind: e2e
        ref: "pnpm exec wdio run wdio.conf.ts --suite short-lifecycle"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-10
status: complete
---

# Phase 1: Native Overlay & Activation — Plan 08 Summary

**Discoverable macOS/Windows tray identity with template-aware PNG registration and a reproducible tray-only debug review path**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-10T02:21:00Z
- **Completed:** 2026-09-10T02:33:00Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Registered `src-tauri/icons/icon.png` with `TrayIconBuilder` through compile-time bytes and Tauri's fallible image decoder; enabled macOS template rendering while preserving all existing menu callbacks and hidden-window behavior.
- Enabled Tauri's `image-png` feature and recorded the resulting lockfile entries required by `Image::from_bytes`.
- Added manual debug launch instructions using `pnpm tauri:dev`, including tray Show/Hide expectations, the raw WebDriver binary distinction, and a device evidence checklist.

## Task Commits

Each task was committed atomically:

1. **Task 1: Register the existing tray artwork with macOS template behavior** — `8b9dd81` (feat)
2. **Task 2: Document a reproducible debug launch and tray-only review path** — `e859ad8` (docs)

## Files Created/Modified

- `src-tauri/src/tray.rs` — decodes the checked-in PNG at setup and supplies it to the native tray builder with macOS template behavior.
- `src-tauri/Cargo.toml` — enables Tauri's PNG image feature required by the fallible decoder.
- `src-tauri/Cargo.lock` — records the transitive image decoding dependencies.
- `docs/support-matrix.md` — documents `pnpm tauri:dev`, tray-only lifecycle expectations, and evidence capture.

## Verification

- `cargo check --manifest-path src-tauri/Cargo.toml` — pass.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 15 tests passed.
- `pnpm exec tauri build --debug` — pass; built `src-tauri/target/debug/nabrush` after temporarily setting the pre-existing untracked `allowBuilds` placeholders for the verification run, then restored that file unchanged.
- `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` — 5 tests passed.
- Support-matrix assertions for `Manual debug launch`, `pnpm tauri:dev`, `target/debug/nabrush`, and `Cmd/Ctrl+Shift+A` — pass.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` — reports pre-existing formatting differences across unrelated Phase 1 Rust files; the changed `src-tauri/src/tray.rs` passes standalone `rustfmt --check`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Enabled Tauri PNG decoding for the planned fallible image path**

- **Found during:** Task 1 (Register the existing tray artwork with macOS template behavior)
- **Issue:** Tauri's `Image::from_bytes` API is feature-gated; the existing dependency enabled tray support but not `image-png`, so the planned compile-time PNG registration could not compile.
- **Fix:** Added the existing Tauri `image-png` feature and committed the deterministic lockfile update.
- **Files modified:** `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- **Verification:** Cargo check, 15 native tests, debug build, and WebDriver smoke all pass.
- **Committed in:** `8b9dd81`

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Required dependency feature only; no new package or runtime surface was introduced.

## Issues Encountered

- The repository's existing Rust files outside this plan are not rustfmt-clean, so the plan-level `cargo fmt --check` remains red for pre-existing differences. The changed tray file is formatted and all compile/test/build/smoke checks pass.
- The manual tray icon, cross-application shortcut, and Windows evidence rows still require physical-device observation as described in the support matrix; automation cannot certify those visual and cross-app behaviors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The tray registration and documented debug review path are ready. Complete the pending macOS/Windows manual evidence in `docs/support-matrix.md` before closing the Phase 1 UAT gap and marking the phase fully verified.

## Self-Check: PASSED

- Summary file exists at the expected phase path.
- Task commits `8b9dd81` and `e859ad8` are present in git history.
- Tray wiring and support-matrix acceptance checks pass.

---
*Phase: 01-native-overlay-activation*
*Plan: 08*

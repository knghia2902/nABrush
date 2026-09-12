---
phase: 04-editing-ink-lifecycle
plan: 01
subsystem: annotation
tags: [tauri, rust, react, typescript, canvas, lifecycle, webdriverio]

# Dependency graph
requires:
  - phase: 03-core-annotation-tools
    provides: "Typed shared annotation scene, drawable tools, and native overlay bridge"
provides:
  - "Persistent and Vanishing lifecycle snapshots on every drawable annotation family"
  - "Native commit-time timestamps, independent expiry, final-second fade, and shared scene updates"
  - "Lifecycle and duration controls that preserve per-tool style memory"
affects: [04-02-undo-redo-and-text-editing, 05-capture-export]

# Actuals (#2632), measured as characters/4 over the realized plan diff.
actuals:
  tokens: 22647
  tasks: 2
  commits: 2
commits: 2
plan_head_before: 217b3f7d1c195368f25fc58b30358bb7d2ad3bad

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native SceneStore stamps lifecycle metadata at commit and broadcasts complete canonical snapshots."
    - "Shared renderer redraws final-second fades from native lifecycle-frame events, including hidden WebViews."
key-files:
  created: []
  modified:
    - src/types/overlay.ts
    - src/state/annotation.ts
    - src/state/annotation.test.ts
    - src/components/OverlaySurface.tsx
    - src/components/overlay-surface.test.tsx
    - src/components/AnnotationToolbar.tsx
    - src/components/annotation-toolbar.test.tsx
    - src/App.tsx
    - src/styles.css
    - src-tauri/src/overlay_registry.rs
    - src-tauri/src/main.rs
    - tests/e2e/editing-ink-lifecycle.e2e.ts
    - wdio.conf.ts

key-decisions:
  - "Snapshot lifecycle mode and duration when an item is committed; later control changes affect future annotations only."
  - "Keep expiry in the canonical native scene and drive fade redraws independently of visibility or click-through state."
patterns-established:
  - "All overlays apply native whole-scene snapshots rather than mutating display-local annotation state."
  - "Text remains an exact Unicode string; lifecycle deadlines use only the native commit timestamp and captured duration."
requirements-completed: [EDIT-03, EDIT-04, EDIT-05]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Users can select Persistent or Vanishing and configure duration without changing already committed lifecycle snapshots."
    requirement: EDIT-03
    verification:
      - kind: unit
        ref: "src/state/annotation.test.ts#preserves Unicode text and the lifecycle snapshot captured when its draft was placed"
        status: pass
      - kind: e2e
        ref: "macOS WebKit: phase4-editing suite, native lifecycle metadata and duration-change assertion"
        status: pass
    human_judgment: true
    rationale: "The native end-to-end run was available only on macOS in this execution; Windows behavior remains host-specific and unverified."
  - id: D2
    description: "Pen, highlighter, line, arrow, rectangle, ellipse, and committed text retain independent Vanishing/style snapshots; Unicode text is unchanged."
    requirement: EDIT-04
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx#keeps independent deadlines for every created annotation kind and never expires Persistent items"
        status: pass
      - kind: integration
        ref: "src-tauri/src/overlay_registry.rs#scene_store_preserves_long_unicode_text_exactly_and_expires_only_by_its_lifecycle_clock"
        status: pass
      - kind: e2e
        ref: "macOS WebKit: phase4-editing suite, native snapshot assertions for all seven drawable families"
        status: pass
    human_judgment: true
    rationale: "Automation covered every drawable family on macOS; Windows-native coverage was unavailable and is not inferred."
  - id: D3
    description: "Vanishing annotations remain visible through their selected interval, fade in the final second, and expire without resurrection while hidden."
    requirement: EDIT-05
    verification:
      - kind: integration
        ref: "src-tauri/src/overlay_registry.rs#scene_store_expires_mixed_items_at_independent_deadlines_without_reordering_or_merging_geometry"
        status: pass
      - kind: e2e
        ref: "macOS WebKit: phase4-editing suite, real pen fade and hidden native expiry tracer"
        status: pass
    human_judgment: true
    rationale: "A macOS native tracer passed; the corresponding Windows host-specific run remains outstanding."

# Metrics
duration: 69min
completed: 2026-09-12
status: complete
---

# Phase 4 Plan 1: Editing & Ink Lifecycle Summary

**Native-timestamped Persistent and Vanishing annotations with shared final-second fade and expiry across every drawable tool family.**

## Performance

- **Duration:** 1h 9m
- **Started:** 2026-09-12T03:23:25Z
- **Completed:** 2026-09-12T04:32:12Z
- **Tasks:** 2
- **Files modified:** 13 plan files

## Accomplishments

- Added lifecycle mode/duration controls and creation-time metadata while preserving existing per-tool styles and canonical shared-scene commits.
- Added a native, visibility-independent expiry scheduler and deterministic final-second fade; native scene snapshots remove expired items across overlays.
- Extended unit, native, and real desktop E2E coverage for pen, highlighter, line, arrow, rectangle, ellipse, and text, including equal deadlines, stable order, identical/touching geometry, and exact Unicode preservation.

## Task Commits

Each task was committed atomically:

1. **Task 04-01-01: Trace one Vanishing pen mark through the shared scene and expiry path** — `bc493b8` (`feat`)
2. **Task 04-01-02: Expand lifecycle metadata and timing coverage to every annotation kind** — `3bc05cc` (`test`)

## Files Created/Modified

- `src/types/overlay.ts`, `src/state/annotation.ts`, `src/App.tsx` — typed lifecycle state and controlled creation-time snapshots.
- `src/components/AnnotationToolbar.tsx`, `src/styles.css` — scene-excluded lifecycle and duration controls with existing toolbar positioning behavior.
- `src/components/OverlaySurface.tsx` — lifecycle-aware shared rendering, deterministic fade, and native lifecycle-frame redraw handling.
- `src-tauri/src/overlay_registry.rs`, `src-tauri/src/main.rs` — validated native metadata, canonical expiry, and shared snapshot broadcasts.
- `src/state/annotation.test.ts`, `src/components/overlay-surface.test.tsx`, `src/components/annotation-toolbar.test.tsx` — state, timing, rendering, and control tests.
- `tests/e2e/editing-ink-lifecycle.e2e.ts`, `wdio.conf.ts` — macOS native lifecycle tracer and Phase 4 suite registration.

## Decisions Made

- Keep `stylesByTool` as the sole style store; capture lifecycle and style independently on each committed item.
- Let the native canonical scene own commit timestamps and expiry; apply whole snapshots rather than optimistic display-local mutation.
- Treat eraser as an editing operation rather than a drawable item family; the seven creation tools are the applicable Vanishing-item coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kept the fade renderer active when macOS suspends hidden WebView timers**
- **Found during:** Task 1 (tracer feedback gate)
- **Issue:** A background WKWebView suspended JavaScript timer/animation-frame redraws, so a still-retained mark could miss visible final-second fade frames even though native expiry continued.
- **Fix:** The native scheduler emits `scene-lifecycle-frame` during the bounded fade window; each overlay redraws through the existing shared renderer. Expiry remains native and visibility-independent.
- **Files modified:** `src-tauri/src/main.rs`, `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`
- **Verification:** Focused Vitest, `overlay_registry`, production build, Tauri debug build, and the real macOS tracer all passed.
- **Committed in:** `bc493b8`

**2. [Rule 3 - Blocking issue] Isolated the Phase 4 WebDriver server from a pre-existing user process**
- **Found during:** Task 1
- **Issue:** The default WebDriver port `4445` was already occupied by a user-owned app; stopping or reconfiguring that process was outside scope.
- **Fix:** Ran the Phase 4 suite on port `4457` through the existing `TAURI_WEBDRIVER_PORT` override and left the original process untouched.
- **Files modified:** `wdio.conf.ts`
- **Verification:** `TAURI_WEBDRIVER_PORT=4457 caffeinate -u -t 120 pnpm exec wdio run wdio.conf.ts --suite phase4-editing` passed on macOS.
- **Committed in:** `bc493b8`

**Total deviations:** 2 auto-fixed (Rule 1: 1, Rule 3: 1). Both were necessary to complete the planned native tracer without expanding product scope.

## Verification

- `pnpm exec vitest run src/state/annotation.test.ts src/components/overlay-surface.test.tsx` — 35 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` — 17 tests passed.
- `pnpm build` — passed.
- `pnpm tauri:build --debug` — passed during Task 1.
- `TAURI_WEBDRIVER_PORT=4457 caffeinate -u -t 120 pnpm exec wdio run wdio.conf.ts --suite phase4-editing` — 2 macOS/WebKit tests passed, including hidden expiry and all seven drawable families.

The Cargo test target emitted existing dead-code warnings. Windows-native E2E was unavailable on this macOS host; no Windows parity is claimed. That unrun host-specific verification is recorded in `.planning/WINDOWS.md`.

## Issues Encountered

- The initial long Unicode Rust fixture exceeded the existing 4,096-byte text validation bound. The fixture was shortened while remaining long, and a one-character control item with the same lifecycle clock was added to prove that expiry is independent of text length.
- A fade assertion initially expected full opacity inside the final-second window; its probe was corrected to assert the exact full-opacity and fade boundaries.

## User Setup Required

None — no external service or secret configuration is required.

## Next Phase Readiness

Plan 04-01 is complete and committed. Plan 04-02 can build canonical undo/redo, clear, and text-edit history on the shared snapshot path; expiry should continue to remove items without adding its own history operation. Windows E2E remains a separate host-specific verification item.

---
*Phase: 04-editing-ink-lifecycle*
*Completed: 2026-09-12*

## Self-Check: PASSED

- SUMMARY.md exists and passes `gsd-tools verify-summary`.
- Task commits `bc493b8` and `3bc05cc` exist in the repository history.
- Plan commit ledger measures two task commits from `plan_head_before`.

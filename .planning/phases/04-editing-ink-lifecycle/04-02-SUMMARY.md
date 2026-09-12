---
phase: 04-editing-ink-lifecycle
plan: 02
subsystem: annotation-editing
tags: [tauri, rust, react, typescript, canvas, undo-redo, webdriverio]

# Dependency graph
requires:
  - phase: 04-editing-ink-lifecycle
    plan: 01
    provides: Lifecycle-aware canonical SceneStore snapshots and native expiry.
provides:
  - Bounded canonical undo/redo history for draw, text, move, erase, and clear-all operations.
  - History-safe text commit, cancel, outside-click, and move behavior.
  - Regression coverage for per-tool style memory and lifecycle/history invariants.
affects: [05-capture-export, verify-work]

# Actuals (#2632), measured at summary creation from the realized plan diff.
actuals:
  tokens: 15012
  tasks: 3
  commits: 3
commits: 3
plan_head_before: 7959922a7b32031e044f3b0a774e391b5ee84152

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Native SceneStore owns bounded scene history and broadcasts complete canonical snapshots.
    - Text drafts stay transient; a committed text move is one scene operation.
    - Per-tool creation styles remain in stylesByTool, independent of scene history.

key-files:
  created: []
  modified:
    - src-tauri/src/main.rs
    - src-tauri/src/overlay_registry.rs
    - src/App.tsx
    - src/components/AnnotationToolbar.tsx
    - src/components/OverlaySurface.tsx
    - src/components/annotation-toolbar.test.tsx
    - src/state/annotation.test.ts
    - src/state/annotation.ts
    - src/styles.css
    - src/types/overlay.ts
    - tests/e2e/editing-ink-lifecycle.e2e.ts

key-decisions:
  - "Keep native SceneStore as the sole history source; restore complete ordered snapshots, including item style and lifecycle metadata."
  - "Expiry itself adds no history entry; undo and redo remain attached to the original item creation operation."
  - "Keep stylesByTool as the sole in-session style memory, separate from restored scene contents."

patterns-established:
  - "All overlays receive one complete native scene snapshot; no display-local undo stacks are introduced."
  - "Empty and no-op operations do not create history entries; a new mutation after Undo clears the redo branch."
  - "Text draft keyboard and outside-click transitions converge on one commit boundary."

requirements-completed: [EDIT-01, EDIT-02, EDIT-06]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Canonical drawing, erase, clear-all, Undo, Redo, shortcuts, and redo-branch invalidation preserve exact scene order."
    requirement: EDIT-01
    verification:
      - kind: integration
        ref: "cargo test --manifest-path src-tauri/Cargo.toml overlay_registry — 23 passed"
        status: pass
      - kind: e2e
        ref: "macOS/WebKit: phase4-editing WDIO suite — 4 passed"
        status: pass
    human_judgment: true
    rationale: "Native overlay and shortcut behavior remains host-specific; Windows validation was unavailable on this macOS host."
  - id: D2
    description: "Text drafts commit once, cancel correctly, preserve Unicode, and move as one undoable operation."
    requirement: EDIT-01
    verification:
      - kind: unit
        ref: "Vitest: src/state/annotation.test.ts and src/components/overlay-surface.test.tsx"
        status: pass
      - kind: e2e
        ref: "macOS/WebKit: phase4-editing WDIO text commit/cancel/outside-click/move coverage"
        status: pass
    human_judgment: true
    rationale: "The desktop run exercised macOS WebKit only; Windows text-input and pointer behavior needs its own host run."
  - id: D3
    description: "Per-tool style memory remains independent across tool selection, while scene history and expiry preserve item snapshots."
    requirement: EDIT-06
    verification:
      - kind: unit
        ref: "src/state/annotation.test.ts — style patches and tool switching across all eight tools"
        status: pass
      - kind: integration
        ref: "src-tauri/src/overlay_registry.rs — expiry, invalid history, geometry identity/order, and no-op move tests"
        status: pass
      - kind: e2e
        ref: "macOS/WebKit: phase4-editing WDIO suite verifies committed style/lifecycle snapshots for drawable tools"
        status: pass
    human_judgment: true
    rationale: "The state matrix and item-snapshot path are automated, but direct custom-control interaction after Undo/Redo was not retained as a WDIO probe after WebKit input-control behavior proved unreliable; verify live controls during UAT."

# Metrics
duration: 57min
completed: 2026-09-12
status: complete
---

# Phase 4 Plan 2: Undo/Redo and History-Safe Text Summary

**Canonical history now restores lifecycle-aware annotation snapshots while text commit/move remains single-step and per-tool style memory stays independent.**

## Performance

- **Duration:** 57 minutes
- **Started:** 2026-09-12T04:47:50Z
- **Completed:** 2026-09-12T05:45:31Z
- **Tasks:** 3
- **Files modified by plan commits:** 11

## Accomplishments

- Added bounded native past/future snapshots for drawing, text creation/move, erase, and clear-all; empty actions are no-ops and new edits invalidate redo.
- Routed toolbar and keyboard history actions through the shared native snapshot path, preserving item IDs, order, styles, and lifecycle metadata.
- Made Enter, Shift+Enter, Escape, outside-click, and text movement history-safe; added regressions for expiry, equal/touching geometry, invalid history, no-op moves, and all-tool style memory.

## Task Commits

1. **Task 04-02-01: Trace one draw, undo, redo, and clear-all operation through the canonical scene** — `356c6cc` (`feat`)
2. **Task 04-02-02: Make text commit, cancel, outside-click, and move operations history-safe** — `efcebf9` (`feat`)
3. **Task 04-02-03: Verify per-tool style memory and cross-feature history invariants** — `4b69deb` (`test`)

## Files Created/Modified

- `src-tauri/src/overlay_registry.rs`, `src-tauri/src/main.rs` — canonical bounded history, validated restore, undo/redo/clear commands, and shared snapshots.
- `src/App.tsx`, `src/types/overlay.ts`, `src/state/annotation.ts` — history command orchestration, shared contracts, keyboard routing, and style/text state.
- `src/components/AnnotationToolbar.tsx`, `src/components/OverlaySurface.tsx`, `src/styles.css` — history controls and history-safe text interactions.
- `src/state/annotation.test.ts`, `src/components/annotation-toolbar.test.tsx` — focused style-memory and toolbar regressions; the existing overlay-surface regression suite was included in final Vitest verification.
- `tests/e2e/editing-ink-lifecycle.e2e.ts` — desktop shared-scene history and text lifecycle coverage.

## Decisions Made

- Preserve full ordered scene snapshots in the native store rather than maintaining per-window history.
- Keep expiry out of the history stack; creation remains undoable after an item expires.
- Keep style/lifecycle creation controls separate from historical scene snapshots.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Kept Clear All reachable from the toolbar**
- **Found during:** Task 04-02-01
- **Issue:** The native clear command would otherwise have no user-facing entry point.
- **Fix:** Added a disabled-when-empty, scene-excluded Clear All control that creates one undoable operation.
- **Files modified:** `src/components/AnnotationToolbar.tsx`, `src/App.tsx`, related tests.
- **Verification:** Vitest, native history tests, build, and macOS/WebKit WDIO passed.
- **Committed in:** `356c6cc`

**2. [Rule 1 - Test assumption] Matched the history tracer to lifecycle and toolbar state contracts**
- **Found during:** Task 04-02-01
- **Issue:** The tracer assumed expired-item Undo was unavailable and expected Redo immediately after erase; the specified history retains creation history after expiry, while erase itself is a new branch.
- **Fix:** Asserted availability from the canonical snapshot, expected Undo-only after erase, and explicitly selected Pen after prior suite state.
- **Files modified:** `tests/e2e/editing-ink-lifecycle.e2e.ts`.
- **Verification:** macOS/WebKit phase4-editing suite passed 4/4.
- **Committed in:** `356c6cc`.

**3. [Rule 1 - Test-discovered input edge] Prevented stale text-click suppression after a move gesture**
- **Found during:** Task 04-02-02
- **Issue:** A stale click-suppression flag could consume the next text placement after dragging committed text.
- **Fix:** Separated text-draft suppression from ordinary click suppression and reset it on the next new text gesture; retained one commit guard for outside-click and Enter.
- **Files modified:** `src/components/OverlaySurface.tsx`, `src/state/annotation.test.ts`, `tests/e2e/editing-ink-lifecycle.e2e.ts`.
- **Verification:** Focused Vitest, build, and macOS/WebKit phase4-editing suite passed.
- **Committed in:** `efcebf9`.

### Deferred Validation

- A separate WDIO probe that changed native color/range/fill controls and then checked their values across Undo/Redo was not retained: WebKit WebDriver `setValue` did not reliably drive the controlled color/range/select inputs. The complete per-tool state matrix passes in Vitest, and the desktop suite verifies committed style/lifecycle snapshots; direct live-control/history interaction remains a UAT check.
- Windows-native WDIO was not available on this macOS host. No Windows parity is inferred; the existing Windows verification ledger remains open.

**Total deviations:** 3 auto-fixed; 2 validation limitations documented. No unrelated dirty user changes were staged.

## Verification

- `pnpm exec vitest run src/state/annotation.test.ts src/components/annotation-toolbar.test.tsx src/components/overlay-surface.test.tsx` — 45 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` — 23 passed; existing dead-code warnings only.
- `pnpm build` — TypeScript and Vite build passed.
- `TAURI_WEBDRIVER_PORT=4457 caffeinate -u -t 180 pnpm exec wdio run wdio.conf.ts --suite phase4-editing --logLevel error` — 4 passed on **macOS/WebKit**.
- `cargo fmt --check` — not clean: rustfmt reports differences across the crate beyond this plan's scope; no workspace-wide reformat was applied.

## Issues Encountered

- The WDIO default port was already occupied, so verification used the existing `TAURI_WEBDRIVER_PORT=4457` override and left the user-owned process untouched.
- The built-in WebDriver did not reliably set native color/range/select controls in the exploratory style-memory probe; this probe was removed, while unit-state and scene-snapshot coverage remains.

## User Setup Required

None.

## Next Phase Readiness

Phase 5 can build on the canonical shared scene and ordered history snapshots for capture/export. Keep Windows overlay/history validation and the live style-control Undo/Redo interaction in UAT; macOS evidence does not establish Windows parity.

## Self-Check: PASSED

---
*Phase: 04-editing-ink-lifecycle*
*Completed: 2026-09-12*

---
phase: 03-core-annotation-tools
plan: 03
subsystem: annotation
tags: [react, typescript, canvas, rust, tauri, text-input, hit-testing, eraser]

# Dependency graph
requires:
  - phase: 03-core-annotation-tools
    provides: typed retained scene union, canonical geometry, per-tool styles, and whole-snapshot IPC
provides:
  - scene-excluded click-to-place text drafting with IME-safe Enter/Shift+Enter/Esc lifecycle
  - measured multiline Canvas text rendering and canonical type-specific topmost hit testing
  - hover-previewed click-only eraser with atomic native single-item/no-op snapshot mutation
affects: [03-04, annotation-rendering, editing, export]

# Actuals (#2632)
actuals:
  tokens: 9493
  tasks: 2
  commits: 2
plan_head_before: fb3dfca65892fa57338be29464d203913e31ade5
commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Text drafts remain transient React state and become retained Canvas data only after an explicit non-composing commit."
    - "Eraser targeting converts to canonical coordinates, scans the retained scene in reverse order, and sends one selected ID across the native boundary."

key-files:
  created: []
  modified:
    - src/types/overlay.ts
    - src/state/annotation.ts
    - src/state/annotation.test.ts
    - src/components/OverlaySurface.tsx
    - src/components/overlay-surface.test.tsx
    - src/App.tsx
    - src/styles.css
    - src-tauri/src/overlay_registry.rs
    - src-tauri/src/main.rs

key-decisions:
  - "Use a 6 logical px hit-test padding with stroke half-width, shape fill/ring, ellipse equation, and measured text-line bounds."
  - "Render committed text with Canvas fillText per line at a deterministic 1.2 text-size line height; the textarea is scene-excluded and draft-only."
  - "Eraser never captures the pointer or erases on move/up; native erase validates the ID, removes at most one item, and broadcasts even for no-op."

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06]

coverage:
  - id: D1
    description: "Text draft placement, IME-safe keyboard lifecycle, measured multiline Canvas rendering, and canonical text hit bounds."
    requirement: DRAW-05
    verification:
      - kind: unit
        ref: "src/state/annotation.test.ts"
        status: pass
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reverse-order type-specific hit testing and click-only eraser selection with no retained chrome state."
    requirement: DRAW-06
    verification:
      - kind: unit
        ref: "src/state/annotation.test.ts"
        status: pass
      - kind: integration
        ref: "cargo test --manifest-path src-tauri/Cargo.toml overlay_registry"
        status: pass
      - kind: other
        ref: "pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Native overlay toolbar exclusion, text IME focus behavior, hover highlight, and click-through behavior on macOS and Windows."
    requirement: DRAW-01
    verification:
      - kind: manual_procedural
        ref: "macOS/Windows native visual and IME check from 03-VALIDATION.md"
        status: unknown
    human_judgment: true
    rationale: "This shell provides no Windows host and no automated native WebDriver run for the phase-3 visual/click-through matrix."

# Metrics
duration: 15min
completed: 2026-09-11
status: complete
---

# Phase 3 Plan 3: Text Drafting and Single-Item Eraser Summary

**Scene-excluded text drafting and measured Canvas text now pair with deterministic topmost hit testing and atomic click-only native erasure.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-10T18:40:53Z
- **Completed:** 2026-09-10T18:55:44Z
- **Tasks:** 2 planned tasks completed
- **Files modified:** 9 unique tracked source/test files

## Accomplishments

- Added canonical text draft state, immediate focused textarea placement, non-composing Enter commit, Shift+Enter insertion, Esc cancellation, focus/mode cancellation, typed text items, and per-line Canvas rendering.
- Added pure measured text bounds and type-specific hit testing for strokes, line/shape fill and rings, ellipses, and text; reverse scene order selects the topmost ID.
- Added eraser hover highlighting with no pointer capture, one-click-only native mutation, whole-snapshot no-op broadcasts, toolbar visibility exclusion outside interactive mode, and bounded native text line validation.

## Task Commits

Each task was committed atomically:

1. **Task 03-03-01: Add click-to-place text draft and canonical type-specific hit-test helpers** - `829642d` (feat)
2. **Task 03-03-02: Wire hover-highlight eraser to an atomic native single-item mutation** - `5f0e71b` (feat)

## Files Created/Modified

- `src/types/overlay.ts` - Adds the transient `TextDraft` contract.
- `src/state/annotation.ts` - Adds draft transitions, text measurement/bounds, typed item creation, and canonical hit tests.
- `src/state/annotation.test.ts` - Covers draft lifecycle, IME guard, bounds, type-specific padding, and overlap order.
- `src/components/OverlaySurface.tsx` - Renders text, owns draft focus/lifecycle, computes eraser hover, and performs click-only selection.
- `src/components/overlay-surface.test.tsx` - Verifies multiline Canvas text calls and retained-scene rendering behavior.
- `src/App.tsx` - Connects transient draft state and the `erase_scene_item` snapshot bridge; limits toolbar to interactive mode.
- `src/styles.css` - Styles scene-excluded text editor chrome.
- `src-tauri/src/overlay_registry.rs` - Adds validated atomic erase and exact-one/no-op/native text-bound tests.
- `src-tauri/src/main.rs` - Registers and broadcasts the `erase_scene_item` command.

## Decisions Made

- Chose 6 logical px hit padding and preserved canonical coordinates through all hit-test paths.
- Kept text editing strictly draft-only; committed text is immutable in this phase and is rendered solely through Canvas data APIs.
- Kept eraser interaction read-only during hover/move and constrained native mutation to one validated ID with deterministic whole snapshots.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved new Canvas and keyboard-path type errors**
- **Found during:** Task 03-03-01 verification
- **Issue:** The new text renderer needed explicit Canvas context members and React’s keyboard event type exposes composition state through the native event; a shape union also needed explicit narrowing.
- **Fix:** Added the required typed context members, narrowed shape geometry before rendering, and used `nativeEvent.isComposing`; updated the focused renderer fixture accordingly.
- **Files modified:** `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`
- **Verification:** Targeted state/renderer tests and `pnpm build` pass.
- **Committed in:** `829642d`

**2. [Rule 1 - Bug] Prevented repeated state updates while cancelling an absent draft**
- **Found during:** Task 03-03-02 lifecycle review
- **Issue:** Mode-change/blur cleanup can run while no draft exists; unconditionally replacing annotation state would create an unnecessary render loop in hidden mode.
- **Fix:** Made draft cancellation return the existing immutable state when `textDraft` is already null.
- **Files modified:** `src/App.tsx`
- **Verification:** Production build and full frontend suite pass.
- **Committed in:** `5f0e71b`

**3. [Rule 2 - Missing Critical] Bounded native text line count**
- **Found during:** Task 03-03-02 trust-boundary review
- **Issue:** Existing native validation bounded text bytes but did not independently bound newline count, despite the plan threat mitigation requiring bounded text size and line count.
- **Fix:** Rejected text with more than 256 newline-separated lines before scene mutation and added a retained-snapshot regression.
- **Files modified:** `src-tauri/src/overlay_registry.rs`
- **Verification:** Targeted and full Cargo suites pass.
- **Committed in:** `5f0e71b`

---

**Total deviations:** 3 auto-fixed (1 Rule 1, 1 Rule 2, 1 Rule 3)
**Impact on plan:** All fixes were directly required for correctness or the declared trust-boundary mitigations; no dependency or product-scope expansion was introduced.

## Issues Encountered

- A test fixture initially placed the pointer outside the configured stroke hit radius; the fixture was corrected and the targeted suite passed.
- Cargo continues to report 18 pre-existing dead-code warnings in unrelated controller/display/platform seams.
- Native macOS/Windows visual verification of IME behavior, toolbar exclusion, hover appearance, click-through, and multi-display parity remains a manual phase-level check; no Windows host was available in this shell.

## User Setup Required

None - no external service configuration or package installation required.

## Known Stubs

None found in the files modified by this plan.

## Next Phase Readiness

The shared retained scene now supports the complete Phase 3 tool vocabulary, including deliberate text creation and safe single-item erasure. Plan 03-04 can exercise the real native toolbar, IME focus lifecycle, hover highlight, click-through, and multi-display behavior; committed-text editing and broader history remain correctly deferred to Phase 4.

---
*Phase: 03-core-annotation-tools*
*Plan: 03*
*Completed: 2026-09-11*

## Self-Check: PASSED

- Summary file exists at the required phase path.
- Task commits `829642d` and `5f0e71b` are present and are the measured 2 commits after plan base `fb3dfca65892fa57338be29464d203913e31ade5`.
- Full verification passed: `pnpm test` (46 tests), `cargo test --manifest-path src-tauri/Cargo.toml` (42 tests), and `pnpm build`.
- No plan-owned stub markers or skipped automated verification remain.

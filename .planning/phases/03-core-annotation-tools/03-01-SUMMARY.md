---
phase: 03-core-annotation-tools
plan: 01
subsystem: annotation
tags: [react, typescript, canvas, rust, tauri, scene-store, toolbar]

requires:
  - phase: 02-display-topology-platform-parity
    provides: canonical display coordinates, per-viewport transforms, DPR canvas sizing, shared scene snapshot bridge, and TOOL_ORDER
provides:
  - typed retained scene items and native validation for the full annotation vocabulary
  - realtime canonical pen/highlighter preview with one valid pointer-up commit
  - persistent per-tool style state and scene-excluded bottom toolbar/property popover
affects: [03-02, 03-03, 03-04, annotation-rendering, export]

actuals:
  tokens: 17219
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Canvas gestures keep a transient styled candidate separate from the canonical retained SceneSnapshot until a valid end event."
    - "Rust normalizes the known legacy stroke shape, then validates typed discriminators, nested keys, finite ranges, and bounded payloads before mutation."
    - "Tool selection and style memory live in immutable React session state; toolbar and property chrome remain outside semantic scene data."

key-files:
  created:
    - src/state/annotation.ts
    - src/state/annotation.test.ts
  modified:
    - src/types/overlay.ts
    - src/components/OverlaySurface.tsx
    - src/components/overlay-surface.test.tsx
    - src/App.tsx
    - src/styles.css
    - src/state/overlay.test.ts
    - src-tauri/src/overlay_registry.rs

key-decisions:
  - "Keep kind as the retained scene category and add typed tool/style/payload fields for compatibility with the Phase 2 scene wire contract."
  - "Use 2 logical px pen/outline defaults and 12 logical px at 0.35 opacity for the highlighter, with all styles captured per gesture."
  - "Treat duplicate IDs as idempotent replay, including known legacy/incomplete replays, while rejected new payloads leave the prior snapshot unchanged."

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06]

coverage:
  - id: D1
    description: "Typed canonical SceneItem model and Rust SceneStore validation support all eight tools, bounded styles/geometry/text, legacy stroke normalization, and replay-idempotent retention."
    requirement: DRAW-01
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx"
        status: pass
      - kind: unit
        ref: "src/state/annotation.test.ts"
        status: pass
      - kind: integration
        ref: "cargo test --manifest-path src-tauri/Cargo.toml overlay_registry"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pen/highlighter pointer samples convert once to canonical coordinates, render realtime transient feedback, snapshot style at pointer-down, and commit one retained item only on a valid pointer-up."
    requirement: DRAW-02
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false
  - id: D3
    description: "VisibleInteractive exposes the ordered persistent toolbar and active-tool property popover with explicit scene-excluded markers while click-through remains native-controlled."
    requirement: DRAW-03
    verification:
      - kind: unit
        ref: "src/state/annotation.test.ts"
        status: pass
      - kind: manual_procedural
        ref: "macOS/Windows native visual check of toolbar placement and click-through behavior"
        status: unknown
    human_judgment: true
    rationale: "Transparent native-window hit-testing, focusability, toolbar placement, and click-through behavior require a real macOS/Windows host; this plan does not include a native E2E suite."

duration: 12min
completed: 2026-09-10
status: complete
commits: 3
plan_head_before: 58fb7563f8f3569d69077b3b4d05c031beb093c1
---

# Phase 3 Plan 1: Typed Pen/Highlighter Tracer and Persistent Tool Chrome Summary

**Canonical pen/highlighter gestures now stream through a typed, validated retained scene with independent tool styles and a scene-excluded presenter toolbar.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-10T18:15:21Z
- **Completed:** 2026-09-10T18:27:08Z
- **Tasks:** 2 planned tasks completed
- **Files modified:** 9 unique tracked source/test files

## Accomplishments

- Extended the TypeScript scene model with typed stroke, shape, and text payloads, canonical geometry, immutable styles, and all eight platform-neutral tools.
- Added realtime transient pen/highlighter rendering over the retained scene, canonical pointer conversion, per-gesture style snapshots, cancellation on Escape/mode/focus loss, and one valid commit through the existing `commit_scene_item` bridge.
- Replaced loose native scene validation with typed serde parsing plus ID, range, finite-value, size, nested-key, and geometry/tool validation; duplicate IDs remain idempotent and rejects preserve the previous snapshot.
- Added immutable per-tool style memory and a compact bottom toolbar/property popover rendered only in `VisibleInteractive`, with `data-scene-excluded="true"` chrome markers and explicit interactive descendants.

## Task Commits

Each task was committed atomically:

1. **Task 03-01-01: Trace typed pen/highlighter gesture from pointer to retained SceneStore** - `9cdb6f3` (feat)
2. **Task 03-01-02: Add persistent tool selection, compact property popover, and per-tool style state** - `86eaef8` (feat)

Additional correctness fix committed during final trust-boundary review:

3. **Nested scene payload validation hardening** - `ff641bf` (fix)

## Files Created/Modified

- `src/types/overlay.ts` - Typed retained scene union, geometry, styles, tool discriminators, and compatibility defaults.
- `src/components/OverlaySurface.tsx` - Canonical transient gesture lifecycle and styled Canvas rendering.
- `src/components/overlay-surface.test.tsx` - Transform, DPR, transient isolation, style snapshot, and highlighter renderer coverage.
- `src/state/annotation.ts` - Immutable active-tool and per-tool style session state.
- `src/state/annotation.test.ts` - Default, selection, independence, and immutability coverage.
- `src/App.tsx` - Generic scene commit bridge and interactive annotation toolbar/property popover.
- `src/styles.css` - Bottom chrome layout, focus treatment, and pointer-event layering.
- `src-tauri/src/overlay_registry.rs` - Typed scene model, normalization, strict validation, and retained-scene tests.
- `src/state/overlay.test.ts` - Existing Phase 2 scene fixture adapted to the typed style contract.

## Decisions Made

- Preserved the `stroke`/`shape`/`text` `kind` categories and added `tool` plus typed payload fields rather than changing the shared scene event shape.
- Used thin 2px logical outline defaults, a 12px/0.35-opacity yellow highlighter default, and style snapshots to prevent later property edits from changing committed items.
- Kept toolbar and popover as sibling DOM chrome outside Canvas scene data, rendered only while interactive so native click-through semantics remain authoritative.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted the existing Phase 2 scene test fixture to the required typed style contract**
- **Found during:** Task 03-01-01 build verification
- **Issue:** Existing `src/state/overlay.test.ts` constructed a legacy stroke literal that no longer satisfied the typed `StrokeSceneItem` contract.
- **Fix:** Reused the backwards-compatible `createStroke` helper in that test and asserted the complete typed item.
- **Files modified:** `src/state/overlay.test.ts`
- **Verification:** Full Vitest suite and production build pass.
- **Committed in:** `9cdb6f3`

**2. [Rule 3 - Blocking] Fixed native borrow-checker failure during typed normalization**
- **Found during:** Task 03-01-01 native verification
- **Issue:** The borrowed `kind` discriminator prevented inserting legacy defaults into the mutable JSON object.
- **Fix:** Copied the discriminator before applying normalization.
- **Files modified:** `src-tauri/src/overlay_registry.rs`
- **Verification:** Targeted and full Cargo suites pass.
- **Committed in:** `9cdb6f3`

**3. [Rule 2 - Missing Critical] Rejected unknown nested scene fields and typed the text discriminator**
- **Found during:** Final trust-boundary scan after plan-level verification
- **Issue:** Serde could otherwise ignore unknown keys inside style, point, and geometry objects, weakening the plan’s explicit unknown-field mitigation.
- **Fix:** Added nested key allowlists and a `TextTool` enum before typed deserialization; added regression fixtures for unknown nested keys.
- **Files modified:** `src-tauri/src/overlay_registry.rs`
- **Verification:** Full Vitest, full Cargo, and production build pass.
- **Committed in:** `ff641bf`

---

**Total deviations:** 3 auto-fixed (2 Rule 3, 1 Rule 2)
**Impact on plan:** All fixes were directly required by the typed contract or its threat-model mitigation; no new product scope or dependency was introduced.

## Issues Encountered

- Cargo reports 18 pre-existing dead-code warnings in unrelated platform/controller seams; all test suites pass and these warnings are outside this plan’s scope.
- Native macOS/Windows visual toolbar and click-through validation remains a phase-level manual requirement; no Windows host was available in this execution shell.

## User Setup Required

None - no external service configuration or package installation required.

## Next Phase Readiness

The shared typed scene and style snapshot seams are ready for line/arrow/rectangle/ellipse geometry in Plan 03-02, with toolbar selection already persistent for those tools. Text drafting and eraser can build on the same SceneItem, whole-snapshot, and scene-excluded chrome contracts.

## Self-Check: PASSED

- `03-01-SUMMARY.md` was created at the required phase path.
- Commits `9cdb6f3`, `86eaef8`, and `ff641bf` are present and are the measured 3 commits after plan base `58fb7563f8f3569d69077b3b4d05c031beb093c1`.
- Full verification passed: `pnpm test` (35 tests), `cargo test --manifest-path src-tauri/Cargo.toml` (37 tests), and `pnpm build`.
- No plan-owned stub markers or unrun automated acceptance checks remain.

---
*Phase: 03-core-annotation-tools*
*Plan: 01*
*Completed: 2026-09-10*

## Self-Check: PASSED

- Summary file exists at the required path.
- All three plan commits are present in git history.
- Measured commit count from the persisted plan ledger is 3.

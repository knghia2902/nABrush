---
phase: 03-core-annotation-tools
plan: 02
subsystem: annotation
tags: [react, typescript, canvas, rust, tauri, geometry, scene-store]

# Dependency graph
requires:
  - phase: 03-core-annotation-tools
    provides: typed retained SceneItem union, per-tool style snapshots, canonical viewport transforms, and transient gesture lifecycle from Plan 03-01
provides:
  - canonical realtime line and arrow gestures with 4px logical threshold and solid triangular arrowheads
  - canonical rectangle and ellipse gestures with normalized bounds, independent fill/stroke styles, and realtime previews
  - native typed validation for line, arrow, rectangle, and ellipse geometry with reject-before-mutate retention safety
affects: [03-03, 03-04, annotation-rendering, export]

# Actuals (#2632)
actuals:
  tokens: 8683
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All geometry gestures convert pointer samples into canonical desktop coordinates once, retain a style snapshot, render transiently, and commit one typed shape item only after threshold validation."
    - "Canvas geometry rendering uses logical dimensions under the existing DPR transform and restores fill/outline context state after each item."
    - "Rust validates geometry/tool correspondence, finite bounded values, style ranges, nested keys, and wire field names before mutating the retained snapshot."

key-files:
  created: []
  modified:
    - src/types/overlay.ts
    - src/state/annotation.ts
    - src/state/annotation.test.ts
    - src/components/OverlaySurface.tsx
    - src/components/overlay-surface.test.tsx
    - src-tauri/src/overlay_registry.rs

key-decisions:
  - "Use a shared start/end line geometry for line and arrow; arrowheads are derived Canvas output and never become a second scene item."
  - "Normalize rectangle bounds from any drag direction and derive ellipse center/radii from those bounds while preserving independent per-tool style snapshots."
  - "Keep the 4 logical px threshold in canonical space and reject zero-length lines, non-positive shape dimensions/radii, malformed styles, and oversized coordinates natively."

patterns-established:
  - "Geometry candidate helpers return null below the logical threshold, keeping pointer-move state outside the retained scene."
  - "Rotated viewports render rectangles from transformed corners and ellipses with transformed radii while preserving canonical scene data."

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06]

coverage:
  - id: D1
    description: "Line and arrow provide canonical realtime candidates, one thresholded typed commit, immutable style snapshots, and a filled triangular arrowhead aligned to the endpoint vector."
    requirement: DRAW-03
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx"
        status: pass
      - kind: integration
        ref: "cargo test --manifest-path src-tauri/Cargo.toml overlay_registry"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rectangle and ellipse provide canonical normalized geometry, realtime previews, independent fill/stroke/opacity snapshots, and positive native validation."
    requirement: DRAW-04
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx"
        status: pass
      - kind: integration
        ref: "cargo test --manifest-path src-tauri/Cargo.toml overlay_registry"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false
  - id: D3
    description: "All new geometry remains available through the shared canonical scene and existing per-viewport DPR transform pipeline without display-local mutation."
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx canonical/DPR transform regressions"
        status: pass
      - kind: other
        ref: "pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-09-11
status: complete
commits: 2
plan_head_before: ce0de64a0980b048309649277ab4bb5395f89902
nyquist_compliant: true
---

# Phase 3 Plan 2: Canonical Geometry Tools Summary

**Line, arrow, rectangle, and ellipse now render realtime canonical previews and commit validated, independently styled geometry items to the shared retained scene.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-10T18:31:00Z
- **Completed:** 2026-09-10T18:40:53Z
- **Tasks:** 2 planned tasks completed
- **Files modified:** 6 unique tracked source/test files

## Accomplishments

- Added line and arrow geometry contracts, canonical 4px thresholding, transient preview generation, one-item commits, cancellation-safe gesture handling, and solid style-matched triangular arrowheads.
- Added reverse-drag rectangle and ellipse bounds/radii helpers, independent fill/stroke/opacity rendering, and context restoration so shape styles do not leak between scene items.
- Extended Rust SceneStore validation and regression coverage for geometry/tool correspondence, finite/ranged values, unknown nested fields, duplicate IDs, and reject-before-mutate snapshot safety.
- Preserved the existing pen/highlighter implementation, canonical transforms, negative-origin/rotation behavior, and DPR pipeline.

## Task Commits

Each task was committed atomically:

1. **Task 03-02-01: Add realtime line and solid-triangle arrow gestures** - `38c2f87` (feat)
2. **Task 03-02-02: Add independent rectangle and ellipse stroke/fill gestures** - `c0dd0d2` (feat)

**Measured production commits:** 2 commits after plan base `ce0de64a0980b048309649277ab4bb5395f89902`.

## Files Created/Modified

- `src/types/overlay.ts` - Typed line, shape bounds, shape geometry, and geometry scene item contracts.
- `src/state/annotation.ts` - 4px logical geometry threshold, finite drag validation, and pure positive-bounds normalization.
- `src/state/annotation.test.ts` - Threshold and pure normalization regressions.
- `src/components/OverlaySurface.tsx` - Geometry candidate lifecycle, canonical line/shape rendering, arrowhead construction, fill/stroke rendering, and cancellation behavior.
- `src/components/overlay-surface.test.tsx` - Canonical geometry, threshold, arrowhead, reverse drag, fill isolation, context order, transform, and transient isolation tests.
- `src-tauri/src/overlay_registry.rs` - Typed geometry validation and retained-scene tests for line, arrow, rectangle, and ellipse payloads.

## Decisions Made

- Kept line and arrow as the same canonical `LineGeometry`; the arrowhead is a derived filled Canvas triangle and does not alter retained geometry or create a second commit.
- Used positive canonical shape bounds for rectangles and center/radius geometry for ellipses, with fill style read from the active tool’s immutable gesture snapshot.
- Applied the 4 logical px drag threshold after canonical conversion, while native validation independently rejects zero-length or non-positive geometry and malformed values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected ellipse wire-field deserialization**
- **Found during:** Task 03-02-02 native acceptance verification
- **Issue:** Rust enum variant fields were expecting `radius_x` and `radius_y` during deserialization, while the established TypeScript/Tauri wire contract sends `radiusX` and `radiusY`.
- **Fix:** Added explicit serde renames for both ellipse radius fields so native validation accepts the typed frontend payload and serializes the canonical camelCase contract.
- **Files modified:** `src-tauri/src/overlay_registry.rs`
- **Verification:** 10 filtered native registry tests, 41 full native tests, and frontend build pass.
- **Committed in:** `c0dd0d2` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Required for the planned TypeScript/Rust shape contract; no dependency or product-scope change.

## Issues Encountered

- Cargo continues to report 18 pre-existing dead-code warnings in unrelated platform/controller seams; all targeted and full native tests pass.
- Native macOS/Windows visual verification of arrowhead appearance, thin outline perception, and rotated/mixed-DPR alignment remains a phase-level manual check; no Windows host was available in this execution shell.

## User Setup Required

None - no external service configuration or package installation required.

## Next Phase Readiness

The shared geometry scene and renderer are ready for Plan 03-03 text drafting and eraser hit-testing. The retained scene remains canonical and validated, with transient cancellation behavior available for the next gesture branches.

## Self-Check: PASSED

- Summary file exists at the required phase path.
- Task commits `38c2f87` and `c0dd0d2` are present and are the measured 2 commits after the persisted plan base.
- Plan-level verification passed: `pnpm test` (42 tests), `cargo test --manifest-path src-tauri/Cargo.toml` (41 tests), and `pnpm build`.
- Plan-owned stub scan found no placeholder, TODO, FIXME, empty-render, or unrun verification markers.

---
*Phase: 03-core-annotation-tools*
*Plan: 02*
*Completed: 2026-09-11*

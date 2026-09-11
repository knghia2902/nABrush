---
phase: 03-core-annotation-tools
plan: 05
subsystem: ui
tags: [react, typescript, tauri, vitest, annotation-toolbar]

# Dependency graph
requires:
  - phase: 03-core-annotation-tools
    provides: Retained annotation scene, per-tool annotation styles, toolbar selectors, and native smoke-test boundary
provides:
  - Extracted AnnotationToolbar with controlled rectangle and ellipse fill controls
  - Component markup coverage and immutable per-tool fill-state assertions
affects: [phase-03-verification, native-annotation-integration]

# Actuals (#2632)
actuals:
  tokens: 3491.5
  tasks: 2
  commits: 2
  plan_head_before: cec53edcf722a6459194c6718896e9f633f688f9

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Controlled React property inputs route all patches through the active-tool callback
    - React DOM server static markup tests assert stable toolbar selectors without a UI testing dependency

key-files:
  created:
    - src/components/AnnotationToolbar.tsx
    - src/components/annotation-toolbar.test.tsx
  modified:
    - src/App.tsx
    - src/state/annotation.test.ts

key-decisions:
  - "Keep stylesByTool as the single source of truth and route fillColor/fillOpacity through the existing active-tool update callback."
  - "Use static server-rendered markup and pure state assertions to cover the native integration selectors without adding dependencies."

patterns-established:
  - "Scene-excluded toolbar chrome remains a sibling of OverlaySurface and retains the existing bottom-positioned CSS contract."
  - "Rectangle and ellipse style isolation is verified by identity and value assertions across sequential immutable patches."

requirements-completed: [DRAW-04]

coverage:
  - id: D1
    description: "Rectangle and ellipse property popovers expose controlled fill mode, fill color, and bounded fill opacity inputs through the extracted toolbar."
    requirement: DRAW-04
    verification:
      - kind: unit
        ref: "src/components/annotation-toolbar.test.tsx#renders controlled fill controls for rectangle and ellipse tools"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false
  - id: D2
    description: "Per-tool rectangle and ellipse fill patches remain immutable and independent while preserving unrelated styles."
    requirement: DRAW-04
    verification:
      - kind: unit
        ref: "src/state/annotation.test.ts#keeps rectangle and ellipse fill patches independent per tool"
        status: pass
    human_judgment: false
  - id: D3
    description: "The complete frontend regression suite remains green after toolbar extraction and fill-control coverage."
    verification:
      - kind: unit
        ref: "pnpm test"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-09-11
status: complete
commits: 2
---

# Phase 03 Plan 05: Core Annotation Tools Summary

**Extracted scene-excluded annotation toolbar with active rectangle/ellipse fill controls and immutable per-tool coverage.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-11T01:22:57Z
- **Completed:** 2026-09-11T01:26:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extracted the inline toolbar from `App.tsx` into `AnnotationToolbar.tsx` while preserving tool order, selectors, bottom chrome layering, and active-tool style routing.
- Added controlled fill-color and 0–1 fill-opacity controls to rectangle and ellipse property popovers.
- Added static-markup assertions for rectangle, ellipse, and pen plus immutable state assertions proving independent shape fill styles.
- Verified the targeted tests, full frontend test suite (49 tests), and production build.

## Task Commits

Each task was committed atomically:

1. **Task 1: Trace active-shape fill controls through the existing toolbar state path** - `b134dea` (feat)
2. **Task 2: Add source and component assertions for independent shape fill state** - `cd4409b` (test)

**Plan metadata:** final state/roadmap metadata commit follows these task commits in git history.

## Files Created/Modified

- `src/components/AnnotationToolbar.tsx` - Extracted toolbar and controlled property popover, including shape fill controls.
- `src/App.tsx` - Imports and renders the extracted toolbar through the existing callback boundary.
- `src/components/annotation-toolbar.test.tsx` - Static markup coverage for shape-only and shared controls.
- `src/state/annotation.test.ts` - Immutable per-tool rectangle/ellipse fill isolation coverage.

## Decisions Made

- Kept `stylesByTool` as the only style store and reused `updateToolStyle` through the active-tool callback.
- Preserved the existing scene-excluded, bottom-positioned toolbar/popover contract for native click-through integration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made the fill-opacity markup assertion independent of SSR attribute order**
- **Found during:** Task 2 (Add source and component assertions for independent shape fill state)
- **Issue:** The initial static-markup assertion expected `value` before `data-style-control`, but React server rendering emits those attributes in the opposite order.
- **Fix:** Asserted the complete controlled input with a semantic regular expression while retaining exact type, bounds, step, selector, and value checks.
- **Files modified:** `src/components/annotation-toolbar.test.tsx`
- **Verification:** Targeted component/state tests and `pnpm build` pass.
- **Committed in:** `cd4409b` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1)
**Impact on plan:** The adjustment only removed test brittleness; no production behavior, dependency, or scope changed.

## Issues Encountered

None beyond the assertion adjustment documented above.

## User Setup Required

None - no external service configuration or package installation required.

## Next Phase Readiness

DRAW-04’s missing toolbar controls and source-level coverage are complete. The dependent native smoke path can now drive `fillColor` and `fillOpacity` and inspect the existing committed shape style snapshot.

---
*Phase: 03-core-annotation-tools*
*Plan: 05*
*Completed: 2026-09-11*

## Self-Check: PASSED

- Summary file exists at the required phase path.
- Task commits `b134dea` and `cd4409b` are present and measured as 2 commits after plan base `cec53edcf722a6459194c6718896e9f633f688f9`.
- Targeted tests, full frontend tests (49 tests), and `pnpm build` pass.
- No plan-owned stub patterns or unexpected production files were introduced.

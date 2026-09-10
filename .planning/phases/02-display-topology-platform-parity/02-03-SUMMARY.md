---
phase: 02-display-topology-platform-parity
plan: 03
subsystem: overlay-rendering
tags: [react, typescript, canvas, tauri, multi-display, accessibility]

requires:
  - phase: 02-display-topology-platform-parity
    provides: canonical display descriptors, per-display transforms, shared scene registry, and typed native recovery errors
provides:
  - shared SceneStore bootstrap and scene-changed subscription in every overlay webview
  - canonical pointer conversion and DPR-backed per-display canvas rendering
  - Vietnamese mode and scoped recovery feedback with accessibility and scene-exclusion markers
affects: [02-04, 02-05, export, drawing]

actuals:
  tokens: 7589
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - Native scene snapshots are the sole source of truth; renderer commits return and consume SceneStore snapshots.
    - Viewport transforms clamp local samples, preserve negative origins, and size canvas backing stores per display scale.
    - Status and alert badges remain DOM chrome outside the canvas scene and carry the affected display identity.

key-files:
  created: []
  modified:
    - src/types/overlay.ts
    - src/state/overlay.ts
    - src/components/OverlaySurface.tsx
    - src/components/overlay-surface.test.tsx
    - src/components/ModeBadge.tsx
    - src/components/mode-badge.test.tsx
    - src/components/ErrorBadge.tsx
    - src/components/error-badge.test.tsx
    - src/App.tsx
    - src/styles.css

key-decisions:
  - "Keep the native Rust field names as the internal viewport contract while normalizing compatible displayId/rotation wire aliases at the React boundary."
  - "Commit pointer-up strokes through commit_scene_item and update local state only from the returned shared scene snapshot."
  - "Derive Vietnamese recovery copy from typed native error codes and gate system settings on OpenSystemSettings."

patterns-established:
  - "Every overlay client loads get_scene_snapshot, listens for scene-changed, and renders the shared scene ID rather than owning a private document."
  - "ModeBadge and ErrorBadge are scoped with data-display-id and data-scene-excluded while native hit-testing remains authoritative."

requirements-completed: [DISP-01, DISP-04]

coverage:
  - id: D1
    description: "Per-display canvas transforms canonical negative-origin and rotated scene points, uses logical viewport CSS dimensions, and allocates a DPR-scaled backing store."
    requirement: DISP-01
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false
  - id: D2
    description: "All overlay clients consume one native scene snapshot and expose identical Vietnamese mode/error feedback with scoped, scene-excluded semantics."
    requirement: DISP-04
    verification:
      - kind: unit
        ref: "src/components/mode-badge.test.tsx"
        status: pass
      - kind: unit
        ref: "src/components/error-badge.test.tsx"
        status: pass
      - kind: unit
        ref: "pnpm test"
        status: pass
    human_judgment: false
  - id: D3
    description: "Physical macOS and Windows checks confirm identical badges, placement, click-through behavior, scene exclusion, and partial viewport recovery."
    verification: []
    human_judgment: true
    rationale: "Native window hit-testing, full-screen compositor behavior, and a failed display cannot be established by the frontend unit suite."

duration: 15min
completed: 2026-09-10
status: complete
commits: 3
plan_head_before: 00b9e41e91780076073f980cf12efc5937258c94
---

# Phase 2 Plan 3: Per-display Renderer and Parity Feedback Summary

**Shared scene snapshots now drive per-display DPR canvases and consistent Vietnamese mode/error feedback across overlay webviews.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-10T18:05:00+07:00
- **Completed:** 2026-09-10T18:11:30+07:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added typed scene snapshot and viewport event contracts, native snapshot bootstrap, scene event subscription, and command-backed pointer-up commits.
- Covered negative origins, all quarter-turn rotations, mixed scale factors, bounds clamping, canonical pointer conversion, and DPR backing dimensions.
- Localized mode badges to `Đang vẽ` and `Xuyên qua`, added status roles and 16px placement, and added scoped alert badges with Vietnamese retry and platform permission actions.
- Kept badges outside scene/export data and preserved the native hit-testing boundary through renderer-only pointer-events feedback.

## Task Commits

Each task was committed atomically:

1. **Task 02-03-01: Trace shared scene events into every viewport-local canvas** - `169699e` (feat)
2. **Task 02-03-02: Render parity feedback and scoped recovery states on every viewport** - `bc206e1` (feat)

## Files Created/Modified

- `src/types/overlay.ts` - Scene snapshot, wire payload, viewport validation, and native/wire normalization contracts.
- `src/state/overlay.ts` - Renderer-facing exports for the shared viewport and scene types.
- `src/components/OverlaySurface.tsx` - Per-display transform, pointer conversion, and DPR backing helpers.
- `src/components/overlay-surface.test.tsx` - Rotation, negative-origin, bounds, scale, and backing-size fixtures.
- `src/components/ModeBadge.tsx` - Vietnamese scene-excluded per-display status feedback.
- `src/components/ErrorBadge.tsx` - Typed scoped recovery alert with retry and settings action gating.
- `src/App.tsx` - Native scene snapshot and viewport event subscriptions plus shared commit bridge.
- `src/styles.css` - UI-SPEC badge spacing, typography, wrapping, colors, and 44px action targets.

## Decisions Made

- Kept native `id`/`orientation` payloads compatible while accepting `displayId`/`rotation` aliases at the typed frontend boundary.
- Updated the renderer only from native SceneStore snapshots so a viewport cannot create a divergent private scene.
- Mapped typed topology, full-screen, and permission errors to approved Vietnamese copy and exposed system settings only for the typed recovery action.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added runtime viewport payload validation before applying native geometry.**
- **Found during:** Task 02-03-01
- **Issue:** A malformed or incomplete viewport event could otherwise produce invalid canvas dimensions or transforms.
- **Fix:** Added finite, positive geometry/scale checks and normalization for native and aliased wire fields before updating renderer state.
- **Files modified:** `src/types/overlay.ts`, `src/App.tsx`
- **Verification:** `pnpm typecheck`, transform tests, and `pnpm build` pass.
- **Committed in:** `169699e`

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** The fix hardens the planned native-to-renderer trust boundary without changing the user-visible scope.

## Issues Encountered

- Existing Phase 1 components used English copy and `role="status"` for errors; they were updated to the approved Phase 2 Vietnamese copy and alert semantics while retaining their timeout and typed-action behavior.
- Native viewport events currently use Rust `id`/`orientation`; the frontend accepts those names and the planned `displayId`/`rotation` aliases to keep the bridge explicit and forward-compatible.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The frontend renderer and feedback contract are ready for platform observer, E2E, and support-matrix work. Physical multi-display and full-screen evidence remains required for phase-level verification.

## Self-Check: PASSED

- `02-03-SUMMARY.md` exists.
- Commits `169699e` and `bc206e1` are present in git history.
- `pnpm test`, targeted badge tests, `pnpm typecheck`, and `pnpm build` passed.

---
*Phase: 02-display-topology-platform-parity*
*Plan: 03*
*Completed: 2026-09-10*

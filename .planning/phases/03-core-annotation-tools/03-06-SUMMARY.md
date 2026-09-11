---
phase: 03-core-annotation-tools
plan: 06
subsystem: testing
tags: [react, typescript, tauri, webdriverio, webkit, pointer-events]

# Dependency graph
requires:
  - phase: 03-core-annotation-tools
    provides: Retained annotation scene, transient renderer, toolbar selectors, and embedded Tauri WebDriver suite
provides:
  - Capture-safe observable pointer lifecycle with preview, terminal identity, and lost-capture cleanup
  - Native smoke assertions for explicit W3C pointer actions, exact scene mutation, and per-shape fill styles
affects: [phase-03-verification, cross-platform-release-validation]

# Actuals (#2632)
actuals:
  tokens: 4591
  tasks: 2
  commits: 2
  plan_head_before: 0da7f180be679f06b647364c74d019b0bc4e047a

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Capture-owned pointer identity and explicit idle/pressed/previewing diagnostics
    - Native tests use one held W3C pointer source and inspect retained payloads through the existing Tauri invoke bridge

key-files:
  created: []
  modified:
    - src/components/OverlaySurface.tsx
    - src/components/overlay-surface.test.tsx
    - tests/e2e/core-annotation-tools.e2e.ts

key-decisions:
  - "Append the terminal pointer-up sample before canonical conversion, then clear and release capture before invoking the retained-scene callback."
  - "Keep native style evidence on the real UI and get_scene_snapshot bridge; do not add a test-only scene store or infer Windows parity from macOS."

patterns-established:
  - "Gesture diagnostics are DOM-only markers and retained scene count remains unchanged until a valid matching terminal event."
  - "Native drag helpers use absolute viewport coordinates, a stable pointer source, preview-before-up assertions, exact one-ID deltas, and host-labeled failures."

requirements-completed: [DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06]

# Coverage metadata
coverage:
  - id: D1
    description: "Overlay capture lifecycle exposes pressed/previewing state, preserves retained-scene isolation, rejects mismatched terminals, and cancels unfinished capture safely."
    requirement: DRAW-01
    verification:
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx#exposes pressed and previewing phases without mutating the retained scene"
        status: pass
      - kind: unit
        ref: "src/components/overlay-surface.test.tsx#only permits a matching in-bounds terminal event to commit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase 3 native smoke flow uses explicit W3C pointer actions, checks preview-before-up and exact one-item commit, and inspects committed rectangle/ellipse fill styles."
    verification:
      - kind: e2e
        ref: "pnpm exec wdio run wdio.conf.ts --suite phase3-tools"
        status: fail
    human_judgment: true
    rationale: "The embedded macOS WebKit provider failed twice in the before hook while switching to the overlay window; no gesture assertions ran. Windows was unavailable and is not represented by macOS evidence."
  - id: D3
    description: "Frontend regression and production build remain green after the lifecycle and native-suite changes."
    verification:
      - kind: unit
        ref: "pnpm test"
        status: pass
      - kind: unit
        ref: "pnpm exec vitest run src/components/overlay-surface.test.tsx"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-09-11
status: complete
commits: 2
plan_head_before: 0da7f180be679f06b647364c74d019b0bc4e047a
---

# Phase 03 Plan 06: Core Annotation Tools Summary

**Capture-safe pointer lifecycle and explicit native W3C gesture/style evidence are implemented, with the embedded WebKit window-switch limitation recorded without claiming platform parity.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-11T01:28:00Z
- **Completed:** 2026-09-11T01:39:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added explicit `idle`/`pressed`/`previewing` gesture markers, single-pointer ownership, final pointer-up sampling, matching-terminal eligibility, and lost-capture cancellation while preserving canonical coordinate conversion and retained-scene isolation.
- Added focused lifecycle seam tests proving preview state does not mutate the retained scene and mismatched, outside, and duplicate terminal paths cannot commit.
- Replaced the native `dragAndDrop` helper with a held W3C pointer sequence, exact one-ID scene assertions, host-labeled diagnostics/cleanup, and real native snapshot checks for distinct rectangle and ellipse fill styles.

## Task Commits

Each task was committed atomically:

1. **Task 03-06-01: Diagnose and harden the captured macOS pointer-up lifecycle** - `e547232` (feat)
2. **Task 03-06-02: Replace the WebKit drag helper and strengthen native Phase 3 integration evidence** - `3960e2d` (test)

**Plan metadata:** final GSD state/roadmap metadata commit follows these task commits.

## Files Created/Modified

- `src/components/OverlaySurface.tsx` - Owns observable gesture phases, final terminal sampling, pointer identity guards, and lost-capture cleanup.
- `src/components/overlay-surface.test.tsx` - Covers transient preview isolation and terminal-event decisions.
- `tests/e2e/core-annotation-tools.e2e.ts` - Uses explicit W3C pointer actions and verifies native scene/style payloads through the existing bridge.

## Decisions Made

- Kept transient gesture state in React and cleared/released capture before retained-scene commit callbacks.
- Kept the existing embedded provider, selector contracts, shared scene identity, and platform-neutral tool vocabulary.
- Recorded native results by host: macOS was blocked before test execution by the provider window-switch failure, and Windows remains unrun because no Windows host/runner is available.

## Deviations from Plan

None - plan implementation scope was followed. The native command's reproducible provider failure is documented under Issues Encountered and coverage rather than converted into a false pass.

## Issues Encountered

- The debug Tauri binary had to be rebuilt with `pnpm exec tauri build --debug --no-bundle` so the embedded runner used the current frontend. Generated output was not staged.
- `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` was run twice on the current macOS host. Both runs passed provider diagnostics and discovered `overlay`/`settings`, but `browser.tauri.switchWindow("overlay")` timed out on provider IPC and the direct switch then failed with `window not found` in the `before` hook. No native gesture/style assertion ran.
- No Windows host or runner is available in this checkout. The missing Windows native gate is recorded in `.planning/WINDOWS.md` as an open `unrun-verify`; no Windows pass is claimed.
- Existing unrelated Rust dead-code warnings remain unchanged.

## User Setup Required

None - no external service configuration or package installation required.

## Next Phase Readiness

The capture lifecycle and native test contract are ready for phase verification. Re-run the exact `phase3-tools` suite on a provider/host that can switch to the overlay window, then execute the same command on Windows and retain separate dated evidence before claiming cross-platform parity.

## Known Stubs

None found in the files modified by this plan.

## Self-Check: PASSED

- Summary file exists at the required phase path.
- Task commits `e547232` and `3960e2d` exist and are measured as 2 commits after plan base `0da7f180be679f06b647364c74d019b0bc4e047a`.
- Full frontend tests (51 tests), targeted lifecycle tests (21 tests), and `pnpm build` pass.
- Native WebDriver limitation and unavailable Windows evidence are recorded explicitly; no cross-platform pass is claimed.

---
*Phase: 03-core-annotation-tools*
*Plan: 06*
*Completed: 2026-09-11*

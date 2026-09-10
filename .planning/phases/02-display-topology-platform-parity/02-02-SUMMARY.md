---
phase: 02-display-topology-platform-parity
plan: 02
subsystem: display-topology
tags: [rust, tauri, multi-display, native-windows, scene-store, recovery]

requires:
  - phase: 02-display-topology-platform-parity
    provides: validated display descriptors, topology diffs, coalesced snapshots, and canonical viewport geometry
provides:
  - DisplayId-keyed OverlayRegistry with retained shared scene identity
  - asynchronous Tauri native viewport creation, reuse, geometry updates, and removal
  - managed SceneStore command/event boundary and typed display recovery errors
affects: [02-03, 02-04, 02-05]

actuals:
  tokens: 8985
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - Rust-generated opaque native labels derived from validated DisplayId values
    - Registry reconciliation updates unchanged viewports in place and removes only missing identities
    - Native WebView lifecycle work is scheduled on the Tauri async runtime outside display callbacks
    - SceneStore accepts validated serialized items and broadcasts one semantic scene to all viewports

key-files:
  created:
    - src-tauri/src/overlay_registry.rs
  modified:
    - src-tauri/src/controller.rs
    - src-tauri/src/platform/mod.rs
    - src-tauri/src/main.rs
    - src-tauri/src/errors.rs

key-decisions:
  - "Keep display registry state and scene identity separate so removed displays can reappear without deleting annotations."
  - "Generate native window labels only in Rust from validated opaque display identities."
  - "Preserve healthy viewports and shared scene state when one native viewport fails, publishing a retryable typed error."

patterns-established:
  - "OverlayRegistry applies one global mode transaction to every viewport before the controller emits the mode event."
  - "Scene commands validate item identity and kind at the Rust boundary, then broadcast accepted snapshots with scene-changed."

requirements-completed: [DISP-01, DISP-03]

coverage:
  - id: D1
    description: "Registry reconciles multiple displays, preserves shared scene identity, updates geometry in place, and broadcasts global mode/click-through state."
    requirement: DISP-01
    verification:
      - kind: unit
        ref: "cargo test --manifest-path src-tauri/Cargo.toml overlay_registry"
        status: pass
      - kind: unit
        ref: "cargo test --manifest-path src-tauri/Cargo.toml controller"
        status: pass
    human_judgment: false
  - id: D2
    description: "Managed SceneStore and async native lifecycle preserve scene items and publish typed retryable native errors."
    requirement: DISP-03
    verification:
      - kind: unit
        ref: "cargo test --manifest-path src-tauri/Cargo.toml"
        status: pass
      - kind: other
        ref: "pnpm build"
        status: pass
    human_judgment: false
  - id: D3
    description: "Two connected displays confirm one native viewport per display and global Hide/click-through behavior."
    requirement: DISP-01
    verification: []
    human_judgment: true
    rationale: "Native window placement, compositor behavior, and pointer pass-through require hardware or a desktop runtime."

duration: 8min
completed: 2026-09-10
status: complete
plan_head_before: 661309d
---

# Phase 2 Plan 2: Native Overlay Registry Summary

**Registry-backed multi-display lifecycle with asynchronous Tauri windows, one retained scene boundary, and actionable native recovery state.**

## Performance

- **Duration:** 8 min of implementation and verification
- **Started:** 2026-09-10T10:53:00Z
- **Completed:** 2026-09-10T11:01:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `OverlayRegistry` and `OverlayViewport` keyed by validated `DisplayId`, with Rust-generated labels, in-place geometry updates, add/remove/re-add behavior, and one shared `scene_ref`.
- Extended the platform adapter seam with geometry and deferred topology scheduling operations, plus deterministic fake adapter coverage for global mode and pointer state.
- Connected controller lifecycle actions to registry reconciliation and asynchronous Tauri `WebviewWindowBuilder` work for dynamic overlay windows while keeping the fixed settings window isolated.
- Added a managed `SceneStore` with validated serialized scene commits, `get_scene_snapshot`, and `scene-changed` broadcasts to all active windows.
- Added typed `DisplayTopology`, `FullScreenBlocked`, and `DisplayPermission` recovery errors with Retry and system-settings actions where appropriate.

## Task Commits

Each task was committed atomically:

1. **Task 02-02-01: Trace registry reconciliation and global mode broadcast through fake viewports** - `8d1cd3b` (feat)
2. **Task 02-02-02: Wire asynchronous Tauri windows, shared scene commands, and actionable native errors** - `70ff9e0` (feat)

## Files Created/Modified

- `src-tauri/src/overlay_registry.rs` - Registry, viewport entries, shared scene store, async native window lifecycle, labels, and tests.
- `src-tauri/src/controller.rs` - Show, hide, click-through, retry, monitor snapshot, and per-display event routing through the registry.
- `src-tauri/src/platform/mod.rs` - Geometry and deferred topology adapter seam with fake adapter state.
- `src-tauri/src/main.rs` - Managed registry/scene state and scene snapshot/commit commands.
- `src-tauri/src/errors.rs` - Typed display topology, full-screen, and permission recovery states.

## Decisions Made

- Registry membership changes never clear the shared scene, so a returning display can render retained records.
- Native window labels are generated from validated Rust identities and are never accepted from renderer input.
- Native window creation and updates run on Tauri's async runtime boundary, leaving synchronous display callbacks free of WebView construction.

## Deviations from Plan

None - plan executed as written. The existing `tauri.conf.json` window and capability scope remain sufficient for the Rust-generated dynamic overlay windows, so no configuration edit was necessary.

## Issues Encountered

- The first compile exposed missing default bounds and temporary `State` guard lifetimes; these were corrected before task verification and did not require scope expansion.
- Cargo continues to report existing dead-code warnings for future-phase seams; all targeted tests and builds pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-03 can consume the registry's per-display viewport events and shared scene identity for renderer parity UI and canvas transforms. The physical two-display placement and click-through check remains a phase-level human verification item.

## Self-Check: PASSED

- `src-tauri/src/overlay_registry.rs` exists and is committed.
- Commits `8d1cd3b` and `70ff9e0` are present in git history.
- Automated Rust, frontend build, and Vitest verification passed.

---
*Phase: 02-display-topology-platform-parity*
*Plan: 02*
*Completed: 2026-09-10*

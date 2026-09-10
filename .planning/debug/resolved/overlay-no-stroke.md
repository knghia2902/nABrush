---
status: resolved
trigger: "MacOSS ./src-tauri/target/debug/nabrush Không có nét Trước vẽ được"
created: "2026-09-10"
updated: "2026-09-10"
---

# Debug Session: overlay-no-stroke

## Symptoms

- Expected behavior: Dragging on the visible overlay canvas creates an annotation stroke.
- Actual behavior: No stroke appears.
- Error messages: None reported initially.
- Timeline: Drawing worked previously; the regression appeared after the topology observer work.
- Reproduction: On macOS, launch `./src-tauri/target/debug/nabrush` and attempt to draw.

## Current Focus

- hypothesis: Confirmed native startup failure and setup-time topology reconciliation prevented the stable overlay input path.
- test: Trace setup → native topology observer → overlay window creation/input, then verify the frontend pointer/commit/render path and run native/frontend checks.
- expecting: Managed topology state and deferred setup reconciliation let startup complete while preserving the existing interactive canvas path.
- next_action: archived resolved session

## Evidence

- timestamp: 2026-09-10
  observation: User reports macOS debug binary shows no drawn stroke, although drawing worked previously.
- timestamp: 2026-09-10
  observation: `setup()` called `platform::install_observers()` before registering `TopologyRefreshState`; macOS observer immediately called `schedule_reconcile()`, whose first operation was `app.state::<TopologyRefreshState>()`.
  implication: The native boundary failed before overlay input could reach `OverlaySurface`, `commit_scene_item`, or retained scene rendering.
- timestamp: 2026-09-10
  observation: Fresh macOS debug binary reproduced `state() called before manage() for nabrush::platform::TopologyRefreshState` with a backtrace through `setup → install_observers → macos::on_screen_parameters_changed → schedule_reconcile`.
- timestamp: 2026-09-10
  observation: After registering the state and deferring setup-time reconciliation, a fresh binary stayed alive through the startup probe without panic.
- timestamp: 2026-09-10
  observation: `cargo test --manifest-path src-tauri/Cargo.toml` passed 34 tests; `pnpm test` passed 28 tests; `pnpm build` passed; `git diff --check` passed.
- timestamp: 2026-09-10
  observation: WebDriver could not load the binary's DOM/IPC bridge in the local Tauri build and is recorded as a harness limitation, not as hardware evidence.

## Eliminated

## Resolution

- root_cause: `TopologyRefreshState` was not managed before observer installation, and setup-time reconciliation created dynamic WebViews before bootstrap initialization was stable.
- fix: Registered `platform::TopologyRefreshState::default()` before observer installation and moved the initial authoritative display snapshot to the controller's `Show` path; native notifications remain deferred through the scheduler.
- verification: Fresh macOS binary startup probe had no panic; Rust 34/34 tests, frontend 28/28 tests, and TypeScript/Vite production build passed.
- files_changed: `src-tauri/src/main.rs`, `src-tauri/src/platform/mod.rs`, `src-tauri/src/platform/macos.rs`, `src-tauri/src/platform/windows.rs`

## Postmortem

- why_not_caught: The observer startup path had no integration gate asserting every `app.state::<T>()` dependency was managed before setup callbacks, and no startup check for setup-time dynamic WebView creation.
- guard: Register `TopologyRefreshState` before observer installation, keep the initial snapshot in the controller's `Show` path, and retain the native startup probe alongside Rust and frontend tests.

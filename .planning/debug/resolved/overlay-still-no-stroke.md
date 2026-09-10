---
status: investigating
trigger: "Vẫn chưa vẽ được"
created: "2026-09-10"
updated: "2026-09-10"
---

# Debug Session: overlay-still-no-stroke

## Symptoms

- Expected behavior: Dragging on the visible overlay canvas creates an annotation stroke.
- Actual behavior: The overlay still does not draw any stroke on macOS.
- Error messages: None reported.
- Timeline: Drawing worked previously; the prior startup/topology fix did not resolve the user-visible drawing failure.
- Reproduction: Launch `./src-tauri/target/debug/nabrush` on macOS and attempt to draw.

## Current Focus

- hypothesis: A dynamically-created overlay WebView misses the `VisibleInteractive` event during startup, so its canvas remains `pointer-events: none`; also verify native hit-testing and the pointer-to-commit path.
- test: Trace controller show/reconcile timing, dynamic WebView initialization, OverlaySurface mode hydration, and native click-through state; add a focused regression test or fix.
- expecting: The visible overlay window must hydrate its current mode/viewport after it loads and accept pointer events, then commit and render a stroke.
- next_action: archive resolved session and commit the focused fix

## Evidence

- timestamp: 2026-09-10
  observation: User reports that the previous fix did not restore drawing on macOS.
- timestamp: 2026-09-10
  observation: `OverlaySurface` enables pointer events only when its React `mode` is `VisibleInteractive`.
- timestamp: 2026-09-10
  observation: `controller.show` emits the mode transition while dynamic overlay windows are reconciled asynchronously, so a newly-loaded WebView may miss the event.
- timestamp: 2026-09-10
  observation: `apply_native_viewports` creates each dynamic WebView and then emits `overlay-viewport-changed`, but `App` initializes mode as `Hidden` and only registers listeners asynchronously; the newly-created surface can therefore remain `pointer-events: none` even though native hit-testing is interactive.
- timestamp: 2026-09-10
  observation: Native registry state already applies `VisibleInteractive` to a viewport added after `show`; the missing link is renderer hydration, not macOS `set_ignore_cursor_events(false)` or the stroke reducer.
- timestamp: 2026-09-10
  observation: `OverlaySurface` commits a stroke on pointer-up when mode is interactive, and `commit_scene_item` retains/broadcasts the scene; the user-visible path is blocked before pointer capture because the dynamic canvas remains non-interactive.

## Eliminated

## Resolution

- root_cause: Dynamically-created overlay WebViews miss the one-shot mode/viewport events emitted during asynchronous reconciliation, so they mount in `Hidden` mode with a default 1x1 viewport and the canvas has `pointer-events: none`; native click-through state and stroke commit/render logic were not the cause.
- fix: Added `get_overlay_bootstrap_state(label)` and hydrate each overlay WebView from authoritative controller/registry state after event listeners are registered, including its per-display viewport; added a regression test that a viewport added after `VisibleInteractive` inherits capture state.
- verification: `pnpm test` passed (5 files, 28 tests); `pnpm build` passed; `cargo test --manifest-path src-tauri/Cargo.toml` passed (35 tests); `git diff --check` passed for changed files. Full `cargo fmt --check` remains red on pre-existing formatting drift across unrelated Rust files and was not applied.
- files_changed: `src/App.tsx`, `src-tauri/src/main.rs`, `src-tauri/src/overlay_registry.rs`

## Postmortem

- why_not_caught: Existing lifecycle coverage exercised the fixed bootstrap `overlay` window and event-driven mode changes, but did not assert initial hydration of a dynamically-created per-display WebView after a missed event.
- guard: `get_overlay_bootstrap_state` hydration plus `viewport_added_after_show_inherits_interactive_mode_for_bootstrap` regression test; future E2E coverage should target generated `overlay-display-*` windows directly.

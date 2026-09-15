# Quick Task Plan: Fix Tauri dev Rust compilation error and warnings

## Scope

- Remove unresolved `.plugin(tauri_plugin_wdio::init())` in `src-tauri/src/main.rs`.
- Clean up unused imports in `src-tauri/src/tracer.rs` (move test-only display types into `mod tests`).
- Verify Rust build via `cargo check` and `pnpm tauri dev` or `cargo build`.

## Tasks

1. Fix `src-tauri/src/main.rs` by removing the unlinked `tauri_plugin_wdio::init()` call.
2. Fix `src-tauri/src/tracer.rs` by scoping test-only display imports to `mod tests`.
3. Verify `cargo check`, `cargo test`, and `pnpm typecheck` pass with 0 errors and 0 warnings.

## Verification

- `cargo check --manifest-path src-tauri/Cargo.toml` exits 0 with no warnings or errors.
- `cargo test --manifest-path src-tauri/Cargo.toml` exits 0.
- `pnpm typecheck` exits 0.

---
phase: 01-native-overlay-activation
status: human_needed
verified: 2026-09-10
goal: "Tray/menu-bar launch, global activation, safe Drawing/Click-through switching, and emergency hide with scene restoration"
requirements: [OVLY-01, OVLY-02, OVLY-03, OVLY-04]
---

# Phase 1 Verification

## Goal verdict

The implementation and automated native smoke path cover the phase goal. Manual UAT passed on the current macOS device for activation, drawing, Click-through, Escape/scene restoration, Settings reuse, conflict rollback, and Retry. The phase remains pending until a Windows 10 22H2+ device provides equivalent cross-application and compositor evidence.

## Must-have verification

| Must-have | Evidence | Result |
| --- | --- | --- |
| Tray-owned cold launch with hidden overlay and settings lifecycle | `src-tauri/src/tray.rs`, Tauri debug build, WebDriver cold-launch test, macOS UAT | Pass on macOS; Windows confirmation pending |
| Configurable global activation while another app is focused | Shortcut registry unit tests, `tests/e2e/overlay.e2e.ts`, macOS UAT | Pass on macOS; Windows focus delivery pending |
| Drawing and Click-through modes preserve one scene surface | Controller/platform tests, native drag coverage, macOS UAT | Pass on macOS; Windows pointer delivery pending |
| Bare Escape hides and later restores the same scene | Retained-scene reducer tests, retained stroke WebDriver assertion, macOS UAT | Pass |
| Recoverable conflict and initialization failure states | Rust error/shortcut tests and matrix fixture assertions | Automated pass |

## Requirement traceability

| Requirement | Plan evidence | Verification | Status |
| --- | --- | --- | --- |
| OVLY-01 | 01-02, 01-07 | Tray integration, Tauri build, cold-launch smoke, device tray row | Human needed |
| OVLY-02 | 01-04, 01-07 | Transactional binding tests, WebDriver action path, device global shortcut fixture | Human needed |
| OVLY-03 | 01-03, 01-05, 01-07 | Mode reducer/platform policy tests, native smoke transitions, TextEdit/Notepad pointer fixture | Human needed |
| OVLY-04 | 01-03, 01-06, 01-07 | Scene reducer, recovery tests, phase1-sentinel hide/restore smoke | Pass pending device confirmation |

## Automated evidence

- `pnpm typecheck` — pass.
- `pnpm exec vitest run` — 4 files, 13 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 18 tests passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` — pass.
- `pnpm build` — pass.
- `pnpm exec tauri build --debug` — pass; debug executable starts with embedded WebDriver.
- `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` — 5 tests passed.
- `pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` — 5 tests passed.
- `.github/workflows/phase1.yml` contains separate `macos-13` and `windows-2022` jobs and the same smoke commands.

## Human verification

1. macOS UAT passed on the current device, including `Cmd+Shift+A`; Windows 10 22H2+ evidence remains pending.
2. macOS UAT passed over TextEdit. The equivalent Windows Notepad check remains pending.
3. macOS UAT passed repeated Settings open/close, conflict rollback, and Retry behavior.
4. macOS full-screen/Space behavior passed in the prior UAT; Windows borderless versus exclusive full-screen observations remain pending.

See `docs/support-matrix.md` for the evidence table. The phase must not advance until the two device rows are filled.

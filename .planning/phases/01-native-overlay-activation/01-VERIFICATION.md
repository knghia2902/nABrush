---
phase: 01-native-overlay-activation
status: human_needed
verified: 2026-09-10
goal: "Tray/menu-bar launch, global activation, safe Drawing/Click-through switching, and emergency hide with scene restoration"
requirements: [OVLY-01, OVLY-02, OVLY-03, OVLY-04]
---

# Phase 1 Verification

## Goal verdict

The implementation and automated native smoke path cover the phase goal. The phase remains pending until one macOS 13+ device and one Windows 10 22H2+ device provide evidence for cross-application shortcut delivery, pointer pass-through, and compositor/full-screen behavior.

## Must-have verification

| Must-have | Evidence | Result |
| --- | --- | --- |
| Tray-owned cold launch with hidden overlay and settings lifecycle | `src-tauri/src/tray.rs`, Tauri debug build, WebDriver cold-launch test | Automated pass; device confirmation pending |
| Configurable global activation while another app is focused | Shortcut registry unit tests, `tests/e2e/overlay.e2e.ts`, documented TextEdit/Notepad fixture | Native runner pass through debug action; real focus delivery pending |
| Drawing and Click-through modes preserve one scene surface | Controller/platform tests, `short-lifecycle` and `phase1-matrix` WebDriver suites | Automated pass; pointer delivery pending |
| Bare Escape hides and later restores the same scene | Retained-scene reducer tests and phase1-sentinel WebDriver assertion | Automated pass |
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
- `pnpm exec vitest run` — 3 files, 9 tests passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` — pass.
- `pnpm exec tauri build --debug` — pass; debug executable starts with embedded WebDriver.
- `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` — 5 tests passed.
- `pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` — 5 tests passed.
- `.github/workflows/phase1.yml` contains separate `macos-13` and `windows-2022` jobs and the same smoke commands.

## Human verification

1. On macOS 13+ and Windows 10 22H2+, launch nABrush from the menu bar/system tray and confirm no normal document window takes over the presentation. Focus another app and invoke the configured Cmd/Ctrl+Shift+A binding; record the OS version and evidence location.
2. With the overlay visible over TextEdit (macOS) or Notepad (Windows), confirm Drawing captures a pointer mark, Click-through delivers a click to the known text target, and bare Escape hides the overlay while the tray process remains available.
3. Open and close settings, confirm close-to-hide leaves the background process running, then trigger a shortcut conflict and an initialization failure fixture; confirm the previous binding remains and Retry is available.
4. Record macOS Spaces/Stage Manager/native full-screen and Windows borderless versus exclusive full-screen observations. Mark protected-content or permission-denied outcomes as limitations.

See `docs/support-matrix.md` for the evidence table. The phase must not advance until the two device rows are filled.

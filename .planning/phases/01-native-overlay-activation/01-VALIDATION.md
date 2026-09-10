---
phase: "01"
slug: "native-overlay-activation"
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-09-10"
---

# Phase 01 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5, Rust cargo test, WebdriverIO 9 with Tauri embedded WebDriver |
| **Config file** | `vitest.config.ts`, `wdio.conf.ts` |
| **Quick run command** | `pnpm exec vitest run` |
| **Full suite command** | `pnpm typecheck && pnpm exec vitest run && cargo test --manifest-path src-tauri/Cargo.toml && pnpm exec tauri build --debug && pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` |
| **Estimated runtime** | ~35 seconds on the local host; native CI varies by runner |

## Sampling Rate

- After every task commit: `pnpm exec vitest run` or the targeted Rust test command.
- After every plan wave: run the full command above.
- Before `$gsd-verify-work`: automated suite must be green; physical-device rows remain pending.
- Max feedback latency: 60 seconds for host checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | OVLY-01..04 | T-01-01..02 | scaffold/build | `pnpm typecheck`, `cargo test` | ✅ | ✅ green |
| 01-02 | 02 | 2 | OVLY-01 | T-01-03..05 | native/unit | `cargo test --manifest-path src-tauri/Cargo.toml controller tracer` | ✅ | ✅ green |
| 01-03 | 03 | 3 | OVLY-02,04 | T-01-06..08 | reducer/schema | `pnpm exec vitest run src/state/overlay.test.ts src/types/mode-schema.test.ts` | ✅ | ✅ green |
| 01-04 | 04 | 4 | OVLY-02 | T-01-09..11 | native/UI | `cargo test --manifest-path src-tauri/Cargo.toml shortcut startup && pnpm exec vitest run` | ✅ | ✅ green |
| 01-05 | 05 | 5 | OVLY-03 | T-01-12..14 | platform/UI | `cargo test --manifest-path src-tauri/Cargo.toml platform && pnpm exec vitest run src/components/mode-badge.test.tsx` | ✅ | ✅ green |
| 01-06 | 06 | 6 | OVLY-02,04 | T-01-15..17 | recovery | `cargo test --manifest-path src-tauri/Cargo.toml errors && pnpm exec vitest run src/components/error-badge.test.tsx` | ✅ | ✅ green |
| 01-07 | 07 | 7 | OVLY-01..04 | T-01-18..20 | native smoke/CI | `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` and `phase1-matrix` | ✅ | ✅ green |

## Wave 0 Requirements

Existing Vitest, Rust, and WebDriver infrastructure covers all phase requirements. No Wave 0 stubs are missing.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-app global shortcut and tray persistence | OVLY-01, OVLY-02 | WebDriver cannot prove focus in a separately focused TextEdit/Notepad window on both OSes | Fill the macOS and Windows rows in `docs/support-matrix.md`. |
| Pointer delivery and compositor behavior | OVLY-03 | AppKit/Win32 hit testing and full-screen compositor behavior require physical devices | Click the known TextEdit/Notepad target in Drawing and Click-through; record result. |
| Spaces, Stage Manager, native/exclusive full-screen, permission outcomes | OVLY-03 | Host smoke runs only the primary display in a debug app | Record observations and limitations in the support matrix. |

## Validation Sign-Off

- [x] All tasks have automated verification or documented manual evidence.
- [x] Sampling continuity: every plan wave has targeted or full automated checks.
- [x] Wave 0 dependencies are installed and pinned.
- [x] No watch-mode flags.
- [x] Feedback latency is under one minute on the local host.
- [ ] `nyquist_compliant: true` — blocked only by the manual device rows above.

**Approval:** partial — automated coverage validated 2026-09-10; device evidence pending.

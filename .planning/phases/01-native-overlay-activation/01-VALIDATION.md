---
phase: "01"
slug: "native-overlay-activation"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-09"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 for TypeScript; Rust `cargo test`; WebdriverIO Tauri service for desktop smoke tests |
| **Config file** | `vitest.config.ts`, `wdio.conf.ts`, and `src-tauri/Cargo.toml` created by the phase plans |
| **Quick run command** | `pnpm exec vitest run --passWithNoTests && cargo test --manifest-path src-tauri/Cargo.toml` plus `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` when the built app is available |
| **Full suite command** | `pnpm exec vitest run && cargo test --manifest-path src-tauri/Cargo.toml && pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` at the Phase 1 gate on macOS and Windows runners |
| **Estimated runtime** | ~30 seconds for unit/native checks; ~3 minutes for a built-app smoke run |

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run --passWithNoTests && cargo test --manifest-path src-tauri/Cargo.toml` when the relevant toolchain is available.
- **After every plan wave:** Run `pnpm exec vitest run && cargo test --manifest-path src-tauri/Cargo.toml`; run the short built-app smoke test with `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` on the target runner.
- **At the Phase 1 gate:** Run the full `phase1-matrix` WebDriver suite only after the short suite and unit/native checks are green; its expected runtime is approximately three minutes.
- **Before `$gsd-verify-work`:** The full suite must be green and the macOS/Windows device matrix must be recorded.
- **Max feedback latency:** 30 seconds for unit/native checks; 180 seconds for the desktop smoke suite.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | OVLY-01, OVLY-02, OVLY-03, OVLY-04 | T-01-04 | Dependencies are reviewed before installation | checkpoint + registry check | `test -f .planning/phases/01-native-overlay-activation/01-RESEARCH.md` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | OVLY-01, OVLY-02 | T-01-04 | Toolchain and package versions are reproducible | scaffold | `pnpm exec vitest run --passWithNoTests` | ⬜ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | OVLY-01, OVLY-02, OVLY-03, OVLY-04 | T-01-01, T-01-03 | Capability scope and lifecycle commands are explicit | build + tracer | `pnpm exec tauri build --debug` | ⬜ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | OVLY-01, OVLY-04 | T-01-03 | Empty surface and scene reference survive hide/show | native unit | `cargo test --manifest-path src-tauri/Cargo.toml tracer` | ⬜ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | OVLY-02, OVLY-04 | T-01-01 | Invalid transitions cannot mutate the retained scene | TypeScript unit | `pnpm exec vitest run src/state/overlay.test.ts` | ⬜ W0 | ⬜ pending |
| 01-03-02 | 03 | 3 | OVLY-02, OVLY-04 | T-01-01 | Native transitions are serialized and idempotent | Rust unit | `cargo test --manifest-path src-tauri/Cargo.toml controller` | ⬜ W0 | ⬜ pending |
| 01-04-01 | 04 | 4 | OVLY-02 | T-01-05 | Candidate shortcut sets roll back on conflict | Rust unit | `cargo test --manifest-path src-tauri/Cargo.toml shortcut_registry` | ⬜ W0 | ⬜ pending |
| 01-04-02 | 04 | 4 | OVLY-02 | T-01-05 | Settings commands validate bindings and default launch-at-login off | component + native | `pnpm exec tsc --noEmit` | ⬜ W0 | ⬜ pending |
| 01-05-01 | 05 | 5 | OVLY-03 | T-01-06, T-01-08 | Native adapters apply hit-testing to the existing window | Rust unit/build | `cargo test --manifest-path src-tauri/Cargo.toml platform` | ⬜ W0 | ⬜ pending |
| 01-05-02 | 05 | 5 | OVLY-03 | T-01-07 | Badge and cursor feedback remain UI-only | component | `pnpm exec vitest run src/components/mode-badge.test.tsx` | ⬜ W0 | ⬜ pending |
| 01-06-01 | 06 | 6 | OVLY-04 | T-01-09, T-01-10 | Initialization failure fails closed and preserves scene | Rust unit | `cargo test --manifest-path src-tauri/Cargo.toml errors` | ⬜ W0 | ⬜ pending |
| 01-06-02 | 06 | 6 | OVLY-04 | T-01-10 | Recovery actions are typed and contextual | TypeScript unit | `pnpm exec vitest run src/components/error-badge.test.tsx` | ⬜ W0 | ⬜ pending |
| 01-07-01 | 07 | 7 | OVLY-01, OVLY-02, OVLY-03, OVLY-04 | T-01-12 | Only reviewed WebDriver packages enter the toolchain | checkpoint + registry check | `test -f .planning/phases/01-native-overlay-activation/01-RESEARCH.md` | ✅ | ⬜ pending |
| 01-07-02 | 07 | 7 | OVLY-01, OVLY-02, OVLY-03, OVLY-04 | T-01-12 | Smoke runner launches the built app with explicit platform target | WebDriver short feedback | `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` | ⬜ W0 | ⬜ pending |
| 01-07-04 | 07 | 7 | OVLY-01, OVLY-02, OVLY-03, OVLY-04 | T-01-12 | Phase gate runs the complete built-app lifecycle matrix | WebDriver phase gate | `pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` | ⬜ W0 | ⬜ pending |
| 01-07-03 | 07 | 7 | OVLY-01, OVLY-02, OVLY-03, OVLY-04 | T-01-03, T-01-06 | CI records separate macOS and Windows evidence | CI build | `pnpm exec tauri build --debug` | ⬜ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `package.json` and `pnpm-lock.yaml` — install the approved Vitest version during scaffold.
- [ ] `vitest.config.ts` — explicitly defines the Vitest discovery contract used by scaffold and later component/state tests.
- [ ] `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` — pin and resolve the native dependency graph before the tracer.
- [ ] `rust-toolchain.toml` — pin the Rust channel before native tests.
- [ ] `src/state/overlay.test.ts` — created before the state-contract verification in Plan 03.
- [ ] `src/components/mode-badge.test.tsx` and `src/components/error-badge.test.tsx` — created before their component verification tasks.
- [ ] `wdio.conf.ts` and `tests/e2e/overlay.e2e.ts` — created before the WebDriver smoke task.
- [ ] `.github/workflows/phase1.yml` — creates explicit macOS and Windows jobs before support evidence is recorded.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tray/background lifecycle and close-to-hide | OVLY-01 | OS tray/menu-bar and close behavior are native | On macOS 13+ and Windows 10 22H2+, launch the built app, confirm no document window, open/close settings and toolbar, confirm tray remains and only Quit exits. |
| Global toggle from another application | OVLY-02 | Focus ownership and global key delivery cross OS boundaries | Focus a second app, invoke the configured visibility binding, replace it in Settings, invoke the replacement, then occupy a candidate key and confirm rollback plus suggestion. |
| Native click-through and Esc | OVLY-03, OVLY-04 | Pointer pass-through, z-order, and bare Esc require physical devices | Show the overlay, add the deterministic `phase1-sentinel`, switch click-through, click/scroll the underlying app, press bare Esc, restore, and confirm the sentinel remains. |
| macOS Space/full-screen behavior | OVLY-01, OVLY-03 | AppKit Spaces, Stage Manager, and native full-screen are not reproducible in unit tests | Exercise normal, borderless/native full-screen, another Space, and Stage Manager; record pass/fail and the direct-distribution/private-API note. |
| Windows borderless/exclusive full-screen behavior | OVLY-01, OVLY-03 | Desktop composition and exclusive graphics modes are device-specific | Exercise normal and borderless full-screen, then classify exclusive full-screen and record recovery if the normal topmost overlay is hidden. |

## Validation Sign-Off

- [ ] All tasks have an automated verify command or an explicit device checkpoint.
- [ ] Sampling continuity: no three consecutive implementation tasks lack automated verification.
- [ ] Wave 0 covers all planned test/configuration files referenced by later commands.
- [ ] No watch-mode flags are used.
- [ ] Feedback latency is within the stated limits.
- [ ] `nyquist_compliant: true` set after phase execution and device evidence review.

**Approval:** pending

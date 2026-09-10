---
phase: "02"
slug: "display-topology-platform-parity"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-10"
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for display topology, mixed-DPI geometry, native full-screen behavior, and cross-platform parity.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 for TypeScript; Rust `cargo test` for native logic; WebdriverIO/Tauri service for desktop smoke coverage |
| **Config file** | `vitest.config.ts`; Rust tests are inline `#[cfg(test)]` modules; `wdio.conf.ts` |
| **Quick run command** | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml` |
| **Full suite command** | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm exec wdio run wdio.conf.ts --suite phase2-matrix` |
| **Estimated runtime** | ~30 seconds for quick checks; platform matrix varies by runner |

## Sampling Rate

- **After every task commit:** Run `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml`
- **After every plan wave:** Run the quick suite plus `pnpm build`
- **Before `$gsd-verify-work`:** Run the full suite and complete the macOS/Windows display hardware matrix
- **Max feedback latency:** 30 seconds for local unit/native checks

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DISP-01 | T-02-01 | Reject invalid monitor geometry before native calls | unit | `cargo test --manifest-path src-tauri/Cargo.toml topology` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DISP-03 | T-02-02 | Coalesce topology bursts and apply one final snapshot | unit | `cargo test --manifest-path src-tauri/Cargo.toml topology` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | DISP-01 | T-02-03 | Generate native labels from validated monitor identities | unit/integration | `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | DISP-03 | T-02-04 | Preserve retained scene records when a viewport is removed | unit | `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | DISP-01 | T-02-05 | Map canonical points to local logical viewport and DPR backing size | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | DISP-04 | T-02-06 | Broadcast mode badge state to every display viewport | unit | `pnpm exec vitest run src/components/mode-badge.test.tsx` | ✅ existing | ⬜ pending |
| 02-04-01 | 04 | 3 | DISP-02 | T-02-07 | Keep scene alive and expose actionable error for blocked full-screen surface | e2e/manual | `pnpm exec wdio run wdio.conf.ts --suite phase2-matrix` | ❌ Wave 0 | ⬜ pending |
| 02-04-02 | 04 | 3 | DISP-04 | T-02-08 | Keep shortcut concepts and mode feedback identical on macOS and Windows | e2e/manual | `pnpm exec wdio run wdio.conf.ts --suite phase2-matrix` | ❌ Wave 0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `src-tauri/src/display.rs` or equivalent — monitor descriptors, identity, transforms, diff, and coalescing fixtures.
- [ ] `src-tauri/src/overlay_registry.rs` or equivalent — fake adapter tests for add/remove/update/broadcast and scene retention.
- [ ] `src-tauri/src/platform/*` fixtures — platform event-to-snapshot reconciliation and actionable failure cases.
- [ ] `src/components/OverlaySurface.test.tsx` or equivalent — canonical point transform and DPR backing dimensions.
- [ ] `tests/e2e/display-topology.e2e.ts` plus `phase2-matrix` suite entry — per-display windows, badges, topology fixture, and mode broadcast.
- [ ] Manual hardware matrix — mixed DPI, rotation, negative origin, add/remove, and supported/limited full-screen modes on macOS and Windows.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|-----------|-------------------|
| Mixed-DPI placement and negative-origin alignment | DISP-01 | Requires two physical displays with independent scale factors and a virtual desktop origin | On macOS and Windows, connect displays with different scales, place one to the left, rotate one display, show overlay, and verify marks align at each native origin and resolution. |
| Borderless/native full-screen overlay persistence | DISP-02 | Compositor and Space behavior cannot be reproduced by unit tests | Exercise a supported borderless/native full-screen app on both platforms; verify overlay remains aligned. Exercise exclusive full-screen and record Limited/Unsupported behavior without losing scene state. |
| Hot-plug and DPI/rotation reconciliation | DISP-03 | Physical add/remove and OS display reconfiguration are hardware-dependent | Show overlay, add/remove a display, rotate it, change scale, and verify windows reconcile without restart and retained marks return when the display returns. |
| Cross-platform parity matrix | DISP-04 | Requires both macOS and Windows runners and native shortcut behavior | Run the same show/hide/click-through/emergency-hide flow on both OSes and compare mode labels, badge placement, shortcut concepts, and scene retention. |

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing topology, registry, renderer, and E2E fixtures
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for local checks
- [ ] `nyquist_compliant: true` set in frontmatter after execution validation

**Approval:** pending

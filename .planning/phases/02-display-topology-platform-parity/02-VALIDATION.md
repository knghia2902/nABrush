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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Failure signal | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|----------------|-------------|--------|
| 02-01-01 | 01 | 1 | DISP-01 | T-02-01 | Reject invalid monitor geometry before native calls | unit | `cargo test --manifest-path src-tauri/Cargo.toml topology && pnpm exec vitest run src/components/overlay-surface.test.tsx` | Descriptor validation or canonical viewport transform tests fail | ✅ committed | ✅ pass |
| 02-01-02 | 01 | 1 | DISP-03 | T-02-03 | Coalesce topology bursts and apply one final snapshot | unit | `cargo test --manifest-path src-tauri/Cargo.toml topology && cargo test --manifest-path src-tauri/Cargo.toml tracer` | Diff/coalescer or retained-scene tracer tests fail | ✅ committed | ✅ pass |
| 02-02-01 | 02 | 2 | DISP-01 | T-02-05 | Generate native labels from validated monitor identities and broadcast global mode | unit/integration | `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && cargo test --manifest-path src-tauri/Cargo.toml controller` | Registry add/remove/update or controller broadcast tests fail | ✅ committed | ✅ pass |
| 02-02-02 | 02 | 2 | DISP-03 | T-02-06 | Preserve retained scene records when a viewport is removed and recover native failures | unit | `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && cargo test --manifest-path src-tauri/Cargo.toml controller && pnpm build` | Registry/controller recovery or production build fails | ✅ committed | ✅ pass |
| 02-03-01 | 03 | 3 | DISP-01 | T-02-10 | Map canonical points to local logical viewport and DPR backing size | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | Viewport transform, scene bridge, or frontend build fails | ✅ committed | ✅ pass |
| 02-03-02 | 03 | 3 | DISP-04 | T-02-12 | Broadcast mode badge state and scoped recovery to every display viewport | unit | `pnpm exec vitest run src/components/mode-badge.test.tsx && pnpm exec vitest run src/components/error-badge.test.tsx && pnpm test` | Badge, scoped recovery, or full frontend unit suite fails | ✅ committed | ✅ pass |
| 02-05-01 | 05 | 4 | DISP-04 | T-02-19 | Validate the shared shortcut, tool-order, mode-feedback, and export-semantics fixture in TypeScript and Rust | unit/native contract | `pnpm exec vitest run src/types/platform-parity.test.ts && cargo test --manifest-path src-tauri/Cargo.toml parity_schema && pnpm build` | TypeScript/Rust parity fixture, native read-only command, or production build fails | ✅ W0 | ✅ pass |
| 02-05-02 | 05 | 4 | DISP-04 | T-02-20 | Lock parity invariants and trace exact contract commands for the dependent E2E suite | unit/traceability | `pnpm exec vitest run src/types/platform-parity.test.ts && cargo test --manifest-path src-tauri/Cargo.toml parity_schema && rg -n "02-05-01|02-05-02|platform-parity.test.ts|parity_schema" .planning/phases/02-display-topology-platform-parity/02-VALIDATION.md` | Parity invariants, native serialization, or validation task rows are missing | ✅ W0 | ✅ pass |
| 02-04-01 | 04 | 5 | DISP-02 | T-02-14 | Refresh topology from native observers and preserve state on capability failure | unit/native | `cargo test --manifest-path src-tauri/Cargo.toml platform && cargo test --manifest-path src-tauri/Cargo.toml topology` | Platform observer, capability, or topology scheduling tests fail | ✅ committed | ✅ pass |
| 02-04-02 | 04 | 5 | DISP-04 | T-02-17 | Verify viewport, parity-contract, mode, and recovery behavior on macOS and Windows | e2e/manual | `pnpm exec wdio run wdio.conf.ts --suite phase2-matrix && pnpm build && test -f .github/workflows/phase2.yml && test -f docs/support-matrix.md` | E2E parity/topology assertions, build, CI, or support artifact fails | ✅ contract | ⬜ pending |
| 02-04-03 | 04 | 5 | DISP-01, DISP-02, DISP-03, DISP-04 | T-02-15 | Record manual mixed-DPI, negative-origin, rotation, hot-plug, and full-screen evidence by OS | manual-only | `test -f docs/support-matrix.md && rg -q "Mixed-DPI" docs/support-matrix.md && rg -q "Negative origin" docs/support-matrix.md && rg -q "Borderless" docs/support-matrix.md` | Required hardware rows or platform evidence fields are missing | ✅ contract | ⬜ pending |

## Wave 0 Requirements

- [x] `src-tauri/src/display.rs` or equivalent — monitor descriptors, identity, transforms, diff, and coalescing fixtures.
- [x] `src-tauri/src/overlay_registry.rs` or equivalent — fake adapter tests for add/remove/update/broadcast and scene retention.
- [x] `src-tauri/src/platform/*` fixtures — platform event-to-snapshot reconciliation and actionable failure cases.
- [x] `src/components/OverlaySurface.test.tsx` or equivalent — canonical point transform and DPR backing dimensions.
- [x] `src/types/platform-parity-schema.json`, TypeScript tests, and Rust parity-schema tests — shared shortcut concepts, tool-order, and export-semantics contract.
- [x] `tests/e2e/display-topology.e2e.ts` plus `phase2-matrix` suite entry — per-display windows, badges, topology fixture, and mode broadcast.
- [ ] Manual hardware matrix — mixed DPI, rotation, negative origin, add/remove, and supported/limited full-screen modes on macOS and Windows.

## Plan decomposition alignment

The executable plan set uses five dependency waves: `02-01` (canonical model and tracer), `02-02` (registry and native lifecycle), `02-03` (renderer and parity feedback), `02-05` (shared parity contract), and `02-04` (platform observers, E2E/CI, support evidence, and manual hardware checkpoint). Task `02-04-03` is intentionally manual-only because the macOS host cannot provide the required Windows and physical multi-display evidence.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|-----------|-------------------|
| Mixed-DPI placement and negative-origin alignment | DISP-01 | Requires two physical displays with independent scale factors and a virtual desktop origin | On macOS and Windows, connect displays with different scales, place one to the left, rotate one display, show overlay, and verify marks align at each native origin and resolution. |
| Borderless/native full-screen overlay persistence | DISP-02 | Compositor and Space behavior cannot be reproduced by unit tests | Exercise a supported borderless/native full-screen app on both platforms; verify overlay remains aligned. Exercise exclusive full-screen and record Limited/Unsupported behavior without losing scene state. |
| Hot-plug and DPI/rotation reconciliation | DISP-03 | Physical add/remove and OS display reconfiguration are hardware-dependent | Show overlay, add/remove a display, rotate it, change scale, and verify windows reconcile without restart and retained marks return when the display returns. |
| Cross-platform parity matrix | DISP-04 | Requires both macOS and Windows runners and native shortcut behavior | Run the same show/hide/click-through/emergency-hide flow on both OSes and compare mode labels, badge placement, shortcut concepts, the ordered tool vocabulary exposed by the parity contract, export one-pass/composition exclusions, and scene retention. |

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing topology, registry, renderer, and E2E fixtures
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for local checks
- [ ] `nyquist_compliant: true` set in frontmatter after execution validation

**Approval:** pending

---
phase: "03"
slug: "core-annotation-tools"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for the retained Canvas annotation tools, typed scene
> mutations and realtime pointer/text interaction.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 for TypeScript; Rust `cargo test` for native scene logic; WebdriverIO/Tauri service for desktop smoke coverage |
| **Config file** | `vitest.config.ts`; Rust tests are inline `#[cfg(test)]` modules; `wdio.conf.ts` |
| **Quick run command** | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` |
| **Full suite command** | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build` |
| **Estimated runtime** | ~30 seconds for local unit/native checks; native E2E varies by host |

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry`
- **After every plan wave:** Run `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build`
- **Before `$gsd-verify-work`:** Full suite must be green and macOS/Windows native smoke checks must be completed where a runner is available.
- **Max feedback latency:** 30 seconds for local unit/native checks.

## Per-Task Verification Map

The final planner decomposition is eight tasks across four sequential waves. Every row below
is intentionally pending until `$gsd-execute-phase 03` runs it; the commands are grounded in
the existing project scripts and tool configuration.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Failure signal | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|----------------|-------------|--------|
| 03-01-01 | 01 | 1 | DRAW-01, DRAW-02 | T-03-01-01 | Typed pen/highlighter style and bounded payload; transient preview does not mutate retained scene before valid commit | unit + native | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && pnpm build` | Renderer/native test failure, malformed payload accepted, duplicate retained, or build exits non-zero | ✅ extend existing/native module | ⬜ pending |
| 03-01-02 | 01 | 1 | DRAW-01, DRAW-02 | T-03-01-04 | Per-tool style state and scene-excluded toolbar/property chrome preserve click-through boundary | unit + build | `pnpm exec vitest run src/state/annotation.test.ts && pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | Style-isolation/toolbar assertions fail or frontend build exits non-zero | ✅ Wave 0 creates state test | ⬜ pending |
| 03-02-01 | 02 | 2 | DRAW-03 | T-03-02-01 | Line/arrow geometry is finite, thresholded and validated; arrow preview/commit remains one item | unit + native | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` | Line/arrow geometry, threshold, arrowhead or native validation tests fail | ✅ extend existing/native module | ⬜ pending |
| 03-02-02 | 02 | 2 | DRAW-04 | T-03-02-01 | Rectangle/ellipse bounds and independent fill/opacity are validated without changing unrelated scene items | unit + native | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && pnpm build` | Shape rendering/fill, payload validation, retention, or build tests fail | ✅ extend existing/native module | ⬜ pending |
| 03-03-01 | 03 | 3 | DRAW-05 | T-03-03-01 | Text draft is bounded and Canvas-rendered; Enter/Shift+Enter/Esc and IME handling keep committed scene isolated | unit + build | `pnpm exec vitest run src/state/annotation.test.ts && pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | Text placement, keyboard lifecycle, IME, hit-test, renderer, or build assertions fail | ✅ extended from Wave 0 | ⬜ pending |
| 03-03-02 | 03 | 3 | DRAW-06 | T-03-03-04 | Reverse topmost hit-test selects one ID and native erase removes at most one item/no-op | unit + native | `pnpm exec vitest run src/state/annotation.test.ts && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && pnpm build` | Hover/overlap/type-specific hit-test, exactly-one erase, no-op, or command wiring tests fail | ✅ extend state/native module | ⬜ pending |
| 03-04-01 | 04 | 4 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-04-05 | Native smoke path uses the real toolbar, scene snapshot, text lifecycle, eraser command and global click-through | e2e/manual | `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` | WebDriver startup failure, missing suite, or any tool/mode/text/eraser smoke test fails | ❌ Wave 0 | ⬜ pending |
| 03-04-02 | 04 | 4 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-04-05 | Validation artifact is traceable to all plan tasks and leaves platform/manual evidence honest | validation | `test -f .planning/phases/03-core-annotation-tools/03-VALIDATION.md && for id in 03-01-01 03-01-02 03-02-01 03-02-02 03-03-01 03-03-02 03-04-01 03-04-02; do rg -q "$id" .planning/phases/03-core-annotation-tools/03-VALIDATION.md || exit 1; done` | Missing task ID or validation file causes non-zero exit | ✅ this artifact | ⬜ pending |

## Wave 0 Requirements

- [ ] `src/state/annotation.test.ts` — created/extended by 03-01-02 and 03-03-01 for tool/style state, text draft lifecycle and hit-testing.
- [ ] `src/components/overlay-surface.test.tsx` — extended by 03-01-01, 03-02-01 and 03-02-02 for all Canvas tools while preserving coordinate/DPR regressions.
- [ ] `src-tauri/src/overlay_registry.rs` — extended by 03-01-01, 03-02-01, 03-02-02 and 03-03-02 for typed validation, exactly-one erase, no-op/unknown-ID invariants and retained snapshots.
- [ ] `wdio.conf.ts` plus `tests/e2e/core-annotation-tools.e2e.ts` — created by 03-04-01 for selection, drawing, text keyboard lifecycle, eraser preview and scene-excluded toolbar behavior.
- [ ] Windows native runner/evidence — 03-04-01 manual matrix; macOS pass is not Windows parity evidence.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thin strokes and visual style | DRAW-01, DRAW-02, DRAW-03, DRAW-04 | Perceived line weight, opacity, highlighter blending and shape fill depend on display scale and underlying app content | On macOS and Windows, draw pen/highlighter/line/arrow/rectangle/ellipse over readable content; confirm the default stroke is visibly thinner, tool styles remain independent, and previews track the pointer. Record separate host evidence. |
| Toolbar and click-through safety | DRAW-01 through DRAW-06 | Native hit-testing and transparent window behavior cannot be fully proven by node tests | Show overlay on every active display, switch drawing/click-through, use the toolbar only in drawing mode, and confirm the underlying app receives input in click-through while annotations remain visible on macOS and Windows. |
| Text input/IME lifecycle | DRAW-05 | Keyboard composition and native WebView focus behavior vary by macOS/Windows and input method | Place text, type multiple lines with `Shift + Enter`, commit with `Enter`, start another draft and cancel with `Esc`; verify existing scene items never change on cancel on both hosts. |
| Multi-display annotation placement | DRAW-01 through DRAW-06 | Requires physical displays with negative origins, rotation or mixed DPR | Draw on each display and verify canonical placement, previews and eraser hit-testing remain aligned after switching viewports; do not substitute a single-display pass for the matrix. |

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing test files and native smoke fixtures
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for local checks
- [ ] `nyquist_compliant: true` set in frontmatter after execution validation

## Multi-source coverage audit

| Source | ID | Feature/decision | Plan | Status |
|--------|----|------------------|------|--------|
| GOAL | — | Phase 3 core annotation tools on the shared overlay | 03-01 through 03-04 | COVERED |
| REQ | DRAW-01 | Freehand strokes with configurable color, opacity and width | 03-01 | COVERED |
| REQ | DRAW-02 | Semi-transparent highlighter with configurable color, opacity and width | 03-01 | COVERED |
| REQ | DRAW-03 | Straight lines and arrows with configurable style | 03-02 | COVERED |
| REQ | DRAW-04 | Rectangles and ellipses with independent fill/opacity style | 03-02 | COVERED |
| REQ | DRAW-05 | Pre-commit text create/edit/commit/cancel with color and size | 03-03 | COVERED |
| REQ | DRAW-06 | Eraser removes one annotation without unrelated changes | 03-03 | COVERED |
| RESEARCH | R-01 | Typed discriminated retained scene and native validation | 03-01, 03-02, 03-03 | COVERED |
| RESEARCH | R-02 | Pointer gesture transient preview then one valid commit | 03-01, 03-02, 03-03 | COVERED |
| RESEARCH | R-03 | Canonical coordinates, rotation, negative origin and per-display DPR | 03-01 through 03-04 | COVERED |
| RESEARCH | R-04 | Whole SceneSnapshot invoke/listen/broadcast synchronization | 03-01, 03-03, 03-04 | COVERED |
| RESEARCH | R-05 | Scene-excluded text draft and Canvas measured text path | 03-03, 03-04 | COVERED |
| RESEARCH | R-06 | Reverse topmost type-specific hit-test and one-item erase | 03-03, 03-04 | COVERED |
| RESEARCH | R-07 | Malformed/oversized payload, duplicate ID and pointer interception mitigations | 03-01, 03-03, 03-04 | COVERED |
| RESEARCH | R-08 | Existing Canvas/React/Rust/Vitest/WebdriverIO stack and no new dependency | 03-01 through 03-04 | COVERED |
| CONTEXT | D-01 | Bottom drawing toolbar, UI chrome, scene-excluded | 03-01-02, 03-04-01 | COVERED |
| CONTEXT | D-02 | One-click persistent tool selection | 03-01-02, 03-04-01 | COVERED |
| CONTEXT | D-03 | Compact property popover for active tool | 03-01-02, 03-04-01 | COVERED |
| CONTEXT | D-04 | Per-tool in-session color/opacity/width/fill/text-size memory | 03-01-02, 03-04-01 | COVERED |
| CONTEXT | D-05 | Thinner defaults with adjustable width | 03-01-01, 03-01-02, 03-04-01 | COVERED |
| CONTEXT | D-06 | Realtime transient preview and valid-end commit | 03-01-01, 03-02-01, 03-02-02 | COVERED |
| CONTEXT | D-07 | Short geometry drag ignored | 03-02-01, 03-02-02 | COVERED |
| CONTEXT | D-08 | Solid compact triangular arrowhead | 03-02-01, 03-04-01 | COVERED |
| CONTEXT | D-09 | Independent rectangle/ellipse fill style | 03-02-02, 03-01-02 | COVERED |
| CONTEXT | D-10 | Esc/outside/mode/focus cancellation without scene mutation | 03-02-01, 03-03-01 | COVERED |
| CONTEXT | D-11 | Click-to-place text and immediate input | 03-03-01, 03-04-01 | COVERED |
| CONTEXT | D-12 | Enter commit, Shift+Enter newline, Esc cancel | 03-03-01, 03-04-01 | COVERED |
| CONTEXT | D-13 | Draft-only editing; committed text stays unchanged | 03-03-01 | COVERED |
| CONTEXT | D-14 | Click-only eraser removes one item | 03-03-02, 03-04-01 | COVERED |
| CONTEXT | D-15 | Latest/topmost overlap wins | 03-03-01, 03-03-02 | COVERED |
| CONTEXT | D-16 | Type-specific padded hit-test | 03-03-01, 03-03-02 | COVERED |
| CONTEXT | D-17 | Hover highlight before click mutation | 03-03-02, 03-04-01 | COVERED |

**Approval:** pending

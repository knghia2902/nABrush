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

The task IDs below are the initial validation split for planning. If the planner uses a
different plan/task decomposition, it must preserve these requirement rows and update the
IDs/commands before the plans are finalized.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Failure signal | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|----------------|-------------|--------|
| 03-01-01 | 01 | 1 | DRAW-01, DRAW-02 | T-03-01 | Style values are bounded and active preview never mutates the retained scene before commit | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx` | Pen/highlighter preview, canonical path, style isolation or realtime redraw tests fail | ✅ extend existing | ⬜ pending |
| 03-01-02 | 01 | 1 | DRAW-03 | T-03-02 | Line/arrow preview commits only a valid start/end geometry and keeps arrow rendering deterministic | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx` | Line/arrow geometry, threshold or preview tests fail | ✅ extend existing | ⬜ pending |
| 03-02-01 | 02 | 2 | DRAW-04 | T-03-03 | Shape geometry/fill/opacity are validated and rendered without changing unrelated scene items | unit + native | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` | Shape rendering, payload validation or scene retention tests fail | ✅ extend existing/native module | ⬜ pending |
| 03-03-01 | 03 | 3 | DRAW-05 | T-03-04 | Draft text is bounded, rendered as text data rather than HTML, and cancel never mutates committed scene | unit | `pnpm exec vitest run src/state/annotation.test.ts` | Text placement, Enter/Shift+Enter/Esc or draft isolation tests fail | ❌ Wave 0 | ⬜ pending |
| 03-04-01 | 04 | 4 | DRAW-06 | T-03-05 | Eraser reverse-hit-tests one topmost ID and native mutation removes only that item | unit + native | `pnpm exec vitest run src/state/annotation.test.ts && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` | Hover target, overlap order, type-specific hit-test or one-item erase tests fail | ❌/✅ extend + native module | ⬜ pending |
| 03-04-02 | 04 | 4 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-06 | Native overlay keeps toolbar/chrome scene-excluded and preserves global click-through/multi-display scene behavior | e2e/manual | `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` | Tool selection, native pointer/text flow, click-through or cross-display smoke suite fails | ❌ Wave 0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `src/state/annotation.test.ts` — pure tests for tool/style state, text draft lifecycle and hit-testing.
- [ ] `src/components/overlay-surface.test.tsx` — geometry/style/preview tests for all canvas tools, preserving existing coordinate/DPR regressions.
- [ ] `src-tauri/src/overlay_registry.rs` — typed payload validation, exactly-one erase, no-op/unknown-ID invariants and retained snapshot tests.
- [ ] `wdio.conf.ts` plus a phase-3 tool smoke suite — selection, drawing, text keyboard lifecycle, eraser preview and scene-excluded toolbar behavior.
- [ ] Windows native runner/evidence — macOS pass must not be treated as Windows parity evidence.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thin strokes and visual style | DRAW-01, DRAW-02, DRAW-03, DRAW-04 | Perceived line weight, opacity, highlighter blending and shape fill depend on display scale and underlying app content | On macOS and Windows, draw pen/highlighter/line/arrow/rectangle/ellipse over readable content; confirm the default stroke is visibly thinner, tool styles remain independent, and previews track the pointer. |
| Toolbar and click-through safety | DRAW-01 through DRAW-06 | Native hit-testing and transparent window behavior cannot be fully proven by node tests | Show overlay on every active display, switch drawing/click-through, use the toolbar only in drawing mode, and confirm the underlying app receives input in click-through while annotations remain visible. |
| Text input/IME lifecycle | DRAW-05 | Keyboard composition and native WebView focus behavior vary by macOS/Windows and input method | Place text, type multiple lines with `Shift + Enter`, commit with `Enter`, start another draft and cancel with `Esc`; verify existing scene items never change on cancel. |
| Multi-display annotation placement | DRAW-01 through DRAW-06 | Requires physical displays with negative origins, rotation or mixed DPR | Draw on each display and verify canonical placement, previews and eraser hit-testing remain aligned after switching viewports. |

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing test files and native smoke fixtures
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for local checks
- [ ] `nyquist_compliant: true` set in frontmatter after execution validation

**Approval:** pending

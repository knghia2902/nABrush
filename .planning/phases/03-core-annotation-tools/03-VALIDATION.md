---
phase: "03"
slug: "core-annotation-tools"
status: gaps_found
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 03 — Validation Strategy

> Evidence ledger for the retained Canvas annotation tools, typed scene mutations,
> realtime pointer/text interaction, and separate macOS/Windows native boundaries.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.0 for TypeScript; Rust `cargo test` for native scene logic; WebdriverIO/Tauri service for desktop smoke coverage |
| **Config file** | `vitest.config.ts`; Rust tests are inline `#[cfg(test)]` modules; `wdio.conf.ts` |
| **Quick run command** | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` |
| **Full suite command** | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build` |
| **Native smoke command** | `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` |
| **Estimated runtime** | ~30 seconds for local unit/native checks; native E2E varies by host |

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry`
- **After every plan wave:** Run `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm build`
- **Before `$gsd-verify-work`:** Full suite must be green and macOS/Windows native smoke checks must be completed where a runner is available.
- **Max feedback latency:** 30 seconds for local unit/native checks.

## Per-Task Verification Map

The ledger records all historical and gap-closure tasks. Historical rows cite their completed
plan summaries; fresh rows include the observed UTC run timestamp. A local PASS never stands
in for native or cross-platform evidence.

| Task ID | Plan | Wave | Requirement | Threat Ref | Automated command | Run/evidence time (UTC) | Exit | Observed result | Failure signal | Status |
|---------|------|------|-------------|------------|-------------------|-------------------------|------|------------------|----------------|--------|
| 03-01-01 | 01 | 1 | DRAW-01, DRAW-02 | T-03-01 | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && pnpm build` | 2026-09-10; 03-01-SUMMARY | 0 | Historical targeted renderer/native validation and build passed; completed plan recorded full frontend/native suites green (35/37 tests). | Renderer/native test failure, malformed payload accepted, duplicate retained, or build exits non-zero. | PASS (historical) |
| 03-01-02 | 01 | 1 | DRAW-01, DRAW-02 | T-03-01 | `pnpm exec vitest run src/state/annotation.test.ts && pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | 2026-09-10; 03-01-SUMMARY | 0 | Historical state/renderer assertions and production build passed; per-tool style and scene-excluded chrome were verified. | Style isolation, toolbar exclusion, or frontend build exits non-zero. | PASS (historical) |
| 03-02-01 | 02 | 2 | DRAW-03 | T-03-02 | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` | 2026-09-11; 03-02-SUMMARY | 0 | Historical targeted renderer and native geometry validation passed; completed plan recorded full frontend/native suites green (42/41 tests). | Line/arrow geometry, threshold, arrowhead, or native validation tests fail. | PASS (historical) |
| 03-02-02 | 02 | 2 | DRAW-04 | T-03-03 | `pnpm exec vitest run src/components/overlay-surface.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && pnpm build` | 2026-09-11; 03-02-SUMMARY | 0 | Historical shape renderer, fill isolation, native validation, and production build passed. | Shape rendering/fill, payload validation, retention, or build tests fail. | PASS (historical) |
| 03-03-01 | 03 | 3 | DRAW-05 | T-03-03 | `pnpm exec vitest run src/state/annotation.test.ts && pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | 2026-09-11; 03-03-SUMMARY | 0 | Historical text draft, IME guard, hit-test, Canvas renderer, and build checks passed. | Text placement, keyboard lifecycle, IME, hit-test, renderer, or build assertions fail. | PASS (historical) |
| 03-03-02 | 03 | 3 | DRAW-06 | T-03-04 | `pnpm exec vitest run src/state/annotation.test.ts && cargo test --manifest-path src-tauri/Cargo.toml overlay_registry && pnpm build` | 2026-09-11; 03-03-SUMMARY | 0 | Historical reverse topmost hit-test, exactly-one erase, no-op native mutation, and build checks passed. | Hover/overlap/type-specific hit-test, exactly-one erase, no-op, or command wiring tests fail. | PASS (historical) |
| 03-04-01 | 04 | 4 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-05 | `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` | 2026-09-11; 03-04-SUMMARY | 1 | Historical macOS WebKit run launched and discovered the suite, but failed at drawing pointer-up: 2 passing, 1 failing; cleanup warned `sessionId` was required. | WebDriver cannot start, suite is missing, or any tool/mode/text/eraser assertion fails. | FAIL (macOS native) |
| 03-04-02 | 04 | 4 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-06 | `test -f .planning/phases/03-core-annotation-tools/03-VALIDATION.md && for id in 03-01-01 03-01-02 03-02-01 03-02-02 03-03-01 03-03-02 03-04-01 03-04-02; do rg -q "$id" .planning/phases/03-core-annotation-tools/03-VALIDATION.md || exit 1; done && rg -q 'phase3-tools' .planning/phases/03-core-annotation-tools/03-VALIDATION.md && rg -q 'Multi-source coverage audit' .planning/phases/03-core-annotation-tools/03-VALIDATION.md` | 2026-09-11; 03-04-SUMMARY | 0 | Historical validation traceability command passed and retained the eight task IDs, suite reference, and source audit. | Missing task ID, suite registration, audit heading, or validation file causes non-zero exit. | PASS (historical) |
| 03-05-01 | 05 | 5 | DRAW-04 | T-03-05 | `pnpm build` | 2026-09-11T01:46:23Z | 0 | `tsc --noEmit && vite build` passed; Vite transformed 31 modules and wrote the production bundle. | TypeScript cannot resolve the extracted toolbar or Vite production build fails. | PASS |
| 03-05-02 | 05 | 5 | DRAW-04 | T-03-05 | `pnpm exec vitest run src/components/annotation-toolbar.test.tsx src/state/annotation.test.ts && pnpm build` | 2026-09-11T01:46:28Z | 0 | 2 files/10 tests passed; subsequent build passed and transformed 31 modules. | Component marker/value/range assertion fails, per-tool immutability is violated, or production build fails. | PASS |
| 03-06-01 | 06 | 6 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-06 | `pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | 2026-09-11T01:46:33Z | 0 | 1 file/21 tests passed; subsequent build passed and transformed 31 modules. | Transient/pointer lifecycle assertion fails, mismatched terminal can commit, or frontend build fails. | PASS |
| 03-06-02 | 06 | 6 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-06 | `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` | 2026-09-11T01:46:40Z | 1 | macOS provider diagnostics passed (6 checks); overlay switch timed out, then `window not found` failed the `before all` hook. No native assertions ran; cleanup warned `sessionId` was required. | WebDriver cannot switch to overlay, preview is absent, retained count is not exactly one, shape style fails, or text/eraser/click-through assertions fail. | FAIL (macOS native) |
| 03-07-01 | 07 | 7 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-07-01 | `test -f .planning/ROADMAP.md && rg -q '^\\*\\*Goal\\*\\*: As a presenter, I want to create basic annotations quickly and smoothly on the overlay scene using pointer or keyboard controls, so that I can explain on-screen content without leaving the active application\\.$' .planning/ROADMAP.md && node "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/gsd-tools.cjs" query user-story.validate --story "As a presenter, I want to create basic annotations quickly and smoothly on the overlay scene using pointer or keyboard controls, so that I can explain on-screen content without leaving the active application." --pick valid | rg -q '^true$'` | 2026-09-11; task gate | 0 | Roadmap file exists, exact goal line matches, and `user-story.validate` returned `true`. | Exact Phase 3 goal missing/altered or validator returns false. | PASS |
| 03-07-02 | 07 | 7 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06 | T-03-07-02 | `test -f .planning/phases/03-core-annotation-tools/03-VALIDATION.md && for id in 03-01-01 03-01-02 03-02-01 03-02-02 03-03-01 03-03-02 03-04-01 03-04-02 03-05-01 03-05-02 03-06-01 03-06-02 03-07-01 03-07-02; do rg -q "$id" .planning/phases/03-core-annotation-tools/03-VALIDATION.md || exit 1; done && rg -q '^status: (gaps_found|complete)$' .planning/phases/03-core-annotation-tools/03-VALIDATION.md && rg -qi 'macOS' .planning/phases/03-core-annotation-tools/03-VALIDATION.md && rg -qi 'Windows' .planning/phases/03-core-annotation-tools/03-VALIDATION.md && rg -q 'phase3-tools' .planning/phases/03-core-annotation-tools/03-VALIDATION.md && rg -qi 'PASS|FAIL|NOT RUN|PENDING' .planning/phases/03-core-annotation-tools/03-VALIDATION.md` | 2026-09-11; after reconstruction | 0 | Ledger contains all 14 IDs, explicit `gaps_found`, macOS/Windows boundaries, native suite command, and PASS/FAIL/PENDING/NOT RUN markers. | Any task ID, platform boundary, command, status token, or incomplete-state field is absent. | PASS |

## Local Automated Evidence

Fresh local runs on this macOS host, recorded separately from native WebDriver evidence:

| Command | UTC run | Exit | Observed output |
|---------|---------|------|-----------------|
| `pnpm test` | 2026-09-11T01:46:14Z | 0 | Vitest: 7 test files passed, 51 tests passed, 0 failed. |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 2026-09-11T01:46:19Z | 0 | Cargo: 42 tests passed, 0 failed; 18 pre-existing dead-code warnings. |
| `pnpm build` | 2026-09-11T01:46:23Z | 0 | `tsc --noEmit && vite build` passed; 31 modules transformed. |
| `pnpm exec vitest run src/components/annotation-toolbar.test.tsx src/state/annotation.test.ts && pnpm build` | 2026-09-11T01:46:28Z | 0 | 2 files/10 tests passed; build passed. |
| `pnpm exec vitest run src/components/overlay-surface.test.tsx && pnpm build` | 2026-09-11T01:46:33Z | 0 | 1 file/21 tests passed; build passed. |

The Cargo warning set is unchanged and concerns pre-existing unused native/controller
seams; it is not converted into a Phase 3 pass/fail signal.

## Platform Evidence

Platform results are intentionally non-interchangeable. Local tests and macOS output do
not satisfy the Windows row.

| Platform | Status | Host/runtime | Automated evidence | Manual/native evidence boundary |
|----------|--------|--------------|--------------------|----------------------------------|
| macOS | FAIL (native smoke); local automated PASS | Current macOS host; embedded WebKit 605.1.15 | `phase3-tools` at 2026-09-11T01:46:40Z: provider diagnostics passed, then overlay window switch failed in `before all` (`window not found`); exit 1. | No pointer, text, eraser, or click-through assertions ran in the latest attempt. This is macOS-only evidence and does not imply Windows behavior. |
| Windows | NOT RUN — no Windows host available | No Windows 2022 runner or Windows 10 22H2+ device available in this execution shell | No Windows command result exists. | Windows parity, native input, click-through, text/IME, eraser, and display evidence remain absent and must stay incomplete. |

### Runnable Windows path

On a Windows 2022 runner or a Windows 10 22H2+ device, run the following exact setup
and command sequence and attach the dated output to the Windows row:

```text
pnpm install --frozen-lockfile
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm exec tauri build --debug
pnpm exec wdio run wdio.conf.ts --suite phase3-tools
```

Then record OS version, runner/device identity, build date, exit status, and evidence for:

1. Selecting all eight tools in the locked order and opening each applicable property popover.
2. Pen, highlighter, line, arrow, rectangle, and ellipse preview while held, followed by exactly one retained item after pointer-up.
3. Rectangle and ellipse fill color/fill opacity values remaining distinct in their committed snapshots.
4. Text placement, immediate focus, multiline `Shift + Enter`, `Enter` commit, and `Esc` cancellation without changing existing items; include an IME/composition check.
5. Eraser hover highlight, topmost overlap selection, one click removing one item, and drag/miss remaining non-destructive.
6. Drawing-mode toolbar/property/editor exclusion, click-through input to the underlying app, emergency hide/recovery, and each connected display including mixed-DPR, rotation, or negative-origin cases.

## Manual Evidence Matrix

Source inspection and unit tests are references only; they do not become manual PASS
without host-observed evidence.

| Behavior | Requirement | macOS status/evidence | Windows status/evidence |
|----------|-------------|----------------------|------------------------|
| Thin defaults and visual style | DRAW-01, DRAW-02, DRAW-03, DRAW-04 | PENDING — defaults/style assertions exist, but no completed visual sign-off; latest native run stopped before gestures. | PENDING — no Windows host available. |
| Realtime preview and valid-end commit | DRAW-01, DRAW-02, DRAW-03, DRAW-04 | PENDING — lifecycle unit tests pass; native pointer path did not reach gesture assertions. | PENDING — no Windows host available. |
| Toolbar placement and click-through safety | DRAW-01 through DRAW-06 | PENDING — source markers exist; latest native run did not establish overlay interaction. | PENDING — no Windows host available. |
| Text input/IME lifecycle | DRAW-05 | PENDING — pure draft/Canvas tests pass; no host-observed IME evidence. | PENDING — no Windows host available. |
| Eraser hover/topmost/click-only behavior | DRAW-06 | PENDING — pure hit-test/native store tests pass; no native hover/click evidence. | PENDING — no Windows host available. |
| Multi-display canonical placement | DRAW-01 through DRAW-06 | PENDING — coordinate/DPR/rotation unit coverage exists; no full manual matrix completed. | PENDING — no Windows host available. |

## Wave 0 and Sign-Off State

- [x] All 14 tasks have an automated verify command recorded in this ledger.
- [x] Sampling continuity is preserved; no three consecutive tasks lack an automated verify.
- [x] Frontend state/renderer tests, inline native registry tests, and the `phase3-tools` fixture exist.
- [x] Commands contain no watch-mode flags.
- [x] Local feedback is within the documented latency target.
- [ ] Windows native runner/evidence is available and attached.
- [ ] Required macOS native/manual behavior is fully observed.
- [ ] `nyquist_compliant: true` — intentionally remains false while native/manual/platform evidence is incomplete.

## Scope and Evidence Rules

- Phase 3 remains local-first; no server, database, or new dependency was introduced.
- The retained SceneSnapshot is the only semantic scene source; toolbar, draft, hover, and
  pointer diagnostics remain renderer/chrome evidence, not retained scene items.
- The Phase 3 fence remains limited to pen, highlighter, line, arrow, rectangle, ellipse,
  text draft lifecycle, and single-item eraser. Undo/redo, ink lifecycle, capture/export,
  cloud sync, collaboration, and other deferred work are not claimed here.
- `status: gaps_found`, `nyquist_compliant: false`, and `wave_0_complete: false` remain
  deliberate until the missing native/manual evidence is attached.

## Multi-source coverage audit

> `COVERED (traceability)` means the source item is assigned to a concrete Phase 3
> plan; it does not certify native, manual, or cross-platform behavior. Those
> outcome states remain in the requirements, platform, manual, and sign-off
> sections above.

| Source | ID | Feature/decision | Plan | Status |
|--------|----|------------------|------|--------|
| GOAL | — | Canonical Phase 3 presenter story: create basic annotations quickly and smoothly on the shared overlay using pointer or keyboard controls without leaving the active application | 03-07-01, 03-08-01 | COVERED (traceability) |
| REQ | DRAW-01 | Freehand strokes with configurable color, opacity and width | 03-01-01, 03-01-02, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| REQ | DRAW-02 | Semi-transparent highlighter with configurable color, opacity and width | 03-01-01, 03-01-02, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| REQ | DRAW-03 | Straight lines and arrows with configurable style | 03-02-01, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| REQ | DRAW-04 | Rectangles and ellipses with independent fill/opacity style | 03-02-02, 03-04-01, 03-05-01, 03-05-02, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| REQ | DRAW-05 | Pre-commit text create/edit/commit/cancel with color and size | 03-03-01, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| REQ | DRAW-06 | Eraser removes one annotation without unrelated changes | 03-03-02, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-01 | Typed discriminated retained scene and native validation | 03-01-01, 03-02-01, 03-02-02, 03-03-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-02 | Pointer gesture transient preview then one valid commit | 03-01-01, 03-02-01, 03-02-02, 03-04-01, 03-06-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-03 | Canonical coordinates, rotation, negative origin and per-display DPR | 03-01-01, 03-02-01, 03-02-02, 03-04-01, 03-06-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-04 | Whole SceneSnapshot invoke/listen/broadcast synchronization | 03-01-01, 03-03-02, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-05 | Scene-excluded text draft and Canvas measured text path | 03-03-01, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-06 | Reverse topmost type-specific hit-test and one-item erase | 03-03-02, 03-04-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-07 | Malformed/oversized payload, duplicate ID and pointer interception mitigations | 03-01-01, 03-03-02, 03-04-01, 03-05-01, 03-06-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-08 | Existing Canvas/React/Rust/Vitest/WebdriverIO stack and no new dependency | 03-01-01 through 03-04-02, 03-05-01, 03-05-02, 03-06-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| RESEARCH | R-09 | macOS WebKit pointer limitation and unavailable Windows host evidence | 03-06-01, 03-06-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-01 | Bottom drawing toolbar, UI chrome, scene-excluded | 03-01-02, 03-04-01, 03-05-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-02 | One-click persistent tool selection | 03-01-02, 03-04-01, 03-05-01, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-03 | Compact property popover for active tool | 03-01-02, 03-04-01, 03-05-01, 03-05-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-04 | Per-tool in-session color/opacity/width/fill/text-size memory | 03-01-02, 03-04-01, 03-05-01, 03-05-02, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-05 | Thinner defaults with adjustable width | 03-01-01, 03-01-02, 03-04-01, 03-05-01, 03-05-02, 03-07-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-06 | Realtime transient preview and valid-end commit | 03-01-01, 03-02-01, 03-02-02, 03-06-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-07 | Short geometry drag ignored | 03-02-01, 03-02-02, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-08 | Solid compact triangular arrowhead | 03-02-01, 03-04-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-09 | Independent rectangle/ellipse fill style | 03-02-02, 03-05-01, 03-05-02, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-10 | Esc/outside/mode/focus cancellation without scene mutation | 03-02-01, 03-02-02, 03-03-01, 03-06-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-11 | Click-to-place text and immediate input | 03-03-01, 03-04-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-12 | Enter commit, Shift+Enter newline, Esc cancel | 03-03-01, 03-04-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-13 | Draft-only editing; committed text stays unchanged | 03-03-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-14 | Click-only eraser removes one item | 03-03-02, 03-04-01, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-15 | Latest/topmost overlap wins | 03-03-01, 03-03-02, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-16 | Type-specific padded hit-test | 03-03-01, 03-03-02, 03-06-02, 03-08-01 | COVERED (traceability) |
| CONTEXT | D-17 | Hover highlight before click mutation | 03-03-02, 03-04-01, 03-06-02, 03-08-01 | COVERED (traceability) |

**Approval:** pending

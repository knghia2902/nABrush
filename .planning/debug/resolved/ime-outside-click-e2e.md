---
slug: ime-outside-click-e2e
status: resolved
trigger: "After Phase 4 review fixes, the macOS phase4-editing WDIO suite fails when an outside click occurs during an active IME composition."
created: 2026-09-12
updated: 2026-09-12
---

## Symptoms

- **Expected:** Clicking outside a text draft during an active IME composition keeps the draft mounted until `compositionend`; the final composed value is then committed exactly once.
- **Actual:** The editor is already gone before `compositionend` is dispatched, so the test assertion `expect(await editor.isExisting()).toBe(true)` fails.
- **Error:** `Expected: true; Received: false` at `tests/e2e/editing-ink-lifecycle.e2e.ts:600:39`.
- **Timeline:** The Phase 4 WDIO suite previously passed 4/4 on macOS/WebKit. After code-review fixes, three cases pass and this case fails. The suite setup now succeeds; the earlier `window not found` setup failure did not recur.
- **Reproduction:** `TAURI_WEBDRIVER_PORT=4457 caffeinate -u -t 180 pnpm exec wdio run wdio.conf.ts --suite phase4-editing --logLevel error`.

## Current Focus

- **Hypothesis:** Confirmed. The current debug binary's hidden WebKit document suspends `requestAnimationFrame`, preventing the deferred composition commit callback from running.
- **Test:** Phase 4 macOS/WebKit reproducer dispatches `compositionstart` plus partial input, clicks outside the draft, then dispatches `compositionend` plus final input.
- **Expecting:** The draft stays mounted through active composition and the exact final string is committed once afterward.
- **Next action:** Resolved; retain the regression test and scoped fix, archive this session, and commit only the files changed by this session.

## Continuation Checkpoint

- **Cycle count:** Cycle 2 investigation completed; 1 fix iteration.
- **Authorized scope:** Diagnose and, if evidence supports it, make a narrow fix only in `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`, and/or `tests/e2e/editing-ink-lifecycle.e2e.ts`; run the relevant unit test and full `phase4-editing` WDIO suite. Leave all pre-existing changes and the four committed review fixes untouched. Do not commit or resolve/archive this session.
- **Checkpoint:** Host reproduction, runtime event timeline, narrow fix, unit verification, and full Phase 4 WDIO verification are complete. Temporary tracing was removed before final verification. Only `src/components/OverlaySurface.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`, and this session document are in scope; all pre-existing WDIO configuration and unrelated changes remain untouched.

## Evidence

- timestamp: 2026-09-12 — WDIO macOS/WebKit: first three Phase 4 cases passed; text commit/cancel/move case failed at the active-composition outside-click assertion.
- timestamp: 2026-09-12 — Native WebDriver setup succeeded and reported a visible overlay display; failure occurred inside the test, not in suite initialization.
- timestamp: 2026-09-12 — Session resumed with the requested Phase 04 scope; checkpoint updated before source inspection.
- timestamp: 2026-09-12 — Cycle 2: temporary E2E-only event tracing was added for compositionstart/compositionend/input/pointerdown/mousedown/blur, trust/composition flags, editor presence/value, and DOM disappearance. Focused WDIO attempt did not reach the test: embedded WebDriver `onPrepare` failed readiness on port 4457 after 90 seconds; no runtime timeline captured.
- timestamp: 2026-09-12 — The failed WDIO startup ran inside the nested `codex exec` workspace sandbox; sandbox logged an operation-not-permitted event. Retry directly from the host to separate sandbox startup restrictions from the existing native-driver configuration.
- timestamp: 2026-09-12 — Pre-existing worktree changes found and left untouched; history confirms the four review fixes are committed (`3087db0`, `7552235`, `cbbd541`, `bc706e0`). No `spawn_agent` tool is exposed in this session.
- timestamp: 2026-09-12 — Resolved the configured debugger profile (model unset/default, effort xhigh); `codex exec` is available as an isolated investigation fallback.
- timestamp: 2026-09-12 — Static trace: outside pointer and textarea/window blur defer or return while composition is active; deferred commit is scheduled on the next animation frame from `compositionend`. The E2E uses synthetic composition events, then a real 180 ms pointer gesture, and has no ordered event trace. Root cause remains inconclusive between WebKit ending composition on focus loss and the synthetic start missing the guard.
- timestamp: 2026-09-12 — Host port 4457 was free. The first direct focused WDIO run used a stale `src-tauri/target/debug/nabrush` binary (12:28) while the frontend `dist` was newer (14:41); that stale app removed the editor during outside-pointer dispatch, before `compositionend`. Rebuilt the current Tauri debug app before interpreting subsequent runs.
- timestamp: 2026-09-12 — With the current app binary, `compositionstart` set the React composition ref; outside mousedown/pointerdown observed it active and deferred the commit; the draft stayed mounted through `compositionend`. Runtime diagnostics showed `document.visibilityState === "hidden"`, `document.hasFocus() === true`, and an independent `requestAnimationFrame` probe did not fire. The deferred commit's rAF was scheduled but never entered, leaving the final composed value uncommitted.
- timestamp: 2026-09-12 — Narrow fix changed only the deferred post-composition callback to `setTimeout(0)`, preserving the existing cancellation and reading the textarea's final value on the next task. Focused macOS/WebKit scenario passed and committed the exact Unicode final value.
- timestamp: 2026-09-12 — Removed temporary app/test tracing. `pnpm exec vitest run src/components/overlay-surface.test.tsx`: 1 file, 26 tests passed. `pnpm exec tauri build --debug --no-bundle`: passed (existing Rust warnings only). Direct host `TAURI_WEBDRIVER_PORT=4457 caffeinate -u -t 180 pnpm exec wdio run wdio.conf.ts --suite phase4-editing --logLevel error`: 4/4 passed.

## Eliminated

- hypothesis: The suite fails because no macOS display/window is available.
  evidence: The rerun reached the Phase 4 tests and passed the first three cases before this assertion failed.

## Resolution

- **root_cause:** In the macOS overlay, WebKit marks the document hidden even while the native overlay is focused and receiving IME events. WebKit suspends `requestAnimationFrame` for that hidden document, so the deferred outside-click commit scheduled at `compositionend` never runs and the final composed draft remains mounted.
- **fix:** Schedule the post-composition deferred commit with `setTimeout(0)` instead of `requestAnimationFrame`; this lets WebKit apply the final input on the next task without relying on a rendered frame. Keep the cancellable handle and commit exactly once.
- **verification:** `pnpm exec vitest run src/components/overlay-surface.test.tsx` (26/26); `pnpm exec tauri build --debug --no-bundle` (passed); focused macOS/WebKit E2E (passed); complete `phase4-editing` WDIO suite (4/4 passed).
- **files_changed:** `src/components/OverlaySurface.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`.
- **prevention:** The Phase 4 macOS/WebKit regression test now verifies the draft survives the outside click during composition and that the final text appears exactly once.

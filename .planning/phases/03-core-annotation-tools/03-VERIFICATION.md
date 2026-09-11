---
phase: 03-core-annotation-tools
verified: 2026-09-11T02:31:36Z
status: gaps_found
score: 9/20 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/ROADMAP.md"
  - ".planning/phases/03-core-annotation-tools/03-01-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-01-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-02-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-02-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-03-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-03-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-04-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-04-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-05-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-05-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-06-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-06-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-07-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-07-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-08-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-08-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-CONTEXT.md"
  - ".planning/phases/03-core-annotation-tools/03-VALIDATION.md"
  - "src-tauri/src/main.rs"
  - "src-tauri/src/overlay_registry.rs"
  - "src/App.tsx"
  - "src/components/AnnotationToolbar.tsx"
  - "src/components/OverlaySurface.tsx"
  - "src/components/annotation-toolbar.test.tsx"
  - "src/components/overlay-surface.test.tsx"
  - "src/state/annotation.test.ts"
  - "src/state/annotation.ts"
  - "src/state/overlay.test.ts"
  - "src/styles.css"
  - "src/types/overlay.ts"
  - "src/types/platform-parity.ts"
  - "tests/e2e/core-annotation-tools.e2e.ts"
  - "tests/e2e/overlay.e2e.ts"
  - "wdio.conf.ts"
covered_digest: "v1:sha256:2efe429a7ae3dc5e0de5e26cff4ccf5743c94978632a0ad363b417f27d183312"
behavior_unverified: 11
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 0/5
  gaps_closed:
    - "Rectangle and ellipse fillColor/fillOpacity controls"
    - "Canonical MVP user-story goal"
    - "Evidence-consistent validation ledger"
  gaps_remaining:
    - "Native Phase 3 pointer-flow evidence on macOS and Windows"
  regressions: []
gaps:
  - truth: "Native Phase 3 smoke evidence proves pointer gestures commit all drawing tools on supported hosts."
    status: partial
    reason: "The macOS WebKit phase3-tools flow still fails before full gesture coverage, and no Windows host is available. The source path is present and wired, but native pointer-up, text, eraser, click-through, and cross-platform behavior are not proven."
    artifacts:
      - path: "tests/e2e/core-annotation-tools.e2e.ts"
        issue: "The suite contains explicit W3C pointer, preview-before-up, scene-count, text, eraser, fill-style, and click-through assertions, but the macOS run does not reach them."
      - path: "wdio.conf.ts"
        issue: "The embedded Tauri WebKit runner is configured, but current macOS window switching reports repeated window-not-found failures."
      - path: ".planning/phases/03-core-annotation-tools/03-VALIDATION.md"
        issue: "macOS is recorded as native FAIL and Windows as NOT RUN; manual rows and approval remain pending."
    missing:
      - "Obtain a passing macOS native run that reaches pointer preview and pointer-up assertions."
      - "Run the equivalent native smoke and manual checks on Windows."
      - "Re-run short-lifecycle and phase1-matrix after the window lifecycle issue is resolved."
advisory: []
behavior_unverified_items:
  - truth: "Presenter can draw pen and highlighter with a realtime transient preview and one valid retained commit."
    test: "Draw pen and highlighter strokes with real pointer input on macOS and Windows."
    expected: "Preview appears while held, retained scene remains unchanged, and pointer-up adds exactly one styled item."
    why_human: "Pure tests and source wiring pass, but phase3-tools does not reach the gesture path."
  - truth: "Pen and highlighter keep independent style snapshots from gesture start."
    test: "Change a tool style between gestures and inspect committed items."
    expected: "Each committed item preserves the style active when its gesture began."
    why_human: "State and renderer helpers are tested, but the native gesture/state transition is not exercised."
  - truth: "Toolbar selection and active-tool property popovers work in the overlay."
    test: "Select all eight tools and change a property on each relevant tool."
    expected: "The active tool and only that tool's style controls update without scene mutation."
    why_human: "Static component assertions pass, but native selection did not complete."
  - truth: "Line and arrow drags preview and commit only at the valid geometry threshold."
    test: "Perform valid, short, cancelled, and outside line/arrow drags."
    expected: "Valid drags commit one item; short or cancelled gestures leave the scene unchanged; arrows have a solid directional head."
    why_human: "Geometry helpers and arrow rendering are tested, but native pointer-up behavior is unproven."
  - truth: "Rectangle and ellipse styles are independently configurable and retained."
    test: "Set distinct fill mode, fill color, and fill opacity values for rectangle and ellipse, then draw both."
    expected: "The controls update the active tool and each committed shape retains its own values."
    why_human: "Controls, state, and unit assertions exist, but native shape commit evidence is unavailable."
  - truth: "Text draft placement, keyboard commit/cancel, and IME composition are safe."
    test: "Place text, type with Shift+Enter, commit with Enter, repeat and cancel with Escape, including composition."
    expected: "Only deliberate non-composing Enter commits non-empty text; newline and Escape affect only the draft."
    why_human: "Pure draft transitions pass, but native focus/IME flow is not reached."
  - truth: "Committed text renders as measured Canvas lines while the editor remains scene-excluded."
    test: "Inspect committed multiline text and the draft editor during a native flow."
    expected: "Committed lines render from retained text data and the editor never becomes a SceneItem."
    why_human: "Renderer tests prove the Canvas path; native editor lifecycle is not reached."
  - truth: "Eraser hover selects the topmost item using padded type-specific hit testing."
    test: "Hover overlapping stroke/shape/text items on macOS and Windows."
    expected: "Only the latest matching item receives the hover target/highlight."
    why_human: "Reverse-order hit testing is unit-tested, but native hover behavior is unverified."
  - truth: "Eraser click removes at most one item and drag/no-op paths preserve unrelated items."
    test: "Click an overlap, click empty space, and drag with the eraser."
    expected: "One click removes one target; empty/drag gestures do not bulk erase or mutate unrelated items."
    why_human: "Rust store and pure hit-test behavior pass, but native eraser behavior is not reached."
  - truth: "The complete phase3-tools smoke suite proves selection, drawing, text, eraser, fill styles, and click-through."
    test: "Run the suite on each supported host."
    expected: "All assertions pass and the suite reports no lifecycle or cleanup failure."
    why_human: "The macOS run exits 1 before gesture assertions and Windows is unavailable."
  - truth: "Pointer cancellation, Escape, focus loss, mode change, short drags, and outside pointer-up leave the scene unchanged."
    test: "Trigger each cancellation path during an active gesture."
    expected: "Transient state clears, capture is released, and no duplicate or partial item is committed."
    why_human: "Source branches and focused helpers exist, but no passing native test exercises these transitions."
decision_coverage:
  honored: 17
  total: 17
  not_honored: []
---

# Phase 3: Core Annotation Tools Verification Report

**Phase Goal:** As a presenter, I want to create basic annotations quickly and smoothly on the overlay scene using pointer or keyboard controls, so that I can explain on-screen content without leaving the active application.
**Verified:** 2026-09-11T02:31:36Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 03-05 through 03-08

## User Flow Coverage

The MVP goal now passes the canonical user-story validator. The flow is implemented in source, but the final user-visible outcome is not certified because the available macOS WebKit runs fail during window lifecycle handling and no Windows host is available.

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Activate overlay | Overlay enters `VisibleInteractive` over the active application | `src-tauri/src/main.rs`, `src/App.tsx`, `tests/e2e/core-annotation-tools.e2e.ts` | ⚠️ present, native unverified |
| Choose a tool and style | Eight tools appear in the shared order; active-tool properties update | `src/components/AnnotationToolbar.tsx`, `src/components/annotation-toolbar.test.tsx`, `src/state/annotation.ts` | ⚠️ present, native unverified |
| Draw annotations | Pointer preview appears and valid pointer-up commits retained scene data | `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`, native suite | ⚠️ present, native unverified |
| Use text, eraser, and click-through controls | Keyboard lifecycle and one-item erase work without collateral scene changes | `src/App.tsx`, `src-tauri/src/overlay_registry.rs`, E2E assertions | ⚠️ present, native unverified |
| Outcome | Presenter can explain on-screen content without leaving the active application | Full source path exists, but macOS native gesture evidence failed and Windows was not run | ✗ NOT CERTIFIED |

## Goal Achievement

The 20 rows below are the deduplicated union of the five roadmap success criteria and all eight PLAN `must_haves.truths` blocks. Repeated plan wording is represented once with the implementation evidence traced below.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Pen/highlighter preview and valid one-item commit | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `OverlaySurface.tsx` snapshots style, keeps transient React state, converts to canonical points, and invokes `commit_scene_item` only after terminal validation; unit tests pass, native gesture evidence is absent. |
| 2 | Independent pen/highlighter color, opacity, and width snapshots | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `DEFAULT_TOOL_STYLES`, immutable style copies, and renderer style use are present; no passing native gesture test verifies the end-to-end transition. |
| 3 | Bottom toolbar, shared order, active-tool popover | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `AnnotationToolbar.tsx`, `App.tsx`, and CSS are wired; component tests prove shape controls and markers, but native selection did not run to completion. |
| 4 | Typed, bounded Rust scene boundary with duplicate/no-op safety | ✓ VERIFIED | `overlay_registry.rs` validates typed payloads, finite/ranged geometry/style, unknown fields, IDs, text/point bounds, duplicate IDs, and no-mutation rejects; `main.rs` registers and broadcasts commands. Cargo check passes and the recorded native-store suite passed. |
| 5 | Canonical desktop points, per-viewport transforms, DPR backing, and scene-excluded chrome | ✓ VERIFIED | `OverlaySurface.tsx` contains canonical/rotated/negative-origin transforms and DPR sizing; `styles.css` and `data-scene-excluded` keep toolbar/editor/badges out of scene data; focused tests pass. |
| 6 | Line/arrow preview, canonical anchor/end, and short-drag threshold | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `MIN_GEOMETRY_DRAG`, transient geometry helpers, terminal guards, and focused tests exist; native pointer-up behavior is not proven. |
| 7 | Solid directional triangular arrowhead | ✓ VERIFIED | `arrowheadPath` and `drawArrowGeometry` are substantive; the renderer test asserts triangle orientation and a single filled head. |
| 8 | Rectangle/ellipse stroke, fill mode, fill color, and fill opacity are independently configurable and retained | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `AnnotationToolbar.tsx` now exposes `fill`, `fillColor`, and `fillOpacity`; `App.tsx` routes patches into `stylesByTool`; state/renderer/native tests pass, but native shape commit evidence is unavailable. |
| 9 | Native geometry/style validation matches the typed tool | ✓ VERIFIED | Rust `validate_geometry` rejects mismatched variants and invalid bounds; inline registry tests cover line/arrow and rectangle/ellipse payloads and mutation safety. |
| 10 | Text draft placement, edit, deliberate commit, cancel, and IME safety | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `textDraftTransition`, focused textarea handling, Enter/Shift+Enter/Escape, composition guard, mode/focus cleanup, and unit tests exist; native focus/IME flow is not reached. |
| 11 | Committed text renders as measured Canvas lines; draft/editor is scene-excluded | ✓ VERIFIED | `drawTextItem` uses measured multiline Canvas rendering, while the draft is a DOM textarea with `data-scene-excluded`; renderer and transition tests pass. |
| 12 | Eraser hover uses padded, type-specific hit testing and reverse scene order | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `hitTestSceneItem` and `findTopmostHit` implement stroke/line/shape/text hit areas and reverse order; unit tests pass, native hover is unverified. |
| 13 | Eraser click removes one ID and preserves unrelated/no-op snapshots | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `erase_scene_item` removes at most one ID and broadcasts the full snapshot; Rust tests prove exact-one/no-op behavior, but native click/drag behavior is unverified. |
| 14 | Phase3-tools smoke covers all tools, styles, text, eraser, and click-through | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `wdio.conf.ts` registers the suite and the E2E file contains the requested assertions; the current macOS run fails before gesture assertions. |
| 15 | Toolbar/property/editor are scene-excluded and click-through passes input | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | CSS pointer boundaries, mode-controlled rendering, and E2E selectors are wired; native lifecycle failure prevented completion. |
| 16 | Validation ledger records task IDs, commands, outcomes, platform boundaries, and manual gaps | ✓ VERIFIED | `03-VALIDATION.md` contains all 16 task rows, exact commands, exit/result fields, macOS/Windows rows, manual matrix, and explicit incomplete sign-off. |
| 17 | macOS and Windows evidence remain separate with no inferred parity | ✓ VERIFIED | Validation rows explicitly mark macOS WebKit failure and Windows `NOT RUN — no Windows host available`; the phase summaries and audit preserve that boundary. |
| 18 | Source audit covers the goal, DRAW-01..06, R-01..09, and D-01..17 | ✓ VERIFIED | The final multi-source audit contains every required source ID and concrete plan references through 03-08; decision coverage reports 17/17 honored. |
| 19 | ROADMAP contains the canonical MVP user story | ✓ VERIFIED | `.planning/ROADMAP.md:120` matches the requested story exactly; `user-story.validate` returned `true`. |
| 20 | Validation status/sign-off agrees with absent native/Windows evidence | ✓ VERIFIED | `03-VALIDATION.md` remains `status: gaps_found`, `nyquist_compliant: false`, `wave_0_complete: false`, with approval pending, matching the observed failures and unavailable host. |

**Score:** 9/20 truths verified (11 present and wired but behavior-unverified). The five roadmap success criteria are all in the behavior-unverified set; no roadmap outcome is certified solely from source presence.

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/types/overlay.ts` | Typed stroke, geometry, text, style, snapshot contracts | ✓ VERIFIED | Substantive discriminated unions and canonical viewport types are consumed by state, renderer, App, and Rust bridge. |
| `src/state/annotation.ts` and tests | Tool styles, geometry thresholds, text transitions, hit testing | ✓ VERIFIED | 266-line implementation plus active unit coverage; imported by App and OverlaySurface. |
| `src/components/OverlaySurface.tsx` and tests | Canvas rendering and pointer/keyboard lifecycle | ✓ VERIFIED (runtime unverified) | 753-line implementation is imported/rendered by App; focused tests pass, native pointer behavior remains unproven. |
| `src/components/AnnotationToolbar.tsx` and tests | Active-tool controls including shape fill controls | ✓ VERIFIED | Imported by App; `fillColor` and `fillOpacity` controls are present and tested. |
| `src/App.tsx` and `src/styles.css` | Scene/native bridge and scene-excluded chrome | ✓ VERIFIED | App hydrates/listens/commits/erases through Tauri; CSS is imported by `main.tsx` and enforces pointer boundaries. |
| `src-tauri/src/overlay_registry.rs` | Typed validation, retained scene, exact-one erase, broadcast | ✓ VERIFIED | Native store and inline tests are substantive; `main.rs` invokes and registers the commands. |
| `src-tauri/src/main.rs` | Command registration and scene synchronization | ✓ VERIFIED | `get_scene_snapshot`, `commit_scene_item`, `erase_scene_item`, and `scene-changed` broadcast are wired. |
| `tests/e2e/core-annotation-tools.e2e.ts` and `wdio.conf.ts` | Native Phase 3 smoke path | ⚠️ PARTIAL | Suite registration and assertions exist; current macOS WebKit lifecycle failure prevents full behavior evidence. |
| `.planning/ROADMAP.md` | Canonical MVP goal | ✓ VERIFIED | Exact goal and translated companion are present. |
| `.planning/phases/03-core-annotation-tools/03-VALIDATION.md` | Auditable evidence ledger | ✓ VERIFIED | Evidence-consistent and intentionally incomplete; it does not claim unsupported native or Windows success. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `OverlaySurface` | `SceneStore` | canonical samples → transient item → `commit_scene_item` → snapshot/event | WIRED; runtime unverified | App and Rust command/event paths are present; native pointer-up is not proven. |
| `TOOL_ORDER` | active styles | toolbar `data-tool` → `activeTool` → `stylesByTool[activeTool]` | WIRED; runtime unverified | Source and component tests pass; native tool selection did not complete. |
| shape controls | committed shape style | controlled inputs → `onUpdateStyle` → gesture style snapshot | WIRED; runtime unverified | The previous missing `fillColor`/`fillOpacity` link now exists in `AnnotationToolbar.tsx` and `App.tsx`; native commit is not reached. |
| text editor | retained text | pointer placement → textarea → keyboard transition → `commit_scene_item` → `fillText` | WIRED; runtime unverified | Source and pure renderer/transition tests pass; native focus/IME is absent. |
| eraser hover/click | one-item native removal | canonical hit-test → `erase_scene_item(id)` → full snapshot broadcast | WIRED; runtime unverified | Reverse hit-test and Rust exact-one removal are tested; native hover/click is absent. |
| Rust validator | retained scene | typed normalization/validation → `SceneStore` mutation | WIRED | Invalid payloads reject without mutation; duplicates are idempotent. |
| ROADMAP goal | MVP eligibility | exact goal → `user-story.validate` | WIRED | Validator returned `true`. |
| validation rows | final sign-off | commands/platform rows → status fields | WIRED | Ledger status matches observed evidence and remains incomplete. |

## Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `App.tsx` / `OverlaySurface.tsx` | `scene` | `get_scene_snapshot` plus `scene-changed` emitted by Rust | Yes | ✓ FLOWING |
| `OverlaySurface.tsx` | `transientSceneItem` | Live pointer samples transformed through `viewportToCanonical` | Yes during gesture | ✓ FLOWING; native unverified |
| `AnnotationToolbar.tsx` / `App.tsx` | `stylesByTool` | User-controlled color/opacity/width/fill/text-size inputs | Yes | ✓ FLOWING |
| `src-tauri/src/overlay_registry.rs` | `SceneSnapshot.items` | Validated Tauri payloads | Yes | ✓ FLOWING |
| `ModeBadge`/toolbar/editor | scene data | UI state only, marked scene-excluded | No scene pollution | ✓ EXCLUDED |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| TypeScript correctness | `pnpm typecheck` | Exit 0 (`tsc --noEmit`) | ✓ PASS |
| Frontend regression suite | `pnpm exec vitest run` | 7 files / 51 tests passed | ✓ PASS |
| Native Rust compile | `cargo check --manifest-path src-tauri/Cargo.toml` | Exit 0; 45 pre-existing unused/dead-code warnings | ✓ PASS |
| Debug desktop build | `pnpm exec tauri build --debug` | Exit 0; built `src-tauri/target/debug/nabrush` | ✓ PASS |
| MVP goal validator | `node ... gsd-tools.cjs query user-story.validate ... --pick valid` | `true` | ✓ PASS |
| Decision coverage | `check.decision-coverage-verify` | 17/17 honored; non-blocking gate | ✓ PASS |
| Phase 3 native gesture flow | `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` | macOS WebKit failed before full gesture coverage; window switching reports `window not found` | ✗ FAIL / gap |
| Short lifecycle | `pnpm exec wdio run wdio.conf.ts --suite short-lifecycle` | Exit 1; macOS WebKit 3 passing / 4 failing; repeated window-not-found during overlay/settings switching; recovery badge not reached | ✗ FAIL / gap |
| Phase 1 matrix | `pnpm exec wdio run wdio.conf.ts --suite phase1-matrix` | Exit 1; same macOS WebKit window lifecycle failures | ✗ FAIL / gap |

## Probe Execution

No conventional or phase-declared `scripts/*/tests/probe-*.sh` probes were found. Probe execution is not applicable.

## Advisory (New Scope, Unevidenced)

None. No new-scope anti-pattern finding required advisory-only treatment during this re-verification.

## Requirements Coverage

Every Phase 03 PLAN declares at least one of the six requested IDs: Plans 03-01, 03-02, 03-03, 03-04, 03-06, 03-07, and 03-08 declare DRAW-01 through DRAW-06; 03-05 declares DRAW-04. All six IDs are defined in `.planning/REQUIREMENTS.md` and map to Phase 3. No Phase 3 requirement is orphaned from plan frontmatter.

| Requirement | Source plans | Status | Evidence |
|---|---|---|---|
| DRAW-01 | 03-01, 03-02, 03-03, 03-04, 03-06, 03-07, 03-08 | NEEDS HUMAN / BLOCKED BY NATIVE EVIDENCE | Pen path, style controls, canonical renderer, native validation, and tests exist; native gesture commit is not proven. |
| DRAW-02 | 03-01, 03-02, 03-03, 03-04, 03-06, 03-07, 03-08 | NEEDS HUMAN / BLOCKED BY NATIVE EVIDENCE | Highlighter style and renderer path exist; native pointer behavior is not proven. |
| DRAW-03 | 03-01, 03-02, 03-03, 03-04, 03-06, 03-07, 03-08 | NEEDS HUMAN / BLOCKED BY NATIVE EVIDENCE | Line/arrow geometry, threshold, arrowhead, validator, and unit tests pass; native drag commit is not proven. |
| DRAW-04 | 03-01, 03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08 | NEEDS HUMAN / BLOCKED BY NATIVE EVIDENCE | Shape controls and independent state are now implemented and tested; native shape commit/fill evidence is not proven. |
| DRAW-05 | 03-01, 03-02, 03-03, 03-04, 03-06, 03-07, 03-08 | NEEDS HUMAN / BLOCKED BY NATIVE EVIDENCE | Draft/IME/Canvas paths are implemented and unit-tested; native focus and keyboard flow are not proven. |
| DRAW-06 | 03-01, 03-02, 03-03, 03-04, 03-06, 03-07, 03-08 | NEEDS HUMAN / BLOCKED BY NATIVE EVIDENCE | Topmost hit testing and exact-one Rust removal are tested; native hover/click/drag behavior is not proven. |

## Test Quality Audit

| Test file | Linked requirements | Active | Skipped | Circular | Assertion level | Verdict |
|---|---|---:|---:|---:|---|---|
| `src/components/overlay-surface.test.tsx` | DRAW-01..06 | 21 | 0 | 0 | Value/behavioral helpers | ✓ PASS |
| `src/state/annotation.test.ts` | DRAW-01..06 | 7 | 0 | 0 | Value/transition/hit-test | ✓ PASS |
| `src/components/annotation-toolbar.test.tsx` | DRAW-04 | 2 | 0 | 0 | Value/DOM marker | ✓ PASS |
| `src-tauri/src/overlay_registry.rs` inline tests | DRAW-01..06 | recorded 42 cargo tests total | 0 | 0 | Value/store invariants | ✓ PASS |
| `tests/e2e/core-annotation-tools.e2e.ts` | DRAW-01..06 | 3 | 0 | 0 | End-to-end behavioral | ⚠️ 2 pass / native flow not reached |

No disabled requirement-linked tests or circular expected-value writers were found. The E2E suite has real behavioral assertions; its failed native lifecycle is not converted into a pass.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| — | — | No implementation TODO/FIXME/XXX/HACK/placeholder, empty implementation, skipped-test, or circular-test pattern found in the Phase 3 implementation/test files | Info | No stub blocker found. |

## Human Verification Required

The phase is blocked before human sign-off can certify the goal. After the native gap is resolved, verify:

1. Run `phase3-tools` on macOS through a WebDriver/provider path that can switch to the overlay; confirm preview-before-up, exactly-one commits, shape fill snapshots, text lifecycle, topmost eraser, and click-through.
2. Run the same native suite and manual matrix on Windows; do not infer Windows behavior from macOS.
3. Re-run `short-lifecycle` and `phase1-matrix`, confirming overlay/settings switching and the recovery badge path.
4. Manually inspect visual thin defaults, IME behavior, eraser hover/click-only behavior, and mixed-DPR/rotation/negative-origin rendering.

## Gaps Summary

The codebase contains a substantive, wired annotation implementation and all six DRAW requirement paths. The previous missing shape fill controls and invalid MVP goal contract are fixed, and the validation ledger now accurately records evidence. The phase goal is still not achieved to the required evidence standard because macOS WebKit native runs fail during window lifecycle switching before gesture assertions, the lifecycle suites also fail, and no Windows host is available. This is a carried-forward blocking gap, not a claim that the source implementation is absent.

---

_Verified: 2026-09-11T02:31:36Z_
_Verifier: the agent (gsd-verifier)_

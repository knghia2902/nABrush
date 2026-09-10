---
phase: 03-core-annotation-tools
verified: 2026-09-10T19:28:21Z
status: gaps_found
score: 0/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/ROADMAP.md"
  - ".planning/STATE.md"
  - ".planning/phases/03-core-annotation-tools/03-01-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-01-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-02-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-02-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-03-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-03-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-04-PLAN.md"
  - ".planning/phases/03-core-annotation-tools/03-04-SUMMARY.md"
  - ".planning/phases/03-core-annotation-tools/03-CONTEXT.md"
  - ".planning/phases/03-core-annotation-tools/03-VALIDATION.md"
  - "src-tauri/src/main.rs"
  - "src-tauri/src/overlay_registry.rs"
  - "src/App.tsx"
  - "src/components/OverlaySurface.tsx"
  - "src/components/overlay-surface.test.tsx"
  - "src/state/annotation.test.ts"
  - "src/state/annotation.ts"
  - "src/state/overlay.test.ts"
  - "src/styles.css"
  - "src/types/overlay.ts"
  - "tests/e2e/core-annotation-tools.e2e.ts"
  - "wdio.conf.ts"
covered_digest: "v1:sha256:e423c4f1beb4ecd025eac37513154a19efad1d415a177a6e34dd02c591ec1bbf"
behavior_unverified: 4
overrides_applied: 0
decision_coverage:
  honored: 17
  total: 17
  not_honored: []
gaps:
  - truth: "User can configure rectangle and ellipse stroke plus fill color and fill opacity independently."
    status: failed
    reason: "The style model and renderer support fillColor/fillOpacity, but the shipped property popover only renders the fill mode selector; no user control writes fillColor or fillOpacity."
    artifacts:
      - path: "src/App.tsx"
        issue: "The rectangle/ellipse branch exposes only data-style-control=fill (lines 108-115); fillColor and fillOpacity controls are absent."
      - path: "src/components/OverlaySurface.tsx"
        issue: "Rendering consumes fillColor/fillOpacity, but that does not make the values configurable from the toolbar."
    missing:
      - "Add rectangle and ellipse fill-color and fill-opacity controls."
      - "Preserve independent per-tool values and add an integration assertion that the controls update the active shape style."
  - truth: "Phase 3 MVP user-flow verification has a valid user-story goal contract."
    status: failed
    reason: "ROADMAP marks Phase 3 mode as mvp, but the canonical user-story validator returns valid=false because the goal is not in the required 'As a ..., I want to ..., so that ... .' form."
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "The Phase 3 goal is an outcome sentence rather than a canonical MVP user story."
    missing:
      - "Run /gsd mvp-phase 3 and set a valid user-story goal before claiming MVP user-flow coverage."
  - truth: "Native Phase 3 smoke evidence proves pointer gestures commit all drawing tools on supported hosts."
    status: partial
    reason: "The macOS embedded-WebKit suite launched and passed tool selection plus click-through checks, but the drawing flow failed at pointer-up with zero retained items. No Windows runner was available, so neither platform has complete native gesture evidence."
    artifacts:
      - path: "tests/e2e/core-annotation-tools.e2e.ts"
        issue: "The named drawing test fails in dragCanvas at line 114; the suite reports 2 passing and 1 failing test."
      - path: ".planning/phases/03-core-annotation-tools/03-VALIDATION.md"
        issue: "The validation matrix records all rows as pending and does not convert the native limitation into completed evidence."
    missing:
      - "Obtain reproducible macOS native pointer-up commit evidence or fix the WebKit input path."
      - "Run the equivalent Phase 3 smoke suite on Windows."
  - truth: "Phase 3 validation artifact records completed, auditable evidence."
    status: partial
    reason: "03-VALIDATION.md remains status=draft, nyquist_compliant=false, wave_0_complete=false, with pending task rows and pending approval despite the phase summaries claiming execution."
    artifacts:
      - path: ".planning/phases/03-core-annotation-tools/03-VALIDATION.md"
        issue: "The artifact is a pending matrix rather than a completed validation record."
    missing:
      - "Update the validation artifact with actual command results and explicit native/manual gaps, or keep the phase visibly incomplete until sign-off."
behavior_unverified_items:
  - truth: "User can draw freehand pen and semi-transparent highlighter strokes with independent color, opacity, and width settings."
    test: "Use real pointer input on macOS and Windows to draw a pen stroke and a highlighter stroke, changing each tool's settings between gestures."
    expected: "A realtime transient preview appears without mutating the retained scene, then pointer-up commits exactly one canonical item with the selected per-tool style."
    why_human: "Source wiring and pure tests exist, but the only native drawing test fails before pointer-up commit; no passing behavioral test exercises this transition."
  - truth: "User can drag to create straight lines and arrows with configurable color, opacity, and width, seeing a preview before committing."
    test: "Drag a line and an arrow in each supported native environment, including an invalid short drag and Escape cancellation."
    expected: "The preview follows the pointer, valid pointer-up commits one item, and short/cancelled gestures leave the retained scene unchanged."
    why_human: "The integration test aborts on the first drawing gesture, while unit tests cover geometry helpers rather than the native pointer lifecycle."
  - truth: "User can place text, edit it, commit it deliberately, or cancel it without changing existing annotations."
    test: "Place text, type with Shift+Enter, commit with Enter, then separately place and cancel with Escape, including IME composition."
    expected: "Enter commits non-empty text, Shift+Enter inserts a newline, Escape removes only the draft, and existing scene items remain unchanged."
    why_human: "Text transition helpers are tested, but the native E2E test never reaches the text steps and IME behavior cannot be proven by source inspection."
  - truth: "User can use a click-only eraser to remove one topmost annotation without affecting unrelated annotations."
    test: "Hover and click overlapping items, then try dragging with the eraser in macOS and Windows."
    expected: "The topmost/latest hit is highlighted, one click removes only that item, and dragging does not erase additional items."
    why_human: "Topmost hit-testing and native command wiring are present, but the native test does not reach its eraser step and platform hit-testing remains unverified."
human_verification:
  - test: "Resolve the Phase 3 MVP goal contract."
    expected: "After /gsd mvp-phase 3, the roadmap goal validates as a canonical user story and user-flow coverage can be assessed against the outcome clause."
    why_human: "The current roadmap goal is not a valid MVP user story, so the centralized validator refuses MVP flow verification."
  - test: "Run the complete native pointer flow on macOS."
    expected: "Pen, highlighter, line, arrow, rectangle, ellipse, text, and eraser commit/cancel behavior matches the locked decisions, including realtime preview, thresholds, canonical coordinates, keyboard lifecycle, and topmost erasing."
    why_human: "The macOS WebKit run currently fails at the first pointer-up commit assertion; browser/unit evidence cannot establish native overlay input delivery."
  - test: "Run the complete Phase 3 smoke suite on Windows."
    expected: "The same drawing, text, eraser, click-through, monitor, and shortcut behaviors work on Windows."
    why_human: "No Windows runner or native evidence was available in this verification."
  - test: "Verify rectangle and ellipse fill controls after implementing them."
    expected: "Fill color and fill opacity are independently configurable per shape tool and are preserved in the committed scene item."
    why_human: "The current UI has no controls for these values, and the visual result requires native rendering inspection."
  - test: "Verify native text/IME, eraser hover, click-only behavior, and mixed-display rendering."
    expected: "Text composition and Enter/Shift+Enter/Escape behavior are correct; eraser hover selects only the topmost item; thin defaults, arrowheads, fills, negative origins, rotation, and mixed DPR render correctly."
    why_human: "These are interaction, platform, and visual behaviors not established by the current automated checks."
---

# Phase 3: Core Annotation Tools Verification Report

**Phase Goal:** Người dùng có thể tạo các chú thích cơ bản nhanh và mượt trên scene overlay bằng chuột hoặc bàn phím điều khiển.
**Verified:** 2026-09-10T19:28:21Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## User Flow Coverage

Not certified. Phase 3 is marked \`mode: mvp\`, but \`gsd_run query user-story.validate --story ... --pick valid\` returned \`false\`. The goal does not match the required canonical MVP user-story form, so the MVP verifier cannot truthfully produce user-flow coverage until the roadmap goal is corrected.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | User can draw freehand pen and semi-transparent highlighter strokes with independent color, opacity, and width settings. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | \`src/types/overlay.ts\`, \`src/state/annotation.ts\`, \`src/components/OverlaySurface.tsx\`, and the native bridge contain the style/state/commit path; \`pnpm test\` passes. No passing native pointer test proves the transition, and the macOS E2E drawing flow fails before the first commit. |
| 2 | User can drag to create straight lines and arrows with configurable color, opacity, and width, seeing a preview before committing. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | \`OverlaySurface.tsx\` contains canonical drag conversion, realtime transient candidates, geometry validation, arrowhead rendering, and pointer-up commit logic; helper tests pass. The native gesture path is not behaviorally proven. |
| 3 | User can drag to create rectangles and ellipses with configurable stroke and fill/opacity settings. | ✗ FAILED | Bounds, fill, opacity, and renderer support exist, but \`App.tsx\` exposes only the fill mode selector. Fill color and fill opacity are not configurable by the user, so DRAW-04 is not achieved. |
| 4 | User can place text, edit it, commit it deliberately, or cancel it without changing existing annotations, with configurable color and text size. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | \`annotation.ts\` implements draft transitions and \`OverlaySurface.tsx\` wires Enter/Shift+Enter/Escape plus draft-only rendering; unit tests and build pass. The native E2E text path is not reached and IME behavior is not proven. |
| 5 | User can use an eraser to remove one selected annotation without affecting unrelated annotations. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | \`findTopmostHit\`, click-only erasing, Rust single-item removal, and whole-snapshot broadcast are wired and tested in pure/native-store tests. The native eraser gesture path is not reached by a passing E2E test. |

**Score:** 0/5 truths verified (4 present and wired but behavior-unverified)

### Decision Coverage

\`check.decision-coverage-verify\` reports 17/17 trackable decisions honored. The implementation contains the locked transient preview, thin defaults, canonical-coordinate, geometry-threshold/cancel, arrowhead/fill, text-keyboard, and topmost single-item eraser decisions. This is a non-blocking consistency result; it does not replace runtime native evidence.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| \`src/types/overlay.ts\` | Typed scene items and per-tool styles | ✓ VERIFIED | Contains stroke, line/arrow, rectangle/ellipse, text, draft, fill, opacity, width, and text-size types; consumed by state, renderer, and Rust bridge. |
| \`src/state/annotation.ts\` | Tool state, draft transitions, geometry/hit-test rules | ✓ VERIFIED | Substantive implementation with thresholds, canonical geometry helpers, text lifecycle, and reverse-order topmost hit testing. |
| \`src/components/OverlaySurface.tsx\` | Realtime overlay rendering and pointer/keyboard lifecycle | ✓ VERIFIED (runtime unverified) | Retained scene plus transient candidate is rendered; pointer capture, canonical conversion, commit/cancel, text draft, and eraser hover/click paths are wired. Native pointer delivery is not proven. |
| \`src/App.tsx\` | Toolbar, per-tool property controls, scene/native bridge | ⚠️ PARTIAL | Toolbar and most controls are wired to React state and native commands, but shape fill color and fill opacity controls are missing. |
| \`src/styles.css\` | Scene-excluded toolbar/popover layering and mode-specific pointer behavior | ✓ VERIFIED (visual/native unverified) | Includes scene-excluded toolbar/editor markers, click-through canvas mode, and interactive toolbar/popover pointer rules. |
| \`src-tauri/src/overlay_registry.rs\` | Typed validation, commit, topmost-safe single erase, tests | ✓ VERIFIED | Validates typed payloads and style/geometry bounds, rejects invalid/duplicate items without mutation, and erases at most one matching ID. |
| \`src-tauri/src/main.rs\` | Registered commit/erase commands and scene broadcasts | ✓ VERIFIED | \`get_scene_snapshot\`, \`commit_scene_item\`, and \`erase_scene_item\` are registered; accepted store results are broadcast as whole snapshots. |
| \`tests/e2e/core-annotation-tools.e2e.ts\` and \`wdio.conf.ts\` | Native smoke coverage for Phase 3 | ⚠️ PARTIAL | Suite is registered and runs on macOS WebKit; selection and click-through pass, but drawing fails at pointer-up and Windows is unavailable. |
| \`.planning/phases/03-core-annotation-tools/03-VALIDATION.md\` | Auditable validation matrix and sign-off | ⚠️ PARTIAL | Matrix includes the expected task/requirement coverage, but remains draft with pending rows, unchecked Wave 0, and pending approval. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| \`OverlaySurface.tsx\` | \`SceneStore\` | canonical pointer samples → transient item → \`commit_scene_item\` invoke | WIRED | Source path is complete through \`App.tsx\` and Rust command registration; native E2E fails to demonstrate the pointer-up event. |
| \`TOOL_ORDER\` / toolbar buttons | active tool styles | React active tool and \`stylesByTool\` state | WIRED | All eight tools are rendered in the canonical order; per-tool opacity/width/color persistence test passes. |
| Rust commands | retained scene consumers | typed store result → \`broadcast_scene\` → frontend snapshot | WIRED | Main command handlers broadcast accepted and no-op results; Rust tests pass. |
| shape property popover | \`fillColor\` / \`fillOpacity\` | expected control events → style update | NOT_WIRED | No controls or event handlers exist for these two fields in \`App.tsx\`; this is the DRAW-04 blocker. |
| text pointer/draft | committed text renderer | place → draft update → Enter commit → scene \`fillText\` | WIRED (runtime unverified) | All source connections exist and pure transition tests pass; native text flow was not reached. |
| eraser hover/click | topmost scene item removal | \`findTopmostHit\` → \`erase_scene_item\` → snapshot broadcast | WIRED (runtime unverified) | Reverse-order hit testing and single-item store removal are implemented/tested; native gesture evidence is missing. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| \`OverlaySurface.tsx\` | \`scene\` | \`get_scene_snapshot\` plus \`scene-changed\` events from Rust \`SceneStore\` | Yes | ✓ FLOWING |
| \`OverlaySurface.tsx\` | \`transientSceneItem\` | Live pointer samples transformed into canonical coordinates | Yes during a gesture | ✓ FLOWING (native runtime unverified) |
| \`App.tsx\` | \`stylesByTool\` | React state and toolbar controls | Yes for color/opacity/width/fill mode/text size | ⚠️ STATIC for shape fill color/opacity: no user input path |
| \`overlay_registry.rs\` | retained \`SceneSnapshot\` | Tauri invoke payload → typed parse/validation/store | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Frontend unit/component behavior | \`pnpm test\` | 6 files passed, 46 tests passed, 0 failed | ✓ PASS |
| Rust native store/validation behavior | \`cargo test --manifest-path src-tauri/Cargo.toml\` | 42 tests passed, 0 failed; 18 existing dead-code warnings | ✓ PASS |
| TypeScript and production build | \`pnpm build\` | \`tsc --noEmit && vite build\` completed; 30 modules transformed | ✓ PASS |
| Native Phase 3 E2E | \`pnpm exec wdio run wdio.conf.ts --suite phase3-tools\` | macOS WebKit: 2 passing, 1 failing; drawing test fails at \`dragCanvas\` pointer-up assertion (\`core-annotation-tools.e2e.ts:114\`); cleanup also warns \`sessionId is required\` | ✗ FAIL |
| Plan validation traceability | Phase 3 validation command checking test file, DRAW-01..06, suite, and coverage audit | All required references found | ✓ PASS |
| Conventional probes | \`find scripts -path '*/tests/probe-*.sh' -type f\` | No probes discovered | ? SKIP — no probe declared/found |

### Probe Execution

No conventional or phase-declared probe scripts were found. Probe execution is therefore not applicable; the native WebDriver suite above was run independently and is the relevant executable smoke check.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| DRAW-01 | 03-01, 03-04 | Configurable freehand pen stroke | NEEDS HUMAN | Style/state/renderer/bridge and unit tests pass; native pointer commit is unverified. |
| DRAW-02 | 03-01, 03-04 | Semi-transparent highlighter stroke | NEEDS HUMAN | Highlighter default opacity/width and renderer path exist; native gesture behavior is unverified. |
| DRAW-03 | 03-02, 03-04 | Configurable lines and arrows | NEEDS HUMAN | Geometry/arrowhead/preview/commit source paths and tests exist; native pointer behavior is unverified. |
| DRAW-04 | 03-02, 03-04 | Configurable rectangle/ellipse stroke and fill/opacity | BLOCKED | Shape model and renderer support fill settings, but the toolbar does not expose fill color or fill opacity controls. |
| DRAW-05 | 03-03, 03-04 | Text create/edit/commit/cancel with color and size | NEEDS HUMAN | Draft transitions, keyboard wiring, text sizing, and unit tests exist; native text and IME behavior is unverified. |
| DRAW-06 | 03-03, 03-04 | Erase one selected annotation only | NEEDS HUMAN | Topmost hit-test and single-item Rust removal are tested; native hover/click-only behavior is unverified. |

All six IDs are mapped to Phase 3 in \`REQUIREMENTS.md\`; no additional Phase 3 requirement was found orphaned from the plans.

### Test Quality Audit

The frontend and Rust tests contain no skipped or todo tests and no circular test candidates were found. \`annotation.test.ts\` has 7 active tests, \`overlay-surface.test.tsx\` has 19 active tests, and the Rust registry has 11 inline tests. These give useful pure-function/store evidence but do not substitute for native pointer/IME/rendering behavior. The E2E suite has 3 active tests with 2 passing and 1 failing; it does not assert the missing shape fill-color/fill-opacity controls.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No unreferenced \`TBD\`, \`FIXME\`, \`XXX\`, \`TODO\`, \`HACK\`, placeholder, or console-only implementation markers in phase key files | ℹ️ Info | No debt-marker or obvious stub blocker found. |
| \`src-tauri\` build output | — | 18 pre-existing dead-code warnings | ℹ️ Info | Warnings concern unused native/controller seams; they do not show a Phase 3 stub or failure. |

### Human Verification Required

The following remain required even after the code blockers are addressed:

1. Correct the MVP goal with \`/gsd mvp-phase 3\`, then validate the user-story outcome.
2. On macOS, reproduce the full native pointer flow and resolve the current first-draw pointer-up failure.
3. On Windows, run the equivalent native smoke suite; no Windows evidence exists in this verification.
4. Verify realtime previews, canonical coordinates, short-drag/Escape/outside cancellation, thin defaults, arrowhead/fill visuals, text IME/Enter/Shift+Enter/Escape, eraser hover/topmost/click-only behavior, and mixed-display/DPR/rotation cases.
5. After adding the missing shape controls, verify independent fill color and fill opacity for rectangles and ellipses.

### Gaps Summary

The retained scene architecture, typed native store, tool state, renderer helpers, and pure automated tests are substantially implemented. The phase goal is not yet certifiable: DRAW-04 is observably incomplete because fill color and fill opacity are not user-configurable; MVP-mode verification cannot run against the current non-user-story goal; and the only available native run fails at the first drawing pointer-up commit while Windows is unavailable. The pending validation matrix also does not constitute completed evidence.

Next action: add and test the missing shape fill controls, correct the MVP goal contract, then rerun native Phase 3 verification on macOS and Windows and update the validation matrix with the actual results.

---

_Verified: 2026-09-10T19:28:21Z_
_Verifier: the agent (gsd-verifier)_

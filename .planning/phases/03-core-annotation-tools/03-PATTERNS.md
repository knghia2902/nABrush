# Phase 3: Core Annotation Tools - Pattern Map

**Mapped:** 2026-09-11  
**Files analyzed:** 9 planned surfaces (7 existing files modified, 2 new test/state surfaces)  
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/OverlaySurface.tsx` | component/renderer | request-response + streaming preview | `src/components/OverlaySurface.tsx` | exact extension |
| `src/App.tsx` | component/orchestrator | request-response + event-driven | `src/App.tsx` | exact extension |
| `src/components/AnnotationToolbar.tsx` | component/chrome | request-response + UI event | `src/App.tsx`, `src/styles.css` | extraction/role match |
| `src/types/overlay.ts` | model/wire types | transform/request-response | `src/types/overlay.ts` | exact extension |
| `src/state/annotation.ts` | store/reducer/geometry utility | transform/event-driven | `src/state/overlay.ts` | role-match |
| `src/state/annotation.test.ts` | test | transform | `src/state/overlay.test.ts` | role-match |
| `src/components/annotation-toolbar.test.tsx` | test | UI event/static markup | `src/components/mode-badge.test.tsx` | role-match |
| `src/components/overlay-surface.test.tsx` | test | streaming preview/transform | `src/components/overlay-surface.test.tsx` | exact extension |
| `src/styles.css` | UI chrome CSS | request-response/UI event | `src/styles.css` | exact extension |
| `src-tauri/src/overlay_registry.rs` | service/model store | CRUD + event-driven broadcast | same file | exact extension |
| `src-tauri/src/main.rs` | command/controller | request-response IPC | same file | exact extension |
| `wdio.conf.ts` / `tests/e2e/*.e2e.ts` | E2E config/test | request-response/native event | `wdio.conf.ts`, `tests/e2e/overlay.e2e.ts` | exact extension |

## Pattern Assignments

### `src/components/OverlaySurface.tsx` (component, streaming preview)

**Analog:** itself, tracked at `src/components/OverlaySurface.tsx`.

* Imports/types: lines 1-6; use React hooks, `ReactPointerEvent`, and shared types from `../types/overlay`.
* Canonical transform: lines 45-72 (`canonicalToViewport`, `viewportToCanonical`, `normalizePointerPath`); pointer coordinates must enter canonical space once, preserving negative origins, rotations, clamping, and DPR.
* Preview lifecycle: lines 166-193; `setPointerCapture`, samples in a ref, `setTransientStroke` on every move, clear on end/cancel, then invoke commit only for a valid path. Extend this state machine for shape/text/eraser; do not mutate retained `scene` during move.
* Rendering: lines 96-117 and 134-150; clear canvas, render committed plus transient items, apply `context.setTransform(dpr, 0, 0, dpr, 0, 0)`, and keep style in item data instead of current hard-coded lines 146-149.
* Props/interaction: lines 120-125 and 195-208; preserve `mode` gating and `canvasPointerEvents` (92-94). Toolbar/popover must be sibling chrome, not scene content.

### `src/App.tsx` (orchestrator, request-response/event-driven)

**Analog:** `src/App.tsx`, tracked, lines 28-65 and 69-89.

Hydrate with `invoke<SceneSnapshot>("get_scene_snapshot")` (33-36), register typed `listen` handlers and cleanup (37-56), and commit with `invoke("commit_scene_item", { item })`, applying the returned whole snapshot (59-65). Add tool/style/draft callbacks and an erase command while retaining snapshot events as the synchronization source. Keep chrome conditional on `VisibleInteractive` and outside `OverlaySurface` scene items (79-87).

### `src/components/AnnotationToolbar.tsx` (component/chrome, request-response/UI event)

**Analog:** extract the inline toolbar from `src/App.tsx` (the `src/App.tsx` assignment above, lines 28-89) and preserve the chrome layering from `src/styles.css` lines 16-26. Keep `TOOL_ORDER`, `aria-pressed`, `data-tool`, `data-property-popover`, `data-style-control`, and `data-scene-excluded` selectors stable while routing controlled style patches through the existing `onUpdateStyle` callback. The component remains a sibling of the canvas, not a scene renderer.

### `src/types/overlay.ts` (model, request-response/transform)

**Analog:** `src/types/overlay.ts`, tracked, lines 14-31.

Extend the current `StrokePoint`/`StrokeSceneItem` discriminated model (14-26) with typed tool, geometry, style, and text payloads while preserving canonical coordinates and wire-compatible `SceneSnapshot`/`SceneEventPayload`. Follow the runtime validation style already used for viewport inputs in `isDisplayViewport` and `normalizeDisplayViewport` (80-115): reject unknown/malformed data at the boundary, not only via TypeScript.

### `src/state/annotation.ts` and `src/state/annotation.test.ts` (state/utility + tests, transform)

**Analogs:** `src/state/overlay.ts` lines 53-78 and `src/state/overlay.test.ts` lines 11-49.

Use pure reducer/helper functions and immutable returns like `transition` and `addSceneItem`; preserve idempotent scene behavior and never clear retained items for mode changes. Put deterministic geometry, threshold, style-per-tool, text draft keyboard handling, and reverse-order hit testing here. Tests should use Vitest `describe/it/expect` and fixtures in the existing test style; cover topmost item, single erase, `Enter` vs `Shift+Enter`, `Escape`, IME guard, and canonical transforms.

### `src/components/annotation-toolbar.test.tsx` (test, UI event/static markup)

**Analog:** `src/components/mode-badge.test.tsx` for `react-dom/server`/`renderToStaticMarkup` assertions, with the component contract taken from `src/components/AnnotationToolbar.tsx` and the state isolation assertions following the `src/state/annotation.test.ts` role-match above. Assert selectors and controlled values through markup; do not add a UI testing dependency or duplicate the toolbar state store.

### `src/components/overlay-surface.test.tsx` (test, streaming/transform)

**Analog:** itself, tracked, lines 23-139. Extend the existing helper seam: canonical round trips and DPR assertions (50-86), transient isolation (89-106), and call-order/context spy assertions (108-138). Add preview/commit tests for each geometry, style/compositing, threshold, text draft, and eraser hover; keep tests pure and avoid a second canvas implementation.

### `src-tauri/src/overlay_registry.rs` (service/store, CRUD/event-driven)

**Analog:** itself, tracked, lines 39-113, 277-283, and 422-430.

`SceneStore::snapshot` clones the canonical whole scene (76-78); `commit_scene_item` validates, deduplicates IDs, pushes once, and returns a snapshot (80-88). Replace the loose `Value` allowlist validator (93-113) with typed serde-discriminated payload validation and range checks. Add atomic erase-by-ID, removing at most one item and returning the snapshot; preserve `broadcast_scene` global `scene-changed` emission (277-283). Extend native tests from the existing invalid/duplicate invariant (422-430) for malformed geometry/style, erase no-op, and exactly-one removal.

### `src-tauri/src/main.rs` (command/controller, request-response IPC)

**Analog:** itself, tracked, lines 209-254 and 262-281.

Follow `get_scene_snapshot` (209-212) and `commit_scene_item` (236-253): lock managed state, map errors to `String`, broadcast after mutation, return `SceneSnapshot`. Register any `erase_scene_item` command in `generate_handler!` (262-281). Do not create per-display scene mutations.

### `src/styles.css` (chrome, UI event)

**Analog:** itself, tracked, lines 3-15. `main` is `pointer-events: none` (3); interactive descendants explicitly opt in (5, 11-15), while badges remain scene-excluded. Copy this layering for bottom toolbar/property popover, add focus-visible treatment, and ensure chrome is absent/disabled outside drawing mode and never rendered into Canvas/export.

### `wdio.conf.ts` and `tests/e2e/*.e2e.ts` (E2E, native request-response/event)

**Analogs:** `wdio.conf.ts` lines 7-45 and tracked `tests/e2e/overlay.e2e.ts`, `tests/e2e/display-topology.e2e.ts`.

Keep the embedded Tauri provider, resolved debug binary, `windowLabel: "overlay"`, serial execution, and 120-second Mocha timeout (24-45). Add a phase-3 suite entry following the existing `short-lifecycle`/`phase*-matrix` suites (10-14). Smoke tool selection, draw/preview, text commit/cancel, eraser single-click, and click-through safety on real macOS/Windows hosts.

## Shared Patterns

- **Canonical retained scene:** one `SceneSnapshot` is the source of truth; every display transforms it locally. Toolbar, transient gesture, and text draft stay outside the retained scene.
- **Preview then commit:** pointer move updates transient React state; valid pointer-up/Enter sends exactly one native mutation. `Esc`, cancel, mode change, and focus loss clear transient state without changing scene.
- **Native validation boundary:** frontend validation improves UX; Rust validates discriminator, IDs, finite/ranged geometry/style/text, deduplicates IDs, mutates once, and broadcasts the whole snapshot.
- **Pointer/click-through layering:** preserve `main { pointer-events: none }`, explicit interactive descendants, and native `set_ignore_cursor_events` behavior from `src-tauri/src/overlay_registry.rs:329-333`.
- **Tool vocabulary:** use `TOOL_ORDER` in tracked `src/types/platform-parity.ts:13-23`; do not introduce platform-specific tool names.

## No Analog Found

None. `src/state/annotation.ts` and its E2E scenario are new responsibilities, but their pure reducer and WebdriverIO structure have close tracked role analogs above.

## Metadata

**Analog search scope:** `src/`, `src/components/`, `src/state/`, `src/types/`, `src-tauri/src/`, `tests/e2e/`, root test/config files.  
**Tracked-source gate:** all named analog paths verified with `git ls-files`; no `.gsd/capabilities` mirror paths used.  
**Pattern extraction date:** 2026-09-11

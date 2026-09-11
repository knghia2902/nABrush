# Phase 4: Editing & Ink Lifecycle - Pattern Map

**Mapped:** 2026-09-12  
**Files analyzed:** 10 existing files; Phase 4 modifies these surfaces and adds no required new source file  
**Analogs found:** 10 / 10 (8 strong role/data-flow matches; 2 test seams)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/types/overlay.ts` | model/types | transform/request-response | `src/types/overlay.ts` | exact extension |
| `src/state/annotation.ts` | utility/state | transform | `src/state/annotation.ts` | exact extension |
| `src-tauri/src/overlay_registry.rs` | service/model (`SceneStore`) | CRUD + timed lifecycle | `src-tauri/src/overlay_registry.rs` | exact for CRUD; no history/fade analog |
| `src-tauri/src/main.rs` | command/controller | request-response + event broadcast | `src-tauri/src/main.rs` | exact extension |
| `src/App.tsx` | controller/orchestrator | request-response + pub-sub | `src/App.tsx` | exact extension |
| `src/components/OverlaySurface.tsx` | component/renderer | streaming pointer input + transform | `src/components/OverlaySurface.tsx` | exact extension |
| `src/components/AnnotationToolbar.tsx` | component/control | request-response/UI state | `src/components/AnnotationToolbar.tsx` | exact extension |
| `src/state/annotation.test.ts` | unit test | transform/state | `src/state/annotation.test.ts` | exact |
| `src/components/overlay-surface.test.tsx` | unit test | rendering/transform | `src/components/overlay-surface.test.tsx` | exact |
| `tests/e2e/core-annotation-tools.e2e.ts` | E2E test | desktop event-driven/request-response | `tests/e2e/core-annotation-tools.e2e.ts` | exact |

## Pattern Assignments

### `src/types/overlay.ts` (model/types, transform/request-response)

**Analog:** `src/types/overlay.ts` (tracked)

**Immutable typed wire models** (lines 23-31, 51-57, 86-111): use readonly discriminated unions for scene items and snapshot the complete style on each item. Extend the item model with lifecycle and creation-time fade metadata rather than a parallel untyped map; preserve `SceneItem` union and `SceneSnapshot` wire shape.

```typescript
export type AnnotationStyle = Readonly<{ color: string; opacity: number; width: number; fill: AnnotationFill; fillColor: string; fillOpacity: number; textSize: number }>;
export type SceneItem = StrokeSceneItem | ShapeSceneItem | TextSceneItem;
export type SceneSnapshot = { sceneId: string; items: readonly SceneItem[] };
```

Keep canonical coordinates and viewport data separate (lines 43-49, 112-125). New lifecycle fields must serialize compatibly through Tauri and remain display-independent.

### `src/state/annotation.ts` (state utility, transform)

**Analog:** `src/state/annotation.ts` (tracked)

**Per-tool session state and immutable transitions** (lines 47-52, 80-103): extend `AnnotationState` with lifecycle/duration only once, and update via functional `setState`; do not replace `stylesByTool` with a second style store.

```typescript
return {
  ...state,
  stylesByTool: { ...state.stylesByTool, [tool]: { ...state.stylesByTool[tool], ...patch } },
};
```

**Text state machine** (lines 108-129, 169-177): keep Enter/Shift+Enter/Esc and outside-click behavior expressed as explicit transitions; construct a typed committed item from the draft and pass it through the same commit path.

### `src-tauri/src/overlay_registry.rs` (service/model, CRUD + timed lifecycle)

**Analog:** `SceneStore` in `src-tauri/src/overlay_registry.rs` (tracked), lines 169-268 and 522-571.

**Canonical snapshot mutation** (lines 213-234): every accepted mutation changes one shared `items` vector and returns a complete `SceneSnapshot`; duplicate IDs are idempotent. History should store pre/post scene snapshots or commands around this mutation boundary, with a new mutation clearing redo.

```rust
pub fn snapshot(&self) -> SceneSnapshot {
    SceneSnapshot { scene_id: self.scene_id.clone(), items: self.items.clone() }
}
// normalize, validate, reject duplicate, push, then return self.snapshot()
```

**Existing CRUD semantics** (lines 237-267): copy validation-first behavior for move, erase, and clear. Clear currently mutates in place and returns no snapshot, so Phase 4 should change/augment it to participate in the same history and broadcast pipeline.

**Validation** (lines 270-291, 522-571): continue normalizing JSON into typed `SceneItem`, rejecting malformed IDs, points, geometry, styles, and text before retention. Lifecycle/duration validation belongs beside these typed checks; clamp or reject invalid finite durations consistently.

**No analog:** independent expiry timers, fade opacity, and undo/redo stacks do not exist. Keep timers owned by the canonical scene service/native boundary so hidden/click-through overlays cannot pause them, and expiry must remove without creating history.

### `src-tauri/src/main.rs` (command/controller, request-response + event broadcast)

**Analog:** `commit_scene_item`, `erase_scene_item`, and `move_text_scene_item`, lines 236-295 (tracked).

**Command pattern:** lock `Mutex<SceneStore>`, call the validated store method, map the domain error to `String`, then lock `OverlayRegistry` and call `broadcast_scene` before returning the snapshot.

```rust
let snapshot = state.lock().expect("scene mutex poisoned")
    .commit_scene_item(item).map_err(|error| error.to_string())?;
registry.lock().expect("registry mutex poisoned")
    .broadcast_scene(&app, &snapshot).map_err(|error| error.to_string())?;
Ok(snapshot)
```

Register undo/redo/clear/lifecycle commands in the `generate_handler!` list (lines 305-326). Preserve whole-snapshot ordering and `scene-changed` delivery; do not create per-window history.

### `src/App.tsx` (controller/orchestrator, request-response + pub-sub)

**Analog:** `src/App.tsx` (tracked), lines 30-74 and 76-114.

**Hydration/subscription:** initialize scene through `get_scene_snapshot`, subscribe to `scene-changed`, and update `sceneId` plus `scene` together (lines 37-66). New history/lifecycle state should be coordinated here, while canonical scene truth remains native.

**Mutation wrapper:** `commitSceneItem`, `moveTextItem`, and `eraseSceneItem` invoke native commands and apply the returned snapshot (lines 68-105). Reuse this single snapshot application path for undo, redo, clear, and expiry events; avoid optimistic local scene mutations.

**Props wiring:** pass canonical scene and callbacks to `OverlaySurface`, and tool state/style callbacks to `AnnotationToolbar` (lines 118-155). Add disabled flags and lifecycle controls at this boundary.

### `src/components/OverlaySurface.tsx` (component/renderer, streaming + transform)

**Analog:** `src/components/OverlaySurface.tsx` (tracked), lines 462-489, 557-582, 711-755, and 873-907.

**Retained plus transient render:** `drawScene` clears once, substitutes a transient item by ID, appends it only when absent from retained scene, then draws typed items (lines 462-489). Lifecycle opacity must be applied during this draw pass without duplicating items or mutating the canonical scene.

```typescript
const renderedScene = transientSceneItem
  ? scene.map((item) => item.id === transientSceneItem.id ? transientSceneItem : item)
  : scene;
```

**Redraw/timer seam:** the `redraw` callback and resize cleanup (lines 557-582) are the correct place to schedule animation-frame redraws for fading items. Timer/expiry cleanup must be effect-owned and cleaned up; do not tie expiry to pointer events, overlay visibility, or click-through mode.

**Commit semantics:** pointer-up validates terminal ownership/bounds, cancels transient state, then commits one typed item (lines 711-755). Preserve one-operation-per-gesture and route movement through `onMoveTextItem`.

**Text interaction:** keyboard commit/newline/cancel logic (lines 873-907) and draft focus effect (lines 596-603) are the analog for outside-click commit. Guard the outside click so committing one draft does not place a second draft in the same event.

### `src/components/AnnotationToolbar.tsx` (component/control, request-response/UI state)

**Analog:** `src/components/AnnotationToolbar.tsx` (tracked), lines 104-172 and 272-380.

**Draggable/clamped chrome:** use `toolbarRef`, measured dimensions, `setClampedPosition`, resize/blur cleanup, and `data-scene-excluded` (lines 112-172, 276-355). New controls must remain scene-excluded, compact, tooltip-labeled, and disabled from underlying overlay input when appropriate.

```typescript
const next = clampToolbarPosition(viewport.width, viewport.height, measured.width, measured.height,
  TOOLBAR_MARGIN, candidate.left, candidate.top);
positionRef.current = next;
setPosition((current) => current.left === next.left && current.top === next.top ? current : next);
```

**Existing control pattern:** tool buttons use `aria-pressed`, `title`, `data-tool`, and callback props (lines 315-345); property inputs are controlled and convert values at the boundary (lines 357-380). Use the same pattern for always-visible Undo/Redo, lifecycle toggle, and validated duration presets/input.

### `src/state/annotation.test.ts` (unit test, transform/state)

**Analog:** `src/state/annotation.test.ts` (tracked), lines 47-147.

Follow the `describe`/`it` structure and pure-function assertions. Existing tests verify immutable per-tool style updates by identity and value (lines 60-113) and text draft transitions including composing Enter, newline, commit, and cancel (lines 122-147). Add focused tests for lifecycle defaults, duration validation, snapshot-at-create semantics, and any pure history reducer; assert old state is unchanged.

### `src/components/overlay-surface.test.tsx` (unit test, rendering/transform)

**Analog:** `src/components/overlay-surface.test.tsx` (tracked), lines 32-145 and 269-332.

Use deterministic helper tests for canonical/viewport conversion, transient-vs-retained separation, and gesture terminal behavior. Rendering tests use a minimal mocked canvas context and assert call order (lines 241-332). Add opacity-at-time and expired-item filtering tests without requiring a real timer where possible; use fake timers only for the scheduling seam.

### `tests/e2e/core-annotation-tools.e2e.ts` (E2E test, desktop event-driven/request-response)

**Analog:** `tests/e2e/core-annotation-tools.e2e.ts` (tracked), lines 13-47, 174-240, and 242-257.

Use `invokeNativeCommand`, DOM scene attributes, `waitUntil`, and generated overlay interaction setup. The existing `dragCanvas` helper proves realtime transient state, exact one-item commit, and cleanup (lines 179-240); extend it for undo/redo/clear and lifecycle controls. Prefer native `get_scene_snapshot` plus DOM count/IDs to verify the shared canonical scene, and include platform labels in failures as existing helpers do.

## Shared Patterns

### Canonical scene and synchronization

**Sources:** `src-tauri/src/overlay_registry.rs:213-234`, `src-tauri/src/main.rs:236-295`, `src/App.tsx:37-73`  
**Apply to:** all scene mutation/history/lifecycle files.

One native `SceneStore` owns the scene. Mutations validate, return a whole snapshot, broadcast `scene-changed`, and React applies that snapshot to every overlay. Undo/redo, clear, and expiry must follow the same route and never maintain display-local stacks.

### Validation and error boundary

**Sources:** `src-tauri/src/overlay_registry.rs:270-291`, `522-571`; `src-tauri/src/main.rs:243-252`  
**Apply to:** native store and every new Tauri command.

Normalize into typed models, validate finite coordinates/style/lifecycle values, return `RegistryError`, and map it at the command boundary. Preserve idempotence for duplicate IDs.

### Scene-excluded interaction chrome

**Sources:** `src/components/AnnotationToolbar.tsx:276-355`; `src/components/OverlaySurface.tsx:930-975`  
**Apply to:** toolbar, duration popover, text editor, and history/lifecycle controls.

Use `data-scene-excluded="true"`, controlled callbacks, pointer-event conventions, clamping, and accessible labels/titles so controls do not become annotations or intercept the underlying app in click-through mode.

### Immutable style snapshots

**Sources:** `src/state/annotation.ts:80-103`; `src/components/OverlaySurface.tsx:133-145`; `src/types/overlay.ts:23-31`  
**Apply to:** lifecycle creation and all annotation tools.

Read the active tool's style at gesture start, copy it into the new item, and never retroactively update committed items when the toolbar changes. Lifecycle mode and selected duration follow the same snapshot-at-creation rule.

## No Analog Found

| Capability | Reason | Planner guidance |
|---|---|---|
| Undo/redo command history | No history stack or command abstraction exists in tracked code. | Extend `SceneStore` around snapshot mutations; record create/move/erase/clear entries, clear redo on new mutation, and exclude expiry from history. |
| Independent vanishing timers/fade curve | Existing renderer has redraw and cleanup effects but no time-based item lifecycle. | Use canonical creation-time metadata plus independently scheduled expiry; render opacity from elapsed time and broadcast removal without adding history. |

## Metadata

**Analog search scope:** `src/`, `src-tauri/src/`, and `tests/e2e/`  
**Files scanned:** 10 strong tracked analogs plus requirements/context references  
**Tracked-source gate:** every analog named above returned non-empty `git ls-files -- <path>`; no `.gsd/` mirror paths are used.  
**Pattern extraction date:** 2026-09-12

# Phase 2: Display Topology & Platform Parity - Pattern Map

**Mapped:** 2026-09-10  
**Files analyzed:** 12 planned/new or modified files  
**Analogs found:** 12 / 12 (all analogs are git-tracked source files)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/src/display.rs` | model/utility | transform + batch snapshot | `src-tauri/src/tracer.rs`, `src-tauri/src/controller.rs` | role-match |
| `src-tauri/src/overlay_registry.rs` | service/manager | CRUD + event-driven | `src-tauri/src/controller.rs`, `src-tauri/src/platform/mod.rs` | role-match |
| `src-tauri/src/controller.rs` | controller | request-response + event-driven | existing file | exact evolution |
| `src-tauri/src/platform/mod.rs` | middleware/adapter | event-driven | existing file | exact evolution |
| `src-tauri/src/platform/macos.rs` | platform adapter | event-driven | existing file | exact evolution |
| `src-tauri/src/platform/windows.rs` | platform adapter | event-driven | existing file | exact evolution |
| `src-tauri/src/tracer.rs` | utility/test seam | transform + batch | existing file | exact evolution |
| `src-tauri/src/errors.rs` | error service | request-response + event-driven | existing file | exact evolution |
| `src-tauri/src/lib.rs` / `src-tauri/src/main.rs` | config/wiring | request-response | existing files | role-match |
| `src-tauri/tauri.conf.json` | config | request-response | existing file | exact evolution |
| `src/components/OverlaySurface.tsx` and `src/state/overlay.ts` | component/store | transform + rendering | existing files | exact evolution |
| `tests/e2e/display-topology.e2e.ts` | test | event-driven + request-response | `tests/e2e/overlay.e2e.ts` | exact role match |

## Pattern Assignments

### `src-tauri/src/display.rs` (model/utility, transform + batch snapshot)

**Analog:** `src-tauri/src/tracer.rs` (tracked; lines 1-45) and `src-tauri/src/controller.rs` (tracked; lines 27-43, 180-209).

Use serde-friendly, copyable geometry values and inline deterministic Rust tests. The current geometry preserves negative origins and the per-display scale factor:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct DisplayGeometry {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub scale_factor: f64,
}
```

`tracer.rs:22-45` shows the project test style: a small fixture function, focused `#[test]` cases, and direct equality assertions for negative coordinates and scale. Extend that style for physical-to-logical conversion, rotation, stable identity, snapshot diff, and coalescing. Validate finite, positive dimensions and scale before native calls (RESEARCH.md V5 guidance).

### `src-tauri/src/overlay_registry.rs` (service/manager, CRUD + event-driven)

**Analogs:** `src-tauri/src/controller.rs:63-176` and `src-tauri/src/platform/mod.rs:9-39`.

The registry should own monitor-id to window/adapter entries. Copy the controller's mutex-protected state boundary and transition semantics, but iterate all entries. Existing state access and mode application are:

```rust
pub fn snapshot(&self) -> LifecycleSnapshot {
    self.state.lock().expect("controller mutex poisoned").snapshot.clone()
}

pub fn apply_to_adapter<A: PlatformWindowAdapter>(&self, adapter: &mut A, mode: OverlayMode) {
    match mode {
        OverlayMode::Hidden => adapter.hide(),
        OverlayMode::VisibleInteractive => adapter.show_interactive(),
        OverlayMode::VisibleClickThrough => {
            adapter.show_interactive();
            adapter.set_click_through(true);
        }
    }
}
```

The registry reconciliation action should be: create only new identities, call `set_position`/`set_size` in place for changed descriptors, hide/destroy removed identities, and leave the shared scene untouched. Apply mode/hit-test changes to every entry before emitting one shared mode event. Keep creation outside synchronous display callbacks; RESEARCH.md explicitly calls for async/separate-thread Tauri window creation to avoid WebView2 deadlocks.

Use the adapter test fake from `platform/mod.rs:17-39` as the seam. Its test (`platform/mod.rs:41-54`) proves state transitions without native windows and is the template for add/remove/update/broadcast tests.

### `src-tauri/src/controller.rs` (controller, request-response + event-driven)

**Analog:** same file, `controller.rs:63-176` and tests `180-209`.

Preserve `OverlayMode`, `ShortcutAction`, reducer idempotence, and dispatch routing. Replace the single `primary_monitor()` path (`68-81`) with snapshot/reconcile through the registry. Current native placement conversion is the exact seed for per-monitor conversion:

```rust
let scale = monitor.scale_factor();
let position = monitor.position().to_logical::<f64>(scale);
let size = monitor.size().to_logical::<f64>(scale);
window.set_position(Position::Logical(position))?;
window.set_size(Size::Logical(size))?;
```

Keep hidden-state guards (`91-104`, `127-132`), broadcast `overlay-mode-changed`, and preserve `scene_ref` through every mode transition. Tests should retain current assertions from `180-209` while replacing the one-surface assumption with all-viewport invariants.

### `src-tauri/src/platform/mod.rs`, `macos.rs`, `windows.rs` (platform adapters, event-driven)

**Analog:** existing tracked files.

Keep native lifecycle and hit-testing behind `PlatformWindowAdapter`; extend the trait only for monitor snapshot/event registration and geometry updates. The cross-platform contract is intentionally small:

```rust
pub trait PlatformWindowAdapter {
    fn show_interactive(&mut self);
    fn hide(&mut self);
    fn set_click_through(&mut self, enabled: bool);
    fn pointer_intent(&self) -> PointerIntent;
    fn retry(&mut self);
}
```

macOS policy in `macos.rs:8-11` maps `click_through` to `NSWindow.ignoresMouseEvents`; Windows policy in `windows.rs:8-10` maps it to `HTTRANSPARENT`. Preserve these explicit enums/tests (`macos.rs:13-20`, `windows.rs:12-19`) and add platform-specific topology/full-screen behavior behind `cfg` gates. macOS should reread screens after the AppKit screen-parameter notification; Windows should enumerate virtual-screen monitors after display/DPI messages. Translate native failures into the existing typed error boundary.

### `src-tauri/src/tracer.rs` (utility/test seam, transform + batch)

**Analog:** same file, `tracer.rs:8-45`.

Continue recording a lifecycle snapshot as a pure observable seam. Extend the snapshot or add focused topology fixtures for negative origins, scale, rotation, retained scene identity, and no scene deletion on monitor removal. Preserve the existing idempotent hide test and direct assertions rather than duplicating controller logic.

### `src-tauri/src/errors.rs` (error service, request-response + event-driven)

**Analog:** same file, `errors.rs:5-39, 41-87, 114-142`.

Add topology/full-screen/permission error codes and constructors while preserving typed actions and event publication:

```rust
pub fn publish<R: Runtime>(&self, app: &AppHandle<R>, state: Option<ErrorState>) -> tauri::Result<()> {
    self.set(state.clone());
    app.emit("error-state-changed", state)?;
    Ok(())
}
```

Errors must preserve the scene/controller state, expose `Retry` when a fresh snapshot can recover, and optionally expose `OpenSystemSettings`. Copy the existing fail-closed/retry tests (`114-142`) for actionable topology failures.

### `src-tauri/src/lib.rs` / `src-tauri/src/main.rs` (wiring, request-response)

**Analog:** `main.rs:15-23, 103-135`.

Register the new manager as managed state alongside `AppController` and `ErrorStore`, wire topology notifications during setup, and add only debug/test commands needed by the E2E fixture. Preserve `tauri::generate_handler!`, global shortcut plugin setup, and the existing `CloseRequested` hide behavior. Do not make synchronous dynamic-window creation inside a native event callback.

### `src-tauri/tauri.conf.json` (config, request-response)

**Analog:** existing tracked config referenced by CONTEXT.md.

Retain the existing transparent overlay/webview capability and permission model; extend runtime wiring for dynamic per-display labels rather than treating one static `overlay` label as the registry. Keep capability scopes explicit. The registry should own generated labels and pass viewport metadata to each webview.

### `src/components/OverlaySurface.tsx` and `src/state/overlay.ts` (component/store, transform + rendering)

**Analogs:** `OverlaySurface.tsx:8-47, 56-133` and `types/overlay.ts:1-54`.

Preserve pure scene helpers and the DPR backing contract:

```tsx
const dpr = window.devicePixelRatio || 1;
const width = Math.max(1, Math.round(rect.width * dpr));
const height = Math.max(1, Math.round(rect.height * dpr));
if (canvas.width !== width) canvas.width = width;
if (canvas.height !== height) canvas.height = height;
context.setTransform(dpr, 0, 0, dpr, 0, 0);
```

Add a typed viewport descriptor `{ origin, logicalSize, scaleFactor, rotation }` and convert canonical desktop points to local logical coordinates before drawing. Keep `canvasPointerEvents` as renderer feedback only; native adapters remain the hit-testing authority. Keep scene items retained through display removal/re-addition and keep pointer-up commit behavior (live preview is Phase 3). Extend `overlay.test.ts`/`overlay-surface.test.tsx` with transform and shared-scene assertions using the existing Vitest style.

Mode and error UI should reuse `ModeBadge.tsx:8-28` and `ErrorBadge.tsx:11-27`: per-display badges are scene-excluded, mode visibility is timeout-driven, and errors subscribe to `error-state-changed` then invoke typed retry/settings commands.

### `tests/e2e/display-topology.e2e.ts` (test, event-driven + request-response)

**Analog:** `tests/e2e/overlay.e2e.ts:1-102, 104-184` (tracked).

Copy its helper structure: platform modifier selection, `waitUntil` with explicit timeout messages, browser-side Tauri invoke bridge, native window listing with fallback, and deterministic debug fixtures when host shortcuts/focus are unavailable. Existing native command helper:

```ts
async function dispatchNativeAction(action: "Show" | "Hide" | "ToggleClickThrough" | "Esc") {
  return browser.execute(async (nextAction) => {
    const invoke = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Function } }).__TAURI_INTERNALS__?.invoke;
    if (!invoke) throw new Error("Tauri invoke bridge is unavailable");
    return invoke("test_dispatch_action", { action: nextAction });
  }, action);
}
```

Add topology fixture commands/assertions for one/two/many viewport labels, shared scene IDs, per-display badges, negative-origin/DPI/rotation descriptors, remove/re-add retention, coalesced updates, and scoped errors. Register a `phase2-matrix` suite in the existing WebdriverIO config; native full-screen claims still require macOS/Windows hardware evidence.

## Shared Patterns

### State and mode transitions

**Sources:** `src-tauri/src/controller.rs:114-176`, `src/types/overlay.ts:27-54`  
**Apply to:** controller, registry, renderer/store, E2E.

Mode transitions are explicit finite states, idempotent, and must preserve the shared scene. The registry broadcasts one transition to every viewport; the renderer uses the mode only for local pointer behavior and badge display.

### Native boundary and input policy

**Sources:** `src-tauri/src/platform/mod.rs:9-39`, `src-tauri/src/platform/macos.rs:5-20`, `src-tauri/src/platform/windows.rs:5-19`  
**Apply to:** registry and both platform adapters.

All native monitor/window operations stay behind the adapter seam. CSS `pointer-events` can mirror feedback but cannot implement cross-display pass-through. Apply click-through globally and test pointer intent without native display dependencies.

### Error publication and recovery

**Source:** `src-tauri/src/errors.rs:26-39, 51-87`  
**Apply to:** topology manager, controller, ErrorBadge, E2E.

Store typed error state, emit `error-state-changed`, keep scene/controller state alive, and provide only valid recovery actions. UI subscribes with `listen`, invokes typed commands, and leaves healthy viewports usable.

### Rendering and scene retention

**Sources:** `src/components/OverlaySurface.tsx:21-47, 62-92`, `src/state/overlay.ts:27-54`  
**Apply to:** viewport component/store and registry payloads.

Scene ownership is independent from viewport/window ownership. Use canonical logical desktop coordinates, a per-display transform, and DPR only for the canvas backing store. Removing a monitor removes its viewport entry, never its scene records.

### Test style

**Sources:** inline Rust tests in `controller.rs:180-209`, `platform/mod.rs:41-54`, `tracer.rs:22-45`; Vitest tests in `src/state/overlay.test.ts:11-50` and `src/components/overlay-surface.test.tsx:11-53`; E2E helpers in `tests/e2e/overlay.e2e.ts:1-102`.

Prefer pure fixtures and direct equality assertions for topology math/diffs, then use E2E only for native window labels, mode broadcast, and platform matrix behavior.

## No Analog Found

None. `display.rs`, `overlay_registry.rs`, and `display-topology.e2e.ts` are new roles, but they have strong role/data-flow analogs in the tracked controller, adapter, tracer, renderer, and lifecycle E2E files above.

## Metadata

**Analog search scope:** `src-tauri/src/**/*.rs`, `src/**/*.ts`, `src/**/*.tsx`, `tests/e2e/**/*.ts`, `src-tauri/tauri.conf.json`  
**Files scanned:** 17 tracked source/test/config files  
**Pattern extraction date:** 2026-09-10

# Phase 2 Context: Display Topology & Platform Parity

## Domain

Phase 2 makes the overlay a display-topology-aware native surface on macOS and Windows. Showing the overlay must cover every active display, preserve one shared annotation scene across the virtual desktop, and reconcile display additions, removals, geometry changes, DPI changes, and rotation while the app is running. The phase also defines the supported full-screen boundary and the error behavior when the compositor or permissions prevent an overlay from being presented.

This phase does not add drawing tools, editing/history, capture, export, or the live stroke-preview behavior requested during discussion. Live stroke preview (drawing while the pointer is moving, then committing on pointer-up) is deferred to Phase 3.

## Decisions

### Overlay topology

- **D2-01 — Show all active displays:** `Show` creates or activates one native overlay for every active display.
- **D2-02 — One shared scene:** all display overlays render the same semantic scene in canonical desktop coordinates. Display windows are viewports over that scene, not independent drawing documents.
- **D2-03 — Global click-through:** click-through changes apply to every display overlay together so the interaction mode is consistent across the desktop.
- **D2-04 — Per-display status:** the current mode badge is visible on every display overlay.

### Coordinates and scaling

- **D2-05 — Canonical coordinates:** use OS logical desktop coordinates, with each display retaining its own scale factor.
- **D2-06 — Preserve logical placement:** when a display size or DPI changes, preserve its logical desktop position; let the physical pixel backing size follow the new scale.
- **D2-07 — Preserve native origins:** retain negative display origins and other native virtual-desktop coordinates instead of translating them to an artificial positive-only space.
- **D2-08 — DPR-backed canvas:** canvas dimensions are logical CSS viewport dimensions with a device-pixel-ratio-scaled backing canvas for crisp rendering.

### Topology changes

- **D2-09 — Live reconciliation:** display additions and removals create or destroy the corresponding overlay while the app is running; no restart is required.
- **D2-10 — Retain removed-display annotations:** annotations remain in the shared scene when a display disappears and become visible again if that display returns.
- **D2-11 — Update in place:** resize, DPI, and rotation changes reuse the existing native window and update its geometry and canvas transforms in place.
- **D2-12 — Coalesce bursts:** topology events are briefly coalesced and the final display snapshot is applied once, avoiding intermediate window churn.

### Full-screen and failure boundary

- **D2-13 — Supported full-screen scope:** borderless and other native OS-supported full-screen modes are supported; exclusive full-screen is limited and documented.
- **D2-14 — Reconcile when allowed:** keep overlays active and reconcile z-order and geometry whenever the platform permits it. Do not promise behavior where the compositor blocks an overlay.
- **D2-15 — Actionable failure:** protected, permission-denied, or compositor-blocked surfaces leave the app and shared scene alive and surface a clear actionable error.
- **D2-16 — Explicit support matrix:** documentation separates Supported, Limited, and Unsupported behavior by operating system and full-screen type.

## Implementation latitude

The implementation may choose the exact debounce interval, monitor identity matching algorithm, OS-specific display event APIs, error wording, and badge placement. Those choices must preserve the decisions above and be covered by tests or verification evidence where practical.

## Existing code context

- `src-tauri/src/controller.rs` currently stores one `DisplayGeometry`, obtains only `primary_monitor()`, and drives one lifecycle snapshot. Phase 2 should evolve this boundary into a monitor registry/overlay manager without breaking the existing state-machine semantics.
- `src-tauri/src/platform/mod.rs` exposes the current test seam (`PlatformWindowAdapter` with show/hide/click-through/pointer-intent/retry). Platform adapters in `macos.rs` and `windows.rs` currently contain hit-test policy; native monitor/window lifecycle APIs should stay behind this seam.
- `src-tauri/src/tracer.rs` already records geometry and has coverage for negative origins and scale values; extend it or add focused topology tests rather than duplicating coordinate logic.
- `src-tauri/tauri.conf.json` defines one overlay webview label today. Dynamic per-display windows and their event/command wiring will need to extend this configuration/runtime boundary.
- `src/components/OverlaySurface.tsx` uses local viewport coordinates and a DPR-scaled backing canvas. It currently commits pointer paths on pointer-up; live stroke preview is intentionally deferred to Phase 3.
- The research architecture calls for one native overlay per physical display, one shared semantic scene in canonical desktop coordinates, per-display viewport transforms, an explicit native state machine, and coalesced topology events.

## Canonical references

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/STACK.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/SUMMARY.md`
- `src-tauri/src/controller.rs`
- `src-tauri/src/tracer.rs`
- `src-tauri/src/platform/mod.rs`
- `src-tauri/tauri.conf.json`

## Deferred ideas

- **Phase 3 — live stroke preview:** render the active pointer path in a transient preview layer during pointer movement and commit it to the retained scene on pointer-up.

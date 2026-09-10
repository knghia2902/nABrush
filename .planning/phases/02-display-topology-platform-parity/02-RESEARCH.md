# Phase 2: Display Topology & Platform Parity - Research

**Researched:** 2026-09-10
**Domain:** Tauri 2 native multi-display overlays, mixed-DPI coordinate transforms, macOS AppKit display topology, Windows virtual-screen/DPI APIs
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Overlay topology

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

### the agent's Discretion

The implementation may choose the exact debounce interval, monitor identity matching algorithm, OS-specific display event APIs, error wording, and badge placement. Those choices must preserve the decisions above and be covered by tests or verification evidence where practical.

### Deferred Ideas (OUT OF SCOPE)

- **Phase 3 — live stroke preview:** render the active pointer path in a transient preview layer during pointer movement and commit it to the retained scene on pointer-up.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISP-01 | User sees an overlay on every connected display with correct placement for each display's resolution, orientation, scale factor, and negative desktop coordinates. | Per-monitor Tauri window registry, physical-to-logical transforms, native origins, DPR-backed canvas, and topology matrix. |
| DISP-02 | User can draw while a supported application is in full-screen or borderless full-screen mode on macOS and Windows. | AppKit collection behavior, Windows topmost/layered behavior, explicit Supported/Limited/Unsupported matrix, and hardware validation. |
| DISP-03 | User can add, remove, rotate, or reconfigure a display while nABrush is running and have overlays reconcile without restarting the app. | macOS screen parameter notification, Windows display/DPI messages, snapshot diff/coalescing, in-place geometry updates, and remove/recreate tests. |
| DISP-04 | User can use the same shortcut concepts, tool order, mode feedback, and export behavior on macOS and Windows. | Shared controller state and broadcast mode transitions; per-display badge; existing global shortcut path; cross-platform E2E and manual matrix. |
</phase_requirements>

## Summary

Phase 2 should turn the current single `overlay` window into a native per-display overlay manager. The manager should obtain a fresh display snapshot, normalize each monitor into canonical OS logical desktop coordinates while retaining its scale factor, and diff that snapshot against a registry of overlay windows. Each active display gets one viewport over the same scene, and show/hide/click-through transitions are broadcast to every viewport. This follows the locked D2-01 through D2-12 decisions. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-30]

Tauri 2 already provides the monitor and window primitives needed for this boundary: `available_monitors`, monitor physical position/size/work area/scale factor, logical conversion helpers, `WebviewWindowBuilder`, and `WindowEvent::ScaleFactorChanged`/`Moved`/`Resized`. [CITED: https://docs.rs/tauri/latest/tauri/struct.AppHandle.html] [CITED: https://docs.rs/tauri/latest/tauri/window/struct.Monitor.html] [CITED: https://docs.rs/tauri/latest/tauri/enum.WindowEvent.html] [CITED: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html] The platform adapters should remain the seam for AppKit collection behavior, Windows layered-window hit testing, native display notifications, and error translation. [VERIFIED: src-tauri/src/platform/mod.rs:1-39] [VERIFIED: src-tauri/src/platform/macos.rs:1-20] [VERIFIED: src-tauri/src/platform/windows.rs:1-19]

The high-risk behavior is compositor and topology timing. macOS says `NSScreen.screens` must be reread because screens can be added, removed, or reconfigured, and posts `NSApplication.didChangeScreenParametersNotification` after display configuration changes. [CITED: https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc] [CITED: https://developer.apple.com/documentation/AppKit/NSApplication/didChangeScreenParametersNotification] Windows provides virtual-screen monitor rectangles through `EnumDisplayMonitors`/`GetMonitorInfo`, negative coordinates are valid, and per-monitor-DPI top-level windows receive `WM_DPICHANGED`. [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors] [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-monitorinfo] [CITED: https://learn.microsoft.com/en-us/windows/win32/hidpi/wm-dpichanged] Exclusive full-screen cannot be treated as guaranteed by a topmost flag; the support matrix and manual hardware checks must make this boundary visible to users. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] [ASSUMED]

**Primary recommendation:** Implement a Rust `DisplayTopology` snapshot/diff and `OverlayRegistry` behind `AppController`, create or destroy per-monitor Tauri windows asynchronously, update existing windows in place, and test pure transforms/reconciliation separately from native full-screen and monitor hardware behavior. [ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Enumerate displays and receive topology changes | API / Backend | Browser / Client | Native display APIs and Tauri monitor enumeration are the source of truth; the renderer only consumes viewport metadata. [ASSUMED] |
| Create, place, resize, show, hide, and destroy overlay windows | Frontend Server (SSR) | API / Backend | The Rust/Tauri process owns native windows and must apply identical transitions to every display. [VERIFIED: .planning/research/ARCHITECTURE.md:1-36] |
| Canonical desktop coordinate model and monitor transforms | API / Backend | Browser / Client | The shared scene must survive topology changes; each canvas maps canonical points to its own viewport. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-23] |
| Canvas backing size and viewport redraw | Browser / Client | API / Backend | CSS viewport dimensions stay logical while the renderer sizes the backing canvas from DPR. [VERIFIED: src/components/OverlaySurface.tsx:62-78] |
| Click-through and native hit testing | API / Backend | Browser / Client | Web CSS pointer events are insufficient for cross-display pass-through; native adapters already expose the policy seam. [VERIFIED: src-tauri/src/platform/mod.rs:6-14] [VERIFIED: src-tauri/src/platform/macos.rs:1-10] [VERIFIED: src-tauri/src/platform/windows.rs:1-10] |
| Full-screen support matrix and actionable errors | API / Backend | Browser / Client | Platform capabilities and failures must be translated into a user-visible status while preserving the scene. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] |

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `tauri` Rust crate | `2.11.5` | App handle, monitor enumeration, native window lifecycle, events | The repository pins `tauri = { version = "2.11.5", features = ["image-png", "macos-private-api", "tray-icon"] }`, and the crates registry returned `tauri = "2.11.5"` during research. [VERIFIED: src-tauri/Cargo.toml:16-20] [VERIFIED: crates registry] |
| `@tauri-apps/api` | `2.11.1` | Typed frontend window/event calls when the renderer needs viewport metadata | The repository pins `"@tauri-apps/api": "2.11.1"`, and npm returned `2.11.1` as the current version on 2026-09-10. [VERIFIED: package.json:21-25] [VERIFIED: npm registry] |
| Rust toolchain | `1.98.1` | Native controller and target-specific adapters | The project pins `channel = "1.98.1"` and targets `aarch64-apple-darwin` and `x86_64-pc-windows-msvc`. [VERIFIED: rust-toolchain.toml:1-5] |
| AppKit `NSScreen` / `NSApplication` | platform SDK | macOS display snapshots and screen-change notifications | AppKit provides all-screen enumeration, frame/backing conversion, and a display-configuration notification. [CITED: https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc] [CITED: https://developer.apple.com/documentation/AppKit/NSApplication/didChangeScreenParametersNotification] |
| Win32 User32 / DPI APIs | platform SDK | Windows virtual desktop rectangles, display change, and per-monitor DPI | Microsoft documents `EnumDisplayMonitors`, virtual-screen `MONITORINFO`, `WM_DISPLAYCHANGE`, and `WM_DPICHANGED`. [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors] [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-monitorinfo] [CITED: https://learn.microsoft.com/en-us/windows/win32/gdi/wm-displaychange] [CITED: https://learn.microsoft.com/en-us/windows/win32/hidpi/wm-dpichanged] |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| `windows` Rust crate | `0.62.2` | Windows target-gated Win32/WinRT bindings | The repository already pins `windows = { version = "0.62.2", features = ["Graphics_Capture", "Win32_Foundation", "Win32_Graphics_Gdi", "Win32_UI_WindowsAndMessaging"] }`; Cargo returned `windows = "0.62.2"` and legitimacy was `OK`. [VERIFIED: src-tauri/Cargo.toml:23-29] [VERIFIED: crates registry] |
| `@wdio/tauri-service` + WebdriverIO | `@wdio/tauri-service 1.4.0`; WebdriverIO 9.x | Cross-platform desktop E2E | Reuse the existing embedded provider for lifecycle assertions; Tauri documents this provider for macOS and Windows. The package legitimacy gate marked `@wdio/tauri-service` `SUS` because it is very new, so do not add or upgrade it in this phase without a human checkpoint. [VERIFIED: package.json:27-39] [CITED: https://v2.tauri.app/develop/tests/webdriver/] [WARNING: flagged as suspicious — too-new; verify before using.] |
| Vitest | `5.0.0` | Pure TypeScript coordinate and reconciliation tests | Extend the existing unit suite; npm returned `5.0.0`, while legitimacy marked it `SUS` due to the very recent publish date. Reuse the pinned dependency and do not install a replacement. [VERIFIED: package.json:27-39] [WARNING: flagged as suspicious — too-new; verify before using.] |
| `cargo test` | pinned Rust toolchain | Native unit tests for snapshot diff, transform math, adapter state, and error preservation | Use for deterministic tests that do not need a native display server. [VERIFIED: rust-toolchain.toml:1-5] |
| Canvas 2D | WebView platform API | Per-display rendering of the shared scene | Keep the existing DPR-backed canvas contract and pass each viewport’s transform/geometry to the renderer. [VERIFIED: src/components/OverlaySurface.tsx:62-78] |

**Installation:** No new external package is required for this phase. Reuse the existing Tauri, `windows`, Vitest, and WebdriverIO dependencies. [VERIFIED: src-tauri/Cargo.toml:16-29] [VERIFIED: package.json:21-39]

**Version verification:** `cargo search tauri --limit 1` returned `2.11.5`; `cargo search windows --limit 1` returned `0.62.2`; `npm view @tauri-apps/api version` returned `2.11.1`; `npm view @tauri-apps/cli version` returned `2.11.4`; `npm view @wdio/tauri-service version` returned `1.4.0`; and `npm view vitest version` returned `5.0.0` on 2026-09-10. [VERIFIED: crates registry] [VERIFIED: npm registry]

## Package Legitimacy Audit

No package installation is planned for Phase 2; this audit records the existing packages used by the test and native seams. [VERIFIED: src-tauri/Cargo.toml:16-29] [VERIFIED: package.json:21-39]

The age, weekly-download, source-repository, and verdict values in the table below come from the package-legitimacy checks run on 2026-09-10. [VERIFIED: package-legitimacy check, 2026-09-10]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `tauri` | crates | 6+ years | 891,525/week | github.com/tauri-apps/tauri | OK | Approved; already pinned |
| `windows` | crates | 7+ years | 5,728,881/week | github.com/microsoft/windows-rs | OK | Approved; already pinned |
| `@tauri-apps/api` | npm | 5+ years | 2,175,676/week | github.com/tauri-apps/tauri | OK | Approved; already pinned |
| `@tauri-apps/cli` | npm | 5+ years | 2,022,527/week | github.com/tauri-apps/tauri | OK | Approved; already pinned |
| `@wdio/tauri-service` | npm | under 1 year | 37,901/week | github.com/webdriverio/desktop-mobile | SUS | Existing dependency; planner adds no install; verify before any upgrade |
| `vitest` | npm | 4+ years | 92,675,784/week | github.com/vitest-dev/vitest | SUS | Existing dependency; planner adds no install; verify before any upgrade |

The package legitimacy command returned `OK` for `tauri`, `windows`, `@tauri-apps/api`, and `@tauri-apps/cli`, and `SUS` with reason `too-new` for the existing `@wdio/tauri-service` and `vitest` entries. [VERIFIED: package-legitimacy check, 2026-09-10]

## Architecture Patterns

### System Architecture Diagram

The data flow below is the recommended implementation of the locked topology and shared-scene boundary. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-30] [VERIFIED: .planning/research/ARCHITECTURE.md:1-36]

```text
Tray / global shortcut / display notification
                    |
                    v
          AppController (Rust state machine)
                    |
                    v
        DisplayTopology::snapshot()  <---- platform adapter
                    |
             debounce/coalesce
                    |
                    v
     diff(snapshot, OverlayRegistry<monitor-id, window>)
          /                 |                  \
         /                  |                   \
   create window       update in place       hide/destroy
         \                  |                   /
          +-----------------+------------------+
                            |
                            v
             shared SceneStore (canonical logical desktop)
                            |
             per-window viewport transform + DPR canvas
                            |
             one badge + one renderer on every display
```

### Pattern 1: Snapshot, stable identity, and diff

**What:** Read all monitor descriptors after each topology signal, derive a stable identity from native display ID/name when available, and compare descriptors by identity plus geometry/scale/rotation. [CITED: https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc] [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors] [ASSUMED]

**When to use:** On initial setup, every `Show`, and every native display/DPI notification. Never retain an `NSScreen.screens` array as the source of truth because Apple documents that the array can change dynamically. [CITED: https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc]

**Implementation shape:** Keep `OverlayRegistry` keyed by a stable monitor identity. For an unchanged identity, call `set_position` and `set_size` only when the normalized descriptor changed; for a new identity, create one window; for a removed identity, hide/destroy its window while leaving the shared scene untouched. [ASSUMED]

### Pattern 2: Per-monitor physical-to-logical conversion

**What:** Treat native monitor position and size as physical values, divide through that monitor’s own scale factor before passing logical position/size to a Tauri window, and retain negative origins. Tauri documents that monitor positions and sizes are physical while window creation coordinates are logical. [CITED: https://v2.tauri.app/reference/javascript/api/namespacewindow/] [CITED: https://docs.rs/tauri/latest/tauri/window/struct.Monitor.html]

**When to use:** Initial placement, DPI changes, rotation, resize, and pointer-to-scene conversion. Do not use one process-wide scale factor for all displays. [CITED: https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-reference] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:20-23]

**Example:**

```rust
// Pattern sketch; exact monitor identity and error type are implementation-defined.
let monitors = app.available_monitors()?;
for monitor in monitors {
    let scale = monitor.scale_factor();
    let origin = monitor.position().to_logical::<f64>(scale);
    let size = monitor.size().to_logical::<f64>(scale);
    registry.reconcile_viewport(monitor_key(&monitor), origin, size, scale)?;
}
```

The method names and physical/logical relationship in this sketch are documented by Tauri; `monitor_key` and `reconcile_viewport` are phase-owned abstractions. [CITED: https://docs.rs/tauri/latest/tauri/struct.AppHandle.html] [CITED: https://docs.rs/tauri/latest/tauri/window/struct.Monitor.html] [ASSUMED]

### Pattern 3: Window registry with asynchronous creation

**What:** Create dynamic Tauri `WebviewWindow`s using unique labels, register their event handlers, then apply geometry and state. Tauri’s `WebviewWindowBuilder::new`/`build` is the supported creation path, and its docs explicitly warn that synchronous creation from Windows commands or event handlers can deadlock WebView2; use an async command or a separate thread. [CITED: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html]

**When to use:** Every add-display reconciliation. Keep creation and destruction outside the synchronous native display callback; coalescing should schedule one reconciliation task on the app/main-thread boundary. [CITED: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html] [ASSUMED]

**Anti-pattern:** Rebuild every overlay on every `WM_DISPLAYCHANGE` or screen notification. That loses webview state, creates z-order churn, and increases the chance of a WebView2 deadlock. Update existing windows in place and recreate only identities that appeared or disappeared. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:27-30] [ASSUMED]

### Pattern 4: Native topology events trigger coalesced snapshot reconciliation

**macOS:** Observe `NSApplication.didChangeScreenParametersNotification` on the AppKit main actor, then reread `NSScreen.screens`. The notification has no useful per-screen payload, so the follow-up snapshot is authoritative. [CITED: https://developer.apple.com/documentation/AppKit/NSApplication/didChangeScreenParametersNotification] [CITED: https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc]

**Windows:** Handle `WM_DISPLAYCHANGE` for resolution/display-mode changes and `WM_DPICHANGED` for per-monitor scale changes, then enumerate all monitors again. `WM_DPICHANGED` supplies a suggested rectangle for a per-monitor-DPI-aware top-level window; the manager should still apply the canonical descriptor to preserve D2-06. [CITED: https://learn.microsoft.com/en-us/windows/win32/gdi/wm-displaychange] [CITED: https://learn.microsoft.com/en-us/windows/win32/hidpi/wm-dpichanged] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:20-23]

**Coalescing:** Schedule a short debounce after the first event, discard intermediate snapshots, and apply the last fresh snapshot once. The exact interval is discretionary and must be covered by deterministic fake-clock tests. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:39-41] [ASSUMED]

### Pattern 5: Shared canonical scene and local viewport transform

Each display webview receives the same semantic scene reference and a viewport descriptor `{ origin, logicalSize, scaleFactor, rotation }`; a renderer converts canonical scene points into viewport-local logical coordinates, then uses DPR only for the backing canvas. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-23] [VERIFIED: src/components/OverlaySurface.tsx:62-78] [ASSUMED]

When a display disappears, remove its viewport and keep scene records in the shared store; when the same display returns, the viewport renders those records again. Do not clip or delete scene data as a side effect of registry removal. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:27-30] [ASSUMED]

### Pattern 6: Apply mode transitions to the registry as one transaction

`VisibleInteractive`, `VisibleClickThrough`, and `Hidden` are the current discrete mode values in the source of truth. [VERIFIED: src-tauri/src/controller.rs:10-15] [VERIFIED: src-tauri/src/mode_schema.rs:1-35] A manager transition should iterate all registered windows, apply native visibility/focus/hit testing, and emit one shared mode event with a per-display render payload. This preserves the current `AppController` reducer semantics while expanding the one-window operation to every viewport. [VERIFIED: src-tauri/src/controller.rs:114-176] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-16] [ASSUMED]

### Pattern 7: Full-screen support matrix with capability-aware failure

On macOS, `NSWindow.CollectionBehavior.fullScreenAuxiliary` places a window in the same Space as a full-screen window, and `canJoinAllApplications` is documented for floating/system overlays that can join other apps’ full-screen Spaces when eligible. [CITED: https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary] [CITED: https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications] On Windows, layered windows can be alpha-composed, topmost windows precede non-topmost windows, and `WS_EX_TRANSPARENT` passes mouse events to windows underneath. [CITED: https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features]

These APIs define capabilities, not a guarantee over every compositor mode. Keep the app and scene alive when a viewport cannot be shown, publish a typed actionable error, and document the result as Supported, Limited, or Unsupported according to the locked matrix. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] [ASSUMED]

### Recommended Project Structure

```text
src-tauri/src/
├── controller.rs       # lifecycle state and broadcast transitions
├── display.rs          # platform-neutral monitor descriptor, identity, diff, debounce
├── overlay_registry.rs # per-display label/window registry and shared scene routing
└── platform/
    ├── mod.rs          # adapter traits and test fakes
    ├── macos.rs        # AppKit screen notifications, collection behavior, hit testing
    └── windows.rs      # User32 monitor/DPI events, styles, hit testing
src/
├── components/OverlaySurface.tsx # viewport-local DPR canvas and per-display badge
└── state/overlay.ts              # shared renderer-facing mode/scene state
tests/e2e/
└── display-topology.e2e.ts       # platform matrix hooks and registry assertions
```

This mapping follows the existing controller/platform split and the context’s instruction to keep native monitor/window lifecycle behind the adapter. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:43-50] [VERIFIED: src-tauri/src/controller.rs:1-178] [VERIFIED: src-tauri/src/platform/mod.rs:1-55] [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monitor enumeration | A virtual bounding rectangle or browser-only `screen` list | Tauri `available_monitors`; AppKit `NSScreen.screens`; Win32 `EnumDisplayMonitors`/`GetMonitorInfo` | Native APIs preserve monitor identity, physical geometry, scale, work area, and negative origins. [CITED: https://docs.rs/tauri/latest/tauri/struct.AppHandle.html] [CITED: https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc] [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors] |
| DPI conversion | One global scale factor or ad-hoc CSS offsets | Per-monitor physical-to-logical conversion plus DPR backing canvas | Mixed-DPI displays have different scale factors; Tauri and AppKit expose explicit conversion primitives. [CITED: https://v2.tauri.app/reference/javascript/api/namespacewindow/] [CITED: https://developer.apple.com/documentation/appkit/nswindow/backingscalefactor?changes=_5_5] |
| Pointer pass-through | CSS `pointer-events` as the only mechanism | Existing native platform adapter and OS hit-test behavior | CSS controls webview dispatch, while native styles/flags control whether the underlying app receives input. [VERIFIED: src-tauri/src/platform/mod.rs:6-14] [CITED: https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features] |
| Dynamic windows | Reimplementing WebView2/AppKit window creation | Tauri `WebviewWindowBuilder` with unique labels and async scheduling | The framework owns platform webview setup and documents the Windows synchronous-creation deadlock constraint. [CITED: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html] |
| Full-screen z-order | A portable `alwaysOnTop` promise | AppKit collection behavior, Win32 topmost/layered styles, and an explicit support matrix | Window managers and exclusive compositor paths differ by OS. [CITED: https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct] [CITED: https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features] |
| Topology event handling | Handling each event as an independent mutation | Debounced final-snapshot reconciliation | Display changes arrive as bursts and a final snapshot is the authoritative state. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:25-30] [ASSUMED] |

**Key insight:** The difficult part is maintaining one semantic scene while each OS changes the set of native viewports underneath it. Keep scene ownership independent from window ownership so a removed monitor only removes a viewport and a failed compositor operation only changes status/error state. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-16] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:27-37] [ASSUMED]

## Common Pitfalls

### Pitfall 1: Using `primary_monitor()` as the topology source

**What goes wrong:** Only the primary display receives an overlay, and the lifecycle snapshot cannot represent per-display state. [VERIFIED: src-tauri/src/controller.rs:68-81]

**Why it happens:** Phase 1 intentionally modeled one reusable surface and calls `primary_monitor()`. [VERIFIED: src-tauri/src/controller.rs:37-57] [VERIFIED: src-tauri/src/controller.rs:68-81]

**How to avoid:** Replace the single geometry with a monitor snapshot plus registry and keep the existing mode reducer as the shared state transition. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:43-50] [ASSUMED]

**Warning signs:** `DisplayGeometry` remains an `Option` on one snapshot, `OVERLAY_LABEL` is the only overlay label, or tests assert `surface_id == 1` as the only surface. [VERIFIED: src-tauri/src/controller.rs:7-8] [VERIFIED: src-tauri/src/controller.rs:27-43] [VERIFIED: src-tauri/src/controller.rs:184-189]

### Pitfall 2: Treating physical monitor values as logical window values

**What goes wrong:** Windows are offset or sized incorrectly on Retina/high-DPI and mixed-DPI arrangements. [CITED: https://v2.tauri.app/reference/javascript/api/namespacewindow/] [CITED: https://developer.apple.com/documentation/appkit/nswindow/backingscalefactor?changes=_5_5]

**Why it happens:** Tauri monitor position/size are physical, while window creation values are logical; AppKit warns that backing scale is not itself a layout value. [CITED: https://v2.tauri.app/reference/javascript/api/namespacewindow/] [CITED: https://developer.apple.com/documentation/appkit/nswindow/backingscalefactor?changes=_5_5]

**How to avoid:** Convert each descriptor with its own scale, preserve logical origin, and resize the canvas backing store from the viewport DPR. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:18-23] [VERIFIED: src/components/OverlaySurface.tsx:62-78] [ASSUMED]

**Warning signs:** A transform uses `window.devicePixelRatio` to position native windows, or normalization adds an arbitrary positive offset to every monitor. [VERIFIED: src/components/OverlaySurface.tsx:65-78] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:20-23]

### Pitfall 3: Losing negative origins or rotated-display orientation

**What goes wrong:** Marks or badges appear on the wrong monitor after a display sits left/above the primary or rotates. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:20-23] [ASSUMED]

**Why it happens:** Win32 virtual-screen rectangles may be negative, and a topology descriptor that stores only width/height cannot distinguish orientation changes. [CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-monitorinfo] [ASSUMED]

**How to avoid:** Keep native origin and orientation/rotation in the descriptor and test layouts where a secondary display has negative x and negative y. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:20-23] [ASSUMED]

### Pitfall 4: Recreating every window on every topology event

**What goes wrong:** Webviews flicker, mode/scene state can race, and a Windows WebView2 creation path can deadlock when invoked synchronously from an event handler. [CITED: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html] [ASSUMED]

**How to avoid:** Coalesce events, diff stable identities, update unchanged windows in place, and create new windows from an async task or separate thread. [CITED: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:25-30] [ASSUMED]

### Pitfall 5: Applying click-through to only one viewport

**What goes wrong:** One display captures input while another passes it through, violating the global interaction contract. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-16]

**How to avoid:** Make the registry the only owner of mode transition and apply the native adapter operation to every registered window before publishing the shared mode event. [VERIFIED: src-tauri/src/controller.rs:91-104] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-16] [ASSUMED]

### Pitfall 6: Assuming `alwaysOnTop` means every full-screen mode

**What goes wrong:** The overlay is hidden by a native full-screen Space or a compositor path that does not participate in normal desktop z-order. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] [ASSUMED]

**How to avoid:** Configure AppKit collection behavior where supported, use Windows topmost/layered styles, and record test results separately for native/borderless and exclusive full-screen. [CITED: https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct] [CITED: https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37]

### Pitfall 7: Dropping the scene when a display disappears

**What goes wrong:** Reconnecting a monitor loses annotations that were positioned on it. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:25-30]

**How to avoid:** Remove only the viewport/window entry; retain canonical scene records until the user clears them. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:27-30] [ASSUMED]

### Pitfall 8: Publishing an error after destroying shared state

**What goes wrong:** Retry or display recovery has no scene to render, and the user cannot recover without restarting. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] [ASSUMED]

**How to avoid:** Preserve the shared scene and controller mode, publish an actionable native error, and let retry reconcile the latest display snapshot. The existing error store already supports typed state and retry actions. [VERIFIED: src-tauri/src/errors.rs:5-37] [VERIFIED: src-tauri/src/errors.rs:51-58]

## Recommended Plan Decomposition

The planner should split the phase into these dependency-ordered slices. These are recommendations based on the current seams and locked decisions. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:43-50] [ASSUMED]

1. **Pure topology model:** Add monitor descriptor/identity, physical-to-logical transform, orientation representation, stable diff, and coalescing tests. Extend tracer coverage for negative origins, scale changes, rotation, add/remove, and scene retention.
2. **Registry and controller integration:** Replace the single geometry/window path with a registry that owns one viewport per monitor, broadcasts mode/click-through/hide, preserves shared scene identity, and maps failures to `ErrorStore` without clearing scene.
3. **Tauri dynamic window lifecycle:** Add unique per-display window creation, event handlers, in-place geometry updates, and asynchronous/off-thread creation to avoid the documented Windows WebView2 deadlock. Extend configuration/runtime wiring without replacing the settings window.
4. **Platform adapters:** Implement macOS screen notifications/collection behavior and Windows monitor/DPI/display-message hooks behind `PlatformWindowAdapter`; apply native hit-test and z-order updates to all windows.
5. **Renderer viewport contract:** Pass per-display origin/size/scale/rotation to each overlay webview, keep the shared scene in canonical coordinates, preserve the current DPR-backed canvas, and render the mode badge on each display. Keep live stroke preview deferred to Phase 3. [VERIFIED: src/components/OverlaySurface.tsx:94-118] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:7,67-69]
6. **Validation and support matrix:** Add deterministic Rust/TypeScript tests, a Phase 2 E2E suite for multiple window labels/state, and manual macOS/Windows hardware checks for mixed-DPI, negative coordinates, rotation, add/remove, native full-screen, borderless full-screen, and exclusive full-screen limitations.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One webview window positioned on `primary_monitor()` | One native overlay per active monitor with shared canonical scene | Phase 2 design, 2026-09-10 | Removes primary-only behavior and makes topology changes explicit. [VERIFIED: src-tauri/src/controller.rs:68-81] [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-30] |
| One process-wide logical/physical conversion | Per-monitor conversion plus DPR-backed canvas | Tauri 2 and current AppKit/Win32 APIs | Preserves mixed-DPI placement and crisp rendering. [CITED: https://v2.tauri.app/reference/javascript/api/namespacewindow/] [CITED: https://developer.apple.com/documentation/appkit/nswindow/backingscalefactor?changes=_5_5] |
| Reconcile each native event independently | Coalesced final display snapshot | Phase 2 design, 2026-09-10 | Avoids window churn during resolution/rotation/DPI bursts. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:25-30] |
| Treat topmost as universal full-screen support | Capability matrix with Supported/Limited/Unsupported states | Phase 2 design, 2026-09-10 | Aligns product claims with compositor behavior. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] |

**Deprecated/outdated:** The current primary-only `show` path is insufficient for this phase because it calls `primary_monitor()` and stores one `DisplayGeometry`; retain it only as a compatibility starting point while moving behavior into the registry. [VERIFIED: src-tauri/src/controller.rs:27-34] [VERIFIED: src-tauri/src/controller.rs:68-81]

## Project Constraints (from AGENTS.md)

- Release scope is macOS and Windows. [VERIFIED: AGENTS.md:11-17]
- The overlay must switch between pointer capture and click-through. [VERIFIED: AGENTS.md:13-15]
- Native overlay rendering must remain smooth in presentations and full-screen apps. [VERIFIED: AGENTS.md:13-17]
- Annotation/export is local-first and should not upload screen content by default. [VERIFIED: AGENTS.md:13-17]
- Follow GSD workflow entry points before file-changing work; this research was initialized through the phase init path. [VERIFIED: AGENTS.md:160-170]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tauri webview windows are the per-display surface and can be created asynchronously/off-thread while sharing one scene reference. | Architecture Patterns; Plan Decomposition | Dynamic window lifecycle may need a lower native shell if WebView2/AppKit behavior fails hardware validation. |
| A2 | A stable monitor identity can be derived from native monitor name/ID and survive a topology refresh sufficiently for in-place updates. | Architecture Patterns | A poor identity match could recreate windows or attach annotations to the wrong viewport; validate on add/remove/reorder. |
| A3 | A descriptor containing origin, logical size, scale, and rotation is sufficient for the Phase 2 renderer transform. | Architecture Patterns | Non-rectangular/mirrored display arrangements may require additional native metadata. |
| A4 | A short debounce interval can coalesce display-change bursts without making the overlay feel stale. | Architecture Patterns | Too much delay may leave a stale window visible; choose with manual observation and fake-clock tests. |
| A5 | Native full-screen behavior can be classified by the requested Supported/Limited/Unsupported matrix without promising exclusive full-screen. | Summary; Full-screen pattern | Platform behavior varies by OS version, compositor, and app; manual matrix evidence is required before release claims. |
| A6 | The existing shared React scene state can be routed to multiple webviews through Tauri events/commands without introducing a new persistence layer. | Architecture Patterns | Multi-webview synchronization may expose a state ownership gap; keep scene ownership native or define a one-way event contract if needed. |

## Open Questions

1. **What stable monitor key should adapters expose?**
   - What we know: AppKit exposes a `CGDirectDisplayID` property and Windows monitor handles are valid while present; Windows docs warn that an `HMONITOR` can become invalid after `WM_DISPLAYCHANGE`. [CITED: https://developer.apple.com/documentation/AppKit/NSScreen?changes=__4&language=objc] [CITED: https://learn.microsoft.com/en-us/windows/win32/gdi/hmonitor-and-the-device-context]
   - What's unclear: Whether the cross-platform key should be a native ID, stable name, or a composite descriptor in this codebase. [ASSUMED]
   - Recommendation: Keep an adapter-owned opaque key plus descriptor equality; on Windows refresh keys after display messages and test reconnect/reorder. [ASSUMED]

2. **Should native display events be delivered through Tauri’s window event path or direct platform observers?**
   - What we know: Tauri exposes `WindowEvent::Moved`, `Resized`, and `ScaleFactorChanged`, while AppKit and Win32 expose system-level topology notifications. [CITED: https://docs.rs/tauri/latest/tauri/enum.WindowEvent.html] [CITED: https://developer.apple.com/documentation/AppKit/NSApplication/didChangeScreenParametersNotification] [CITED: https://learn.microsoft.com/en-us/windows/win32/gdi/wm-displaychange]
   - What's unclear: Tauri’s window events alone may not signal an unplugged display when no window moves. [ASSUMED]
   - Recommendation: Use direct native topology observers behind the platform adapter and use Tauri window events as per-window geometry/DPI signals. [ASSUMED]

3. **Which macOS native window level is acceptable for the shipped distribution path?**
   - What we know: Collection behavior controls Space/full-screen participation, and the current config enables the Tauri `macos-private-api` feature. [CITED: https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct] [VERIFIED: src-tauri/Cargo.toml:19-20] [VERIFIED: src-tauri/tauri.conf.json:12-27]
   - What's unclear: Whether the target direct-download/App Store distribution choice permits the exact transparent native overlay implementation. [ASSUMED]
   - Recommendation: Keep the Phase 2 support matrix behavior-focused, record the distribution limitation, and leave signing/package policy to Phase 6. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] [ASSUMED]

4. **How should a failed single display affect global mode?**
   - What we know: D2-15 requires the app and shared scene to remain alive with a clear actionable error. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:34-37]
   - What's unclear: Whether other displays remain interactive while one viewport is blocked, or whether the manager reports a partial state. [ASSUMED]
   - Recommendation: Preserve and operate healthy viewports, mark the failed display in status, and verify this behavior before locking UI copy. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Frontend build and WebdriverIO | ✓ | 25.8.2; project requires `>=24.0.0` | Use the pinned CI Node 24 line for release parity. [VERIFIED: package.json:7-10] |
| pnpm | Existing scripts and dependency lockfile | ✓ | 11.19.0 | — [VERIFIED: package.json:7] |
| Rust/cargo | Native unit tests and Tauri build | ✓ | rustc/cargo 1.98.1 | — [VERIFIED: rust-toolchain.toml:1-5] |
| macOS AppKit host | macOS native topology/full-screen checks | ✓ | Current macOS host | — [ASSUMED from current host] |
| Windows 11/User32/WebView2 host | Windows native topology/full-screen checks | ✗ on this macOS host | — | Run on a Windows runner or machine with the pinned `x86_64-pc-windows-msvc` target; unit tests remain runnable locally. [VERIFIED: rust-toolchain.toml:1-5] [ASSUMED] |
| `tauri-driver` | Direct WebDriver route | ✗ | — | Use the configured embedded `@wdio/tauri-service` provider, which Tauri documents as the macOS-compatible route. [VERIFIED: wdio.conf.ts:23-35] [CITED: https://v2.tauri.app/develop/tests/webdriver/] |
| Physical mixed-DPI multi-monitor matrix | DISP-01/03/04 native verification | Unknown | — | Treat as manual hardware gate; deterministic fake descriptors cover unit math. [ASSUMED] |

**Missing dependencies with no fallback:** Windows native runtime/display matrix is unavailable on this macOS host; obtain a Windows runner/machine before claiming DISP-02 through DISP-04 complete on Windows. [ASSUMED]

**Missing dependencies with fallback:** Direct `tauri-driver` is unavailable; embedded WebDriver and unit tests cover automation, with native topology/full-screen still requiring platform hardware. [VERIFIED: wdio.conf.ts:23-35] [CITED: https://v2.tauri.app/develop/tests/webdriver/]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `5.0.0` for TypeScript; Rust `cargo test` for native logic. [VERIFIED: package.json:27-39] |
| Config file | `vitest.config.ts`; Rust tests are inline `#[cfg(test)]` modules. [VERIFIED: vitest.config.ts:1-12] [VERIFIED: src-tauri/src/controller.rs:180-209] |
| Quick run command | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml` |
| Full suite command | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm exec wdio run wdio.conf.ts --suite phase2-matrix` [ASSUMED suite to add] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | Every monitor receives a viewport with correct logical origin, size, scale, rotation, and negative coordinates. | Rust/TS unit + native manual matrix | `pnpm test` and `cargo test --manifest-path src-tauri/Cargo.toml` | ❌ Wave 0 topology test files |
| DISP-02 | Supported native/borderless full-screen surfaces keep a visible drawable overlay and document limited exclusive behavior. | Cross-platform E2E + manual | `pnpm exec wdio run wdio.conf.ts --suite phase2-matrix` [ASSUMED suite to add] | ❌ Phase 2 E2E suite |
| DISP-03 | Add/remove/rotate/resize/DPI changes reconcile without restart; removed scene records survive reappearance. | Rust diff/coalescing unit + hardware manual | `cargo test --manifest-path src-tauri/Cargo.toml topology` | ❌ Wave 0 topology fixtures |
| DISP-04 | Shortcut action, tool/mode feedback, and shared scene semantics match on macOS and Windows. | E2E + platform manual | `pnpm exec wdio run wdio.conf.ts --suite phase2-matrix` [ASSUMED suite to add] | ⚠ Existing lifecycle E2E needs multi-window assertions |

### Sampling Rate

- **Per task commit:** `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml`
- **Per wave merge:** same quick suite plus TypeScript build `pnpm build`
- **Phase gate:** full suite plus macOS and Windows manual display/full-screen matrix before `$gsd-verify-work`

### Wave 0 Gaps

- [ ] `src-tauri/src/display.rs` or equivalent topology model — descriptors, identity, transforms, diff, coalescing fixtures.
- [ ] `src-tauri/src/overlay_registry.rs` or equivalent — fake adapter tests for add/remove/update/broadcast and scene retention.
- [ ] `src-tauri/src/platform/*` test fixtures — platform event-to-snapshot reconciliation and actionable failure cases.
- [ ] `src/components/OverlaySurface` viewport transform tests — canonical desktop point to local logical point and DPR backing dimensions.
- [ ] `tests/e2e/display-topology.e2e.ts` plus `phase2-matrix` suite entry — per-display window labels, badges, topology command fixture, and mode broadcast.
- [ ] Manual hardware matrix — two displays with mixed DPI, rotation, negative origin, add/remove, and native/borderless/exclusive full-screen.

## Security Domain

Security enforcement is enabled at ASVS level 1 in `.planning/config.json`; this phase has no authentication or cryptography surface, but native input/window control and untrusted display metadata still require validation. [VERIFIED: .planning/config.json:22-46] [ASSUMED]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No account/authentication flow in this phase. [VERIFIED: .planning/REQUIREMENTS.md:81-91] |
| V3 Session Management | no | No remote session or user session token in this phase. [VERIFIED: .planning/REQUIREMENTS.md:81-91] |
| V4 Access Control | yes, local capability boundary | Keep native window commands behind the Rust controller; validate monitor keys/geometry and never accept arbitrary window labels from renderer input. [ASSUMED] |
| V5 Input Validation | yes | Validate finite, non-zero dimensions, finite scale, bounded debounce input, and known mode/monitor identities before native calls. Existing error/state enums provide a typed boundary to extend. [VERIFIED: src-tauri/src/errors.rs:5-24] [ASSUMED] |
| V6 Cryptography | no | No secrets, encryption, or cryptographic protocol is introduced by display topology. [VERIFIED: .planning/REQUIREMENTS.md:81-91] |

### Known Threat Patterns for Tauri + native overlays

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer asks native layer to create arbitrary labels/windows | Elevation of privilege | Generate labels from validated monitor keys in Rust; expose a narrow reconcile operation. [ASSUMED] |
| Malformed or stale monitor geometry | Tampering / Denial of service | Reject non-finite, zero, or out-of-range geometry; refresh from native snapshot before applying. [ASSUMED] |
| Click-through transition applied to only some windows | Spoofing / Tampering | Registry transaction applies hit testing and focus state to all windows, then emits shared mode. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:13-16] [ASSUMED] |
| Native full-screen/compositor failure leaves a stale overlay | Denial of service | Keep scene/controller alive, hide failed viewport, publish actionable typed error, and preserve emergency hide. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:32-37] [VERIFIED: src-tauri/src/errors.rs:51-58] |
| Display topology bursts create unbounded window churn | Denial of service | Debounce and coalesce events, cancel stale reconciliation work, and apply one final diff. [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:25-30] [ASSUMED] |

## Sources

### Primary official documentation (MEDIUM confidence)

- [Tauri JavaScript window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) — monitor physical geometry, logical conversion, `availableMonitors`, window options, and scale event.
- [Tauri Rust `AppHandle`](https://docs.rs/tauri/latest/tauri/struct.AppHandle.html), [Rust `Monitor`](https://docs.rs/tauri/latest/tauri/window/struct.Monitor.html), and [Rust `WindowEvent`](https://docs.rs/tauri/latest/tauri/enum.WindowEvent.html) — native monitor enumeration and per-window event types.
- [Tauri `WebviewWindowBuilder`](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html) — dynamic window creation and Windows WebView2 synchronous-call warning.
- [Apple `NSScreen.screens`](https://developer.apple.com/documentation/AppKit/NSScreen/screens?changes=_8&language=objc) and [`NSApplication.didChangeScreenParametersNotification`](https://developer.apple.com/documentation/AppKit/NSApplication/didChangeScreenParametersNotification) — display snapshots and topology changes.
- [Apple `backingScaleFactor`](https://developer.apple.com/documentation/appkit/nswindow/backingscalefactor?changes=_5_5) — backing conversion guidance.
- [Apple `fullScreenAuxiliary`](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary) and [`canJoinAllApplications`](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications) — eligible full-screen Space participation.
- [Microsoft `EnumDisplayMonitors`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors), [`MONITORINFO`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-monitorinfo), [`WM_DISPLAYCHANGE`](https://learn.microsoft.com/en-us/windows/win32/gdi/wm-displaychange), and [`WM_DPICHANGED`](https://learn.microsoft.com/en-us/windows/win32/hidpi/wm-dpichanged) — virtual desktop and DPI event behavior.
- [Microsoft window features](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features) — layered windows, transparent hit testing, and topmost ordering.
- [Tauri tests](https://v2.tauri.app/develop/tests/) and [Tauri WebDriver](https://v2.tauri.app/develop/tests/webdriver/) — mock runtime and cross-platform E2E limitations.

### Secondary sources

- [Project architecture research](../../research/ARCHITECTURE.md) — existing per-monitor/shared-scene design and platform boundaries. [VERIFIED: .planning/research/ARCHITECTURE.md:1-36]
- [Project pitfalls research](../../research/PITFALLS.md) — mixed-DPI, negative-origin, click-through, and full-screen failure modes. [VERIFIED: .planning/research/PITFALLS.md:1-80]

### Tertiary sources

- None used for implementation claims; exclusive full-screen and stable monitor identity remain `[ASSUMED]` until hardware validation.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — versions were read from the repo and checked against npm/Cargo registries; platform APIs were checked in current official docs.
- Architecture: MEDIUM — the current one-window seam and locked per-display/shared-scene decisions are clear, while stable monitor identity and multi-webview synchronization still need implementation validation.
- Pitfalls: MEDIUM — native API constraints are documented, but full-screen compositor behavior must be verified on real macOS and Windows configurations.

**Research date:** 2026-09-10
**Valid until:** 2026-10-10 for stable API guidance; recheck Tauri/WebDriver package versions before any dependency change.

# Architecture Patterns

**Project:** nABrush  
**Domain:** Cross-platform desktop screen annotation overlay  
**Researched:** 2026-09-09  
**Overall confidence:** MEDIUM

## Recommended Architecture

Use native, per-monitor overlay windows with a shared Rust scene model. Tauri 2 is a suitable application shell for the tray icon, settings, toolbar, packaging, and TypeScript UI, but the overlay window itself must be controlled through a small native platform adapter. The adapter owns transparency, z-order, hit testing, full-screen-space behavior, monitor bounds, and DPI conversion. This isolates the parts where macOS and Windows have materially different rules.

```text
Global shortcut / tray
          |
    AppController (Rust)
      /       |        \
     /        |         \
OverlayManager  SceneStore  Capture/Export
      |             |             |
  WindowAdapter  History +     CaptureAdapter
  per monitor    Expiry         + Composer
   /       \
AppKit    Win32
overlay   overlay
      \
  Canvas renderer in each overlay webview/native view

Toolbar and settings (TypeScript/Tauri webview)
              <---- commands/events ----> AppController
```

Keep one top-level overlay window for each physical display. Each window owns a monitor-local viewport, while all annotations are stored in one canonical desktop coordinate space. This gives the z-order and DPI behavior of independent windows without duplicating the annotation state. It also makes display add/remove, rotation, and mixed-DPI changes explicit events instead of hidden layout problems.

Tauri's architecture fits the split: its Rust backend hosts native bridges, TAO creates windows, WRY hosts the platform webview, and the frontend remains framework agnostic. Its global-shortcut plugin supports macOS and Windows and requires explicit capability permissions. Tauri's transparent-window option on macOS currently requires its `macos-private-api` feature and warns that this prevents App Store acceptance; therefore the product should wrap the overlay in a native AppKit view/bridge rather than making that private API the only release path. Direct DMG/MSIX distribution can use the Tauri shell, while an App Store target needs a separate packaging decision. [Tauri architecture](https://v2.tauri.app/concept/architecture/) (MEDIUM), [Tauri global shortcut](https://v2.tauri.app/plugin/global-shortcut/) (MEDIUM), [Tauri window options](https://v2.tauri.app/reference/javascript/api/namespacewindow/) (MEDIUM)

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `AppController` | Owns application lifecycle, active mode, command dispatch, and permission state | hotkey service, overlay manager, scene store, UI |
| `GlobalShortcutService` | Registers toggle, clear, undo/redo, and export shortcuts; reports conflicts | AppController, native adapter |
| `OverlayManager` | Enumerates displays, creates/destroys one overlay per display, reconciles bounds and visibility | platform adapter, scene store |
| `PlatformWindowAdapter` | Creates borderless transparent windows; sets always-on-top, workspace/full-screen policy, focus, and hit testing | AppController, OverlayManager, AppKit or Win32 |
| `CoordinateMapper` | Converts OS global coordinates, monitor-local logical points, and backing pixels | platform adapter, renderer, capture/export |
| `AnnotationStore` | Retained serializable scene of strokes, highlights, arrows, shapes, and text | command history, expiry scheduler, renderer, exporter |
| `CommandHistory` | Applies reversible model commands and maintains undo/redo stacks | AnnotationStore, toolbar UI |
| `ExpiryScheduler` | Tracks monotonic expiry/fade times and invalidates only affected bounds | AnnotationStore, renderer |
| `CanvasRenderer` | Draws persistent scene plus current gesture preview at device-pixel resolution | AnnotationStore, overlay webview/native view |
| `CaptureAdapter` | Captures the selected display or desktop surface using the platform API and excludes the app where supported | platform bridge, exporter |
| `ExportComposer` | Composites the captured pixels with the annotation scene and writes PNG/JPEG locally | CaptureAdapter, CoordinateMapper, file save UI |
| `Toolbar/Settings UI` | Selects tool, color, width, fade policy, and display; shows permission/errors | Tauri IPC/events, AppController |

Do not put native window handles or OS permission calls in the TypeScript renderer. Expose small, typed commands such as `set_overlay_mode`, `set_overlay_bounds`, `list_displays`, `request_capture_permission`, and `export_annotation`. Emit state events back to the UI instead of allowing the UI to infer native state.

### Data Flow

1. At startup, `AppController` requests the display topology and creates hidden overlay windows. A window is shown only when it has visible annotations or the user enters drawing mode.
2. The shortcut service sends a toggle event to `AppController`. The controller changes an explicit state (`Hidden`, `VisibleInteractive`, or `VisibleClickThrough`) and applies the state to every monitor window atomically.
3. In interactive mode, pointer events from the active overlay are converted from its local coordinates into canonical desktop coordinates. Pointer down starts a command; move updates a transient preview; pointer up commits one retained annotation object.
4. The store emits a scene revision and dirty bounds. The renderer draws the retained scene and preview on the next animation frame. It should use a persistent layer plus a preview layer so a drag does not rebuild the whole scene on every event.
5. The expiry scheduler uses a monotonic clock. Timed marks move through `visible -> fading -> expired`; each transition invalidates its bounds. When no mark remains visible, the manager hides/orders out the overlay windows and stops the animation loop.
6. In click-through mode, the windows stay visible and topmost but return no pointer hit target. The underlying application receives clicks and scrolls. A global shortcut can re-enter interactive mode because it is delivered independently of overlay hit testing.
7. Export captures the underlying display and then renders the retained scene into the captured image using the same coordinate transform. This avoids depending on whether a system screenshot includes a transparent overlay window. The overlay should be excluded from capture where the platform API supports exclusion; a hide-and-capture fallback must be tested for flicker.
8. Display topology, DPI, rotation, or Space changes trigger a reconciliation pass: update or recreate the affected monitor window, preserve the canonical scene, and invalidate only the affected viewport.

## Platform-Specific Constraints

### macOS

- Use an `NSWindow`/AppKit host for each display: borderless, transparent, no shadow, non-activating where possible, and at an appropriate floating level. `NSWindow.ignoresMouseEvents` is the native click-through switch. Set it to `false` only while drawing or interacting with controls, and flush pointer capture when changing modes. [Apple `ignoresMouseEvents`](https://developer.apple.com/documentation/appkit/nswindow/ignoresmouseevents?language=objc) (MEDIUM)
- A screen-wide annotation window needs a deliberate Space policy. AppKit exposes `fullScreenAuxiliary` for a window that displays in the same Space as a full-screen window and `canJoinAllApplications` for floating system overlays that join other apps' full-screen Spaces. These behaviors have Stage Manager and mutual-exclusion rules, so validate the chosen policy on separate Spaces, Stage Manager, external displays, and both native and borderless full-screen apps. [Apple `fullScreenAuxiliary`](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary) (MEDIUM), [Apple `canJoinAllApplications`](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications) (MEDIUM)
- Use `NSScreen.screens` and each screen's `frame` for the full display rectangle. Store screen-space positions in a normalized, top-left-origin desktop space; AppKit's global coordinates use a different origin convention than Win32. Convert to backing pixels at render/export time. Apple documents `backingScaleFactor` and recommends backing conversion methods rather than using the scale factor as a layout value. [Apple `NSScreen`](https://developer.apple.com/documentation/appkit/nsscreen?changes=__4&language=objc) (MEDIUM), [Apple `backingScaleFactor`](https://developer.apple.com/documentation/appkit/nsscreen/backingscalefactor?changes=_1) (MEDIUM), [Apple `frame`](https://developer.apple.com/documentation/appkit/nsscreen/frame?changes=__8) (MEDIUM)
- Use ScreenCaptureKit for display screenshots/capture. It is the current high-performance API, provides display/app/window filters, and requires the user to grant Screen Recording permission; Apple notes that a restart may be needed after the first grant. Keep this permission out of the drawing path and request it only when export/capture needs it. [Apple ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit?changes=latest_be_8) (MEDIUM), [Apple capturing screen content](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos?changes=_9) (MEDIUM)
- A simple global hotkey should use the Tauri/global shortcut bridge first. If raw system event observation or event filtering is later required, `CGEventTapCreate` is a separate path and key events require Accessibility/assistive-device permission. Do not silently fall back to an event tap when the user has not granted that capability. [Apple `CGEventTapCreate`](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate%28tap%3Aplace%3Aoptions%3Aeventsofinterest%3Acallback%3Auserinfo%3A%29?changes=la_6_5_8_2&language=objc) (MEDIUM)
- Tauri's documented transparent webview path on macOS uses a private API feature and blocks App Store acceptance. Keep the native overlay bridge behind an interface so a direct-distribution build and a future App Store/native-shell build can share the same Rust scene and renderer contracts. [Tauri webview transparency](https://v2.tauri.app/reference/javascript/api/namespacewebview/) (MEDIUM)

### Windows

- Create a top-level popup overlay per monitor with `WS_EX_LAYERED`, `WS_EX_TOOLWINDOW`, and `WS_EX_NOACTIVATE`; use `HWND_TOPMOST`/`SetWindowPos` to place it above normal windows without activating the underlying app. For per-pixel alpha, use a layered-window surface (`UpdateLayeredWindow`) or a tested DirectComposition path. Microsoft documents that layered windows are composed with alpha and that transparent pixels can pass hit testing. [Microsoft layered windows](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features) (MEDIUM), [Microsoft `SetWindowPos`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos) (MEDIUM)
- Implement click-through in the native hit-test path. In click-through mode, apply the documented layered-window transparent behavior (`WS_EX_TRANSPARENT`) and return `HTTRANSPARENT` from the window procedure where appropriate. In interactive mode, remove the pass-through behavior and accept pointer input. Treat this as a state transition on an existing HWND; recreating a full-screen window causes z-order and focus glitches.
- Register the toggle with `RegisterHotKey` and process `WM_HOTKEY` on the host message loop. Registration can fail when another application owns the accelerator, and the OS reserves some keys; surface a clear conflict message and offer rebinding. Use `MOD_NOREPEAT` for toggle commands. [Microsoft `RegisterHotKey`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey) (MEDIUM)
- Enable Per-Monitor V2 DPI awareness before creating overlay windows and handle `WM_DPICHANGED`. Enumerate the virtual desktop with `EnumDisplayMonitors(NULL, NULL, ...)` and obtain each monitor's rectangle through `GetMonitorInfo`. Do not use one system-DPI conversion for every display. [Microsoft DPI awareness](https://learn.microsoft.com/en-us/windows/win32/hidpi/dpi-awareness-context) (MEDIUM), [Microsoft default DPI awareness](https://learn.microsoft.com/en-us/windows/win32/hidpi/setting-the-default-dpi-awareness-for-a-process) (MEDIUM), [Microsoft `EnumDisplayMonitors`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors) (MEDIUM), [Microsoft `GetMonitorInfo`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getmonitorinfoa) (MEDIUM)
- For export, use `Windows.Graphics.Capture` behind `CaptureAdapter`. It can capture a display or window and provides a system picker/consent flow; handle unsupported devices, item resize, device loss, and frame-pool recreation. The secure picker can draw a yellow notification border, so the export path must verify the final image and decide whether a direct display capture or a programmatic, already-consented path is appropriate. [Microsoft screen capture](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture) (MEDIUM), [Microsoft `GraphicsCaptureItem`](https://learn.microsoft.com/en-us/uwp/api/windows.graphics.capture.graphicscaptureitem?view=winrt-28000) (MEDIUM)
- A topmost window is not a guarantee over every exclusive-full-screen surface. Borderless full-screen desktop apps are the primary target; exclusive graphics modes may bypass normal desktop composition. Record this in the support matrix and provide a quick recovery shortcut if an overlay is hidden behind the target.

## Patterns to Follow

### 1. Retained scene, transient gesture

**What:** Store semantic annotation records instead of a bitmap. A record should include `id`, `kind`, canonical points or bounds, color, opacity, width, text/style, z-order, and lifetime. During a drag, keep the incomplete geometry in a preview object; commit it once on pointer-up.

**When:** Always. It is required for undo/redo, timed fading, replaying after a display change, and export at a different pixel scale.

**Example:**

```typescript
type Lifetime =
  | { kind: "persistent" }
  | { kind: "timed"; visibleUntilMs: number; fadeMs: number };

type Annotation = {
  id: string;
  kind: "pen" | "highlight" | "arrow" | "line" | "rect" | "ellipse" | "text";
  points: Array<{ x: number; y: number }>;
  style: { color: string; alpha: number; width: number };
  lifetime: Lifetime;
};
```

### 2. Command history over model mutations

**What:** Every committed add, edit, erase, or clear operation is a reversible command. Undo and redo operate on commands or compact scene snapshots, never on full-screen pixel buffers. A command carries the annotation ID and prior value so it remains deterministic after a display change.

**When:** For all tools, including text finalization and eraser actions.

### 3. Explicit native window state machine

**What:** Model `Hidden`, `VisibleInteractive`, and `VisibleClickThrough` independently from the renderer. `VisibleInteractive` controls native hit testing and focus; `VisibleClickThrough` leaves the pixels on screen but passes pointer activity through. Hotkey handling remains active in both states.

**When:** Every mode switch and every display reconciliation. Apply the same transition to all monitor windows and make it idempotent.

### 4. Canonical desktop coordinates

**What:** Store and exchange points in a normalized desktop coordinate space with a per-monitor transform containing origin, size, rotation, and scale. Convert only at OS boundaries and final rasterization. Preserve negative monitor origins and mixed DPI.

**When:** Pointer input, window placement, monitor changes, and export.

### 5. Dirty-region rendering and scheduled expiry

**What:** Keep a persistent scene layer and a transient preview layer. Redraw the preview at `requestAnimationFrame` while a gesture is active. For fading marks, schedule the next deadline and redraw the affected bounds; do not run a permanent 60 fps loop when the scene is static or empty.

**When:** Full-screen canvases, presentations, and long sessions where idle CPU and battery use matter.

### 6. Capability-aware capture and export

**What:** Treat capture permission, supported capture target, and overlay exclusion as explicit capabilities. Capture the underlying surface and re-render annotations into the output using the same transform. Keep files local by default and make the destination user-selected.

**When:** Every export request, with platform-specific error states shown in the toolbar.

## Anti-Patterns to Avoid

### Anti-Pattern 1: One giant webview window for the virtual desktop

**What:** A single window spanning every monitor, positioned from a virtual bounding rectangle.

**Why bad:** It increases the cost of a transparent surface, complicates negative origins and mixed-DPI transforms, and makes one bad full-screen z-order interaction affect every monitor.

**Instead:** Create one native top-level overlay per display and share the scene store.

### Anti-Pattern 2: Raster pixels as the source of truth

**What:** Paint into one full-screen bitmap and use that bitmap for undo, fading, and export.

**Why bad:** Erasing and editing shapes become destructive, undo consumes memory proportional to monitor pixels, and scaling or display migration produces blurry marks.

**Instead:** Keep semantic records and render them into the current viewport.

### Anti-Pattern 3: Global low-level input interception for the basic toggle

**What:** Install a system-wide keyboard/mouse hook and filter every event just to switch drawing mode.

**Why bad:** It adds permission prompts, security review, event latency, and failure modes. On macOS, event taps for key events require Accessibility permission.

**Instead:** Use a dedicated global-shortcut API for toggle/command shortcuts; reserve raw event taps for a separately justified feature.

### Anti-Pattern 4: Treating `alwaysOnTop` as full-screen support

**What:** Assume one topmost flag covers every Space, Stage Manager state, exclusive full-screen app, and display.

**Why bad:** Window level, Spaces, and exclusive graphics composition are platform policies, not one portable boolean.

**Instead:** Use platform-specific Space/full-screen settings, maintain a tested support matrix, and expose recovery behavior.

### Anti-Pattern 5: Capturing the transparent overlay and trimming it afterward

**What:** Depend on the screenshot API to include the overlay exactly once, then crop or mask the result.

**Why bad:** Capture APIs differ in whether transparent windows, protected surfaces, and compositor effects are included; duplicate or missing annotations are hard to diagnose.

**Instead:** Capture the source display and composite the retained scene explicitly, using native exclusion/filtering when available.

## Scalability Considerations

The runtime scales with the number of displays and annotation objects, not with the number of product users. Keep the first version local and stateless across machines.

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Scene/rendering | One scene store per process; Canvas 2D with dirty bounds is sufficient | Profile long sessions and high-DPI 4K/5K displays; add spatial bucketing if scenes exceed thousands of objects | Consider a GPU/native renderer and scene virtualization only if real usage data shows large scenes |
| Capture/export | One-shot local capture on a worker thread | Test permission denial, device loss, HDR, and large PNG memory use across OS versions | Add crash/telemetry opt-in and bounded export memory; never upload screen pixels by default |
| Display topology | Reconcile add/remove/rotation events synchronously | Expand automated hardware matrix for mixed-DPI and multi-monitor setups | Keep platform adapters versioned and ship compatibility telemetry without collecting screen content |
| Distribution | Signed DMG/MSIX and a simple update path | Staged releases and crash reporting; support both Apple notarization and Windows signing | CDN-backed updates, rollback, and release rings; revisit App Store packaging if required |

## Suggested Build Order

1. Build a native overlay harness on both operating systems: one display, transparent borderless window, topmost placement, global toggle, and interactive/click-through switching.
2. Add display enumeration, canonical coordinates, Per-Monitor V2/AppKit backing transforms, and one overlay window per monitor. Validate mixed-DPI and negative-origin layouts before implementing every drawing tool.
3. Add the retained annotation model, Canvas renderer, freehand/line/shape tools, and command history. Keep the toolbar in a separate interactive window or tray surface so the drawing viewport can remain click-through.
4. Add text, eraser, fade scheduling, clear/undo/redo, and toolbar preferences. Verify idle CPU after all marks expire and mode transitions while an app is focused.
5. Add platform capture adapters and export composition, then exercise permission denial, protected/full-screen content, display changes during export, and large output sizes.
6. Harden packaging, signing, startup/recovery shortcuts, and the documented support matrix. Decide whether macOS distribution is direct/notarized or App Store before depending on Tauri's private transparency API.

## Scalability and Risk Flags for Roadmap

- The first phase should be a cross-platform native-overlay spike. It is the highest-risk dependency and should prove z-order, pointer pass-through, global hotkeys, and mixed-DPI transforms before UI polish.
- macOS full-screen Spaces and Tauri's private transparency API need a phase-specific research/validation flag because their behavior affects distribution and cannot be inferred from a generic cross-platform window API.
- Windows exclusive-full-screen applications require an explicit support decision. Supporting them may require a different capture/window strategy; injecting into target processes would add security and anti-cheat risk and should not be part of the MVP assumption.
- Export should be its own phase after the overlay scene model exists. Screen Recording/Graphics Capture permissions and compositor exclusion behavior are separate from drawing and need platform QA.

## Sources

- [Tauri architecture](https://v2.tauri.app/concept/architecture/) — Rust/native bridge, TAO/WRY, frontend/backend message passing (MEDIUM)
- [Tauri global shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/) — macOS/Windows support and capability permissions (MEDIUM)
- [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) and [Tauri webview API](https://v2.tauri.app/reference/javascript/api/namespacewebview/) — transparency and platform caveats (MEDIUM)
- [Win32 window features](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features) and [`SetWindowPos`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos) — layered alpha, hit testing, and topmost z-order (MEDIUM)
- [`RegisterHotKey`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey) — system-wide shortcut delivery and conflicts (MEDIUM)
- [`EnumDisplayMonitors`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors), [`GetMonitorInfo`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getmonitorinfoa), and [Per-Monitor DPI](https://learn.microsoft.com/en-us/windows/win32/hidpi/dpi-awareness-context) — monitor topology and mixed-DPI handling (MEDIUM)
- [Windows.Graphics.Capture](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture) — display/window capture, consent, frame-pool behavior, and device loss (MEDIUM)
- [Apple `NSWindow.ignoresMouseEvents`](https://developer.apple.com/documentation/appkit/nswindow/ignoresmouseevents?language=objc), [`fullScreenAuxiliary`](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary), and [`canJoinAllApplications`](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications) — click-through and full-screen Space policy (MEDIUM)
- [Apple `NSScreen`](https://developer.apple.com/documentation/appkit/nsscreen?changes=__4&language=objc), [`frame`](https://developer.apple.com/documentation/appkit/nsscreen/frame?changes=__8), and [`backingScaleFactor`](https://developer.apple.com/documentation/appkit/nsscreen/backingscalefactor?changes=_1) — display coordinates and backing conversion (MEDIUM)
- [Apple ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit?changes=latest_be_8) — current screen capture API and Screen Recording permission (MEDIUM)
- [Apple `CGEventTapCreate`](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate%28tap%3Aplace%3Aoptions%3Aeventsofinterest%3Acallback%3Auserinfo%3A%29?changes=la_6_5_8_2&language=objc) — raw global event tap and Accessibility requirement (MEDIUM)


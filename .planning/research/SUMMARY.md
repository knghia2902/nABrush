# Project Research Summary

**Project:** nABrush  
**Domain:** Cross-platform desktop screen annotation overlay  
**Researched:** 2026-09-09  
**Confidence:** MEDIUM

## Executive Summary

nABrush is a local desktop utility for presenters, teachers, and general users who need to draw over any visible application, switch back to normal interaction without clearing the ink, and export a clean annotated image. The research consistently points to a native overlay architecture: one transparent top-level window per physical display, a shared retained annotation scene, an explicit interactive/click-through state machine, and a narrow platform adapter for the OS-specific window, input, display, and capture rules.

The recommended implementation is Tauri 2 with Rust for native integration and React/TypeScript with Canvas 2D for the toolbar and renderer. Keep all geometry in canonical desktop coordinates, keep semantic objects as the source of truth, and composite annotations over a separately captured display for export. The first release should stay local and account-free: complete drawing tools, persistent or vanishing ink, multi-monitor/full-screen behavior, configurable global shortcuts, and PNG/clipboard export. Cloud sync, collaboration, recording, AI, and a document-style whiteboard should wait until the core loop is validated.

The largest risks are platform behavior rather than UI breadth. macOS full-screen Spaces, Screen Recording permission, and Tauri's private transparency API affect both reliability and distribution; Windows layered-window hit testing, mixed-DPI virtual desktops, capture consent, and exclusive full-screen surfaces need equivalent validation. A cross-platform overlay harness must prove z-order, click-through, global shortcuts, monitor transforms, and recovery behavior before the team invests in the full tool palette. Capture should be permission-aware and local, with the overlay excluded and annotations re-rendered into the output to avoid duplicate or missing marks.

## Key Findings

### Recommended Stack

Use the stack described in [STACK.md](./STACK.md). Tauri 2.11.x and stable Rust provide the small native shell and the platform boundary needed for transparent windows, global shortcuts, monitor enumeration, capture, secure file export, and packaging. React 19 with TypeScript 5 and Vite 8.2.x is appropriate for toolbar/settings UI, while the drawing engine should remain framework-independent. Use Node 24 LTS and pnpm with versions pinned by lockfiles and CI.

**Core technologies:**

- **Tauri 2 + Rust:** desktop shell, IPC, native window control, permissions, capture, and packaging. Rust isolates AppKit/Win32 details behind typed commands and keeps the install smaller than Electron.
- **React + TypeScript + Vite:** toolbar, settings, shortcut configuration, and application UI. Keep pointer-level rendering in a standalone TypeScript scene/renderer module.
- **Canvas 2D with a retained scene:** low-latency freehand paths, highlighter alpha, shapes, text, fade animation, and PNG composition with low MVP risk. Add OffscreenCanvas only after profiling shows a need.
- **Tauri global-shortcut, dialog, fs, and store plugins:** system-wide commands, user-selected export destinations, scoped local file writes, and local preferences. Store only settings in v1; do not introduce a session database.
- **ScreenCaptureKit and Windows.Graphics.Capture:** current platform capture paths for display/region export. Keep capture behind a `CaptureAdapter` and handle permission, unsupported targets, device loss, and protected content explicitly.
- **Vitest, cargo test, and WebdriverIO/Tauri service:** unit-test scene/history/coordinate logic and run native E2E checks on both macOS and Windows, where z-order and input behavior cannot be inferred from one OS.

Critical stack constraints are Rust 1.77.2 or newer for the official global-shortcut plugin, pinned compatible Tauri 2.x versions, and Node 24 LTS for frontend tooling. Produce a signed/notarized macOS DMG and a signed Windows NSIS installer for direct distribution. Decide the macOS App Store versus direct-download path early because Tauri's documented transparent WebView path uses a private API that is unsuitable for App Store acceptance. The updater belongs after signed release artifacts and key management exist.

### Expected Features

The [FEATURES.md](./FEATURES.md) research matches the validated project brief: the product earns trust through a fast, visible, predictable annotation loop rather than breadth outside that loop.

**Must have (table stakes):**

- Global activation, visible mode indicator, tray/menu-bar lifecycle, and configurable shortcuts.
- Transparent overlay above normal applications, with explicit drawing and pointer/click-through modes.
- Per-monitor overlays that handle mixed resolutions, DPI, orientation, negative coordinates, topology changes, and supported full-screen workflows.
- Pen, highlighter, line, arrow, rectangle, ellipse, text, eraser, clear, undo, and redo.
- Per-tool color, opacity, width, text size, and remembered style controls.
- Persistent ink and configurable vanishing ink with an obvious active mode and deterministic lifecycle.
- Full-display and selected-region PNG export plus clipboard copy, excluding toolbar/controls and preserving pixel density.
- Local-first permission guidance for macOS Screen Recording/Accessibility and Windows capture limitations.

**Should have (competitive):**

- Cross-platform behavioral parity in tool order, shortcut concepts, mode feedback, and export semantics.
- A reliable ghost/click-through mode with a safe escape shortcut and unmistakable feedback.
- Cursor halo/spotlight/magnifier and ephemeral whiteboard mode for teaching.
- Pressure-sensitive stylus/touch support, selectable/editable objects, numbered callouts, and presentation presets.
- A bounded local snapshot/recall panel for restoring explanations without introducing cloud storage.

**Defer (v2+):**

- Cloud accounts, automatic session sync, real-time collaboration, and a mobile/remote-clicker companion.
- Screen recording, video editing, AI drawing/OCR/summaries, and a full screenshot editor.
- Unlimited document-style whiteboard, named cloud sessions, and sophisticated publishing workflows.

**Recommended v1 scope:** ship the complete local loop: launch from tray/menu bar, activate with a global shortcut, draw on every connected display, switch between interactive and click-through states, use all requested basic tools with undo/redo/clear and persistent/vanishing ink, then export a clean PNG to a chosen path and clipboard. Do not make persistence, accounts, or monetization a dependency. The paid feature set remains an open product decision and should be informed by usage rather than assumed during implementation.

### Architecture Approach

The [ARCHITECTURE.md](./ARCHITECTURE.md) research recommends a shared Rust `AppController` with per-monitor native overlay windows and a retained, serializable scene. The TypeScript UI communicates through small typed Tauri commands/events; it does not own native window handles, permission calls, platform branches, or the source of truth for annotation pixels. Pointer coordinates are normalized into a top-left-origin canonical desktop space and converted only at monitor, renderer, and export boundaries.

**Major components:**

1. **AppController and GlobalShortcutService** — own lifecycle, explicit `Hidden`/`VisibleInteractive`/`VisibleClickThrough` state, global command registration, conflict reporting, and permission state.
2. **OverlayManager and PlatformWindowAdapter** — enumerate displays, create one transparent topmost window per monitor, reconcile add/remove/rotation/full-screen changes, control focus and hit testing, and bridge AppKit/Win32 behavior.
3. **CoordinateMapper** — preserve negative origins, mixed DPI, rotation, and backing-pixel transforms across OS global coordinates, monitor-local input, Canvas, and export.
4. **AnnotationStore and CommandHistory** — store semantic strokes/shapes/text with style, z-order, creation time, and lifetime; make every add/edit/erase/clear operation reversible without raster snapshots.
5. **ExpiryScheduler and CanvasRenderer** — maintain persistent and transient preview layers, redraw dirty bounds, animate fading marks from monotonic deadlines, and stop animation/overlay work when the scene is idle.
6. **CaptureAdapter and ExportComposer** — capture the underlying display or region with platform capabilities, exclude the overlay where possible, re-render the scene through the same transform, and write a local PNG through a user-selected path/clipboard flow.
7. **Toolbar/Settings UI** — select tools, styles, lifetime, target display, shortcuts, and export actions; show mode, permission, capture, and error state without being included in captures.

### Critical Pitfalls

`PITFALLS.md` was not present when synthesis ran. The risks below are therefore consolidated from the anti-patterns, platform constraints, and risk flags in STACK.md, FEATURES.md, and ARCHITECTURE.md; they should be turned into explicit planning checks.

1. **Treating one `alwaysOnTop` flag as full-screen support** — validate macOS Spaces/Stage Manager/full-screen auxiliary behavior and Windows borderless versus exclusive full-screen behavior. Maintain a support matrix and provide a recovery hide/show shortcut.
2. **Using one giant virtual-desktop webview or a single raster bitmap** — use one native overlay window per display, canonical desktop coordinates, and semantic retained objects. This preserves hit testing, mixed-DPI accuracy, undo/redo, fading, display migration, and high-quality export.
3. **Making interactive/click-through changes only in the renderer** — switch native hit testing, focus, and renderer state atomically across every overlay. Keep the global shortcut active in click-through mode and flush pointer capture during a transition so the underlying app cannot be accidentally blocked.
4. **Capturing the transparent overlay as the source of truth** — capture the underlying display/region and composite retained annotations explicitly. Exclude the toolbar, avoid duplicate marks, test hide-and-capture flicker as a fallback, and surface permission/protected-content failures.
5. **Installing low-level global event hooks for basic shortcuts** — start with the dedicated global-shortcut API, detect conflicts, and reserve macOS event taps or equivalent hooks for a separately justified capability because they add permission and latency risks.
6. **Redrawing continuously or storing full-screen snapshots** — render persistent and preview layers separately, redraw dirty regions, schedule fade deadlines, and keep idle CPU/battery use low. Use command history or compact scene snapshots rather than pixel-buffer history.

## Implications for Roadmap

Based on the dependencies in FEATURES.md and the build order in ARCHITECTURE.md, use six phases. The first two are validation-heavy foundations; drawing features come only after the native surface and coordinate contract are proven.

### Phase 1: Cross-Platform Native Overlay Harness

**Rationale:** Transparent topmost windows, global hotkeys, pointer pass-through, focus behavior, and full-screen visibility are the highest-risk dependencies. Prove them with a small vertical harness before toolbar polish or a large renderer.

**Delivers:** Tauri/Rust scaffold, tray lifecycle, one-monitor overlays on macOS and Windows, global toggle and emergency-hide shortcuts, explicit interactive/click-through states, initial permission/error reporting, and a documented support matrix.

**Addresses:** Global activation, clear mode switch, transparent overlay, pointer/click-through mode, tray lifecycle, and privacy-first permission guidance.

**Avoids:** Assuming `alwaysOnTop` covers all full-screen contexts, using low-level input hooks without need, or allowing the renderer to control native hit testing.

### Phase 2: Display Topology and Coordinate Infrastructure

**Rationale:** All later pointer input and export correctness depend on a stable coordinate contract. Mixed DPI, negative monitor origins, rotation, display add/remove, and full-screen/Space changes must be correct before scene objects are built.

**Delivers:** Per-monitor overlay creation/reconciliation, canonical desktop coordinate model, AppKit backing conversion, Windows Per-Monitor V2 handling, target-display policy, topology event handling, and test fixtures for multi-monitor geometries.

**Addresses:** Multi-monitor targeting, full-screen/display topology behavior, and the foundation for accurate tool hit testing and output scaling.

**Avoids:** One giant virtual-desktop window, one global DPI conversion, drawing on an unintended monitor, and coordinate drift after display changes.

### Phase 3: Retained Scene and Core Drawing Tools

**Rationale:** Once the viewport and transforms are trustworthy, implement the central user value with a framework-independent scene model and Canvas renderer. This phase has standard rendering patterns and can be tested mostly without native capture.

**Delivers:** Serializable semantic annotation types, preview-versus-committed gesture flow, Canvas 2D persistent/preview layers, pen, highlighter, line, arrow, rectangle, ellipse, color/opacity/width controls, and low-latency dirty-region redraw.

**Uses:** React/TypeScript UI, Canvas 2D, `AnnotationStore`, `CoordinateMapper`, and the renderer contract.

**Avoids:** Raster pixels as the source of truth, DOM-per-shape SVG churn, full-scene redraw on every pointer event, and framework coupling in the drawing engine.

### Phase 4: Editing, Ink Lifecycle, and Utility UX

**Rationale:** Add the remaining requested interactions after the scene model exists so every operation shares deterministic history and lifecycle semantics.

**Delivers:** Text editing/commit/cancel, eraser, clear-all, command-based undo/redo, persistent and configurable fading ink, per-tool remembered styles, configurable shortcut registry, toolbar/menu-bar settings, and idle/expiry behavior.

**Implements:** `CommandHistory`, `ExpiryScheduler`, `GlobalShortcutService`, toolbar/settings state, safe escape/recovery paths, and visible mode/fade feedback.

**Avoids:** Non-undoable clear/erase, ambiguous text boundaries, hidden mode changes, modifier-only critical controls, permanent 60 fps animation, and accidental input capture.

### Phase 5: Capture, Composition, and Export

**Rationale:** Export is a separate platform capability with permission and compositor behavior that should build on the stable retained scene and coordinate transforms.

**Delivers:** ScreenCaptureKit and Windows.Graphics.Capture adapters, full-display and selected-region capture, scene-to-pixel composition, toolbar exclusion, PNG save dialog, clipboard copy, predictable filenames, large-output handling, and clear permission/protected-content recovery.

**Addresses:** Screenshot/export of the composed screen and privacy-first local capture.

**Avoids:** Duplicate/missing overlay marks, capturing toolbar artifacts, deprecated macOS capture APIs, unbounded filesystem permissions, and silent failure when capture consent is denied.

### Phase 6: Packaging, Signing, and Release Hardening

**Rationale:** Distribution requirements are known but platform signing and transparency tradeoffs should be finalized after the runtime behavior works on real hardware.

**Delivers:** GitHub Actions macOS/Windows test and release matrix, signed/notarized DMG, signed Windows NSIS installer, updater readiness decision, startup/recovery behavior, crash/diagnostic handling, and documented supported OS/full-screen/display combinations.

**Uses:** Tauri bundler, CI runners, Apple Developer ID/notarization, Windows signing, and release secrets kept outside the repository.

**Avoids:** Shipping unsigned installers, enabling an updater without signed artifacts/key rotation, promising unsupported exclusive-full-screen surfaces, and discovering the App Store/private-API conflict after release work is complete.

### Phase Ordering Rationale

- Native z-order, hit testing, global shortcuts, and permissions constrain every later feature, so the overlay harness precedes UI and drawing work.
- Canonical coordinates and per-monitor lifecycle precede tools because wrong transforms would corrupt strokes, fading bounds, and exports across displays.
- The retained scene precedes text, erasing, undo/redo, fade scheduling, and capture so all operations share one semantic model.
- Export follows the scene and coordinate contracts because it must capture the source surface and re-render annotations with the same transform.
- Packaging and monetization are late concerns. The free core must produce reliable usage evidence before deciding which advanced capabilities justify a paid tier.

### Research Flags

Phases likely needing deeper research or explicit `--research-phase` during planning:

- **Phase 1:** macOS transparent window/private API implications, Spaces/Stage Manager/full-screen behavior, Windows layered-window z-order/hit testing, shortcut conflicts, and the minimum OS support matrix.
- **Phase 2:** mixed-DPI/orientation/negative-origin behavior on real multi-monitor hardware and display topology event timing on both OSes.
- **Phase 5:** ScreenCaptureKit permission/restart behavior, Windows.Graphics.Capture consent and device loss, overlay exclusion, protected content, HDR, and hide-and-capture flicker.
- **Phase 6:** direct notarized distribution versus App Store packaging, signing/notarization secrets, installer trust, and updater key lifecycle.

Phases with established patterns that can usually skip a separate research phase after the native contracts are fixed:

- **Phase 3:** retained scene plus Canvas 2D, preview layers, dirty-region redraw, and framework-independent TypeScript modules.
- **Phase 4:** command history, text/eraser interaction, settings storage, and scheduled expiry, provided the mode/state contract is already tested.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Mostly based on current official Tauri, Apple, Microsoft, Node, Vite, and testing documentation. Exact versions and Tauri transparency behavior still need a real cross-platform prototype. |
| Features | MEDIUM | Product documentation from Zoom, Epic Pen, ScreenBrush, ZoomIt, and Snipping Tool supports table stakes; prioritization is also grounded in the explicit nABrush brief, but no broad user study was available. |
| Architecture | MEDIUM | Platform APIs and established overlay patterns support the boundaries, while full-screen Spaces, exclusive surfaces, mixed DPI, and capture exclusion remain empirical behaviors. |
| Pitfalls | LOW | `PITFALLS.md` is missing. Risks are carefully inferred from the other three research files and should be independently checked during Phase 1/2/5 planning. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Missing independent pitfalls research:** create or recover `PITFALLS.md` before phase planning if possible; otherwise convert the risks above into spike acceptance tests and phase plan risks.
- **macOS distribution path:** decide whether direct signed/notarized DMG is acceptable or App Store support is mandatory. This determines whether Tauri's private transparency API can remain in the overlay path.
- **Supported OS and full-screen matrix:** define minimum macOS/Windows versions and explicitly classify borderless full-screen, native full-screen Spaces, Stage Manager, protected content, and exclusive graphics modes.
- **Capture behavior and permissions:** verify Screen Recording/Accessibility prompts, restart requirements, Windows picker/consent, protected surfaces, HDR, device loss, and whether capture can exclude the overlay without flicker.
- **Target-display and interaction defaults:** validate whether following the pointer, active window, or a user-pinned display best serves presenters; define default fade duration, toolbar placement, and shortcut defaults through usability checks.
- **Commercial scope:** paid features are intentionally undecided. Keep billing/accounts out of MVP and collect evidence before selecting presets, snapshots, spotlight, or other candidates for the paid tier.

## Sources

### Primary (HIGH confidence)

The research files classify most official documentation as MEDIUM because versions and platform behavior still need runtime validation. The underlying sources are nevertheless primary references for the APIs:

- [Tauri architecture](https://v2.tauri.app/concept/architecture/), [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/), [WebView API](https://v2.tauri.app/reference/javascript/api/namespacewebview/), and [global shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/) — shell, transparency, native bridge, permissions, and shortcuts.
- [Tauri distribution](https://v2.tauri.app/distribute/), [macOS signing/notarization](https://v2.tauri.app/distribute/sign/macos/), [Windows installer](https://v2.tauri.app/distribute/windows-installer/), and [GitHub Actions pipeline](https://v2.tauri.app/distribute/pipelines/github/) — packaging and release.
- [Microsoft layered windows](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features), [`RegisterHotKey`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey), [Per-Monitor DPI](https://learn.microsoft.com/en-us/windows/win32/hidpi/dpi-awareness-context), [`EnumDisplayMonitors`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors), and [Windows.Graphics.Capture](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture) — Windows overlay, input, monitor, DPI, and capture behavior.
- [Apple NSWindow collection behavior](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct), [`ignoresMouseEvents`](https://developer.apple.com/documentation/appkit/nswindow/ignoresmouseevents?language=objc), [NSScreen](https://developer.apple.com/documentation/appkit/nsscreen), [ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit), and [`SCScreenshotManager`](https://developer.apple.com/documentation/screencapturekit/scscreenshotmanager) — macOS windows, Spaces, displays, permissions, and capture.
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases), [Vite releases](https://vite.dev/releases), [Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D), and [Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — build/runtime and rendering guidance.

### Secondary (MEDIUM confidence)

- [Zoom annotation tools](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067931) — expected toolbar tools, vanishing ink, erasing, undo/redo, saving, and shortcuts.
- [Epic Pen features](https://epicpen.com/features) and [user guide](https://epicpen.com/userguide) — overlay workflows, tools, fading ink, screenshots, hotkeys, whiteboard, and cursor effects.
- [ScreenBrush App Store listing](https://apps.apple.com/us/app/screenbrush/id1233965871?mt=12) — presentation-oriented ghost mode, multiple displays, snapshots, export, and editing expectations.
- [Microsoft PowerToys ZoomIt](https://learn.microsoft.com/en-us/windows/powertoys/zoomit) and [Snipping Tool support](https://support.microsoft.com/en-US/windows/apps/use-snipping-tool-to-capture-screenshots) — Windows presentation shortcuts, drawing, multi-monitor behavior, and capture output.
- [web.dev OffscreenCanvas](https://web.dev/articles/offscreen-canvas) — optional worker-side rendering optimization for future scale.

### Tertiary (LOW confidence)

- No separate low-confidence source was used. The low confidence area is the missing `PITFALLS.md` artifact and the unvalidated inferences about difficult platform edge cases, rather than a specific external source.

---
*Research completed: 2026-09-09*  
*Ready for roadmap: yes*

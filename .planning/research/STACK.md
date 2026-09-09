# Technology Stack

**Project:** nABrush
**Researched:** 2026-09-09

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tauri | 2.11.x (current 2.x line) | Desktop shell, native windowing, IPC, bundling | Tauri gives us a small native process and a system WebView while still exposing Rust for the platform-specific overlay work. Its window API already covers transparent, always-on-top, click-through, focusability, monitor discovery, and per-platform config. |
| Rust | stable toolchain, pinned in `rust-toolchain.toml` | Native integration and application services | Rust is the right boundary for global shortcuts, screenshot capture, window styles, secure file export, and OS-specific code. The official global-shortcut plugin currently requires Rust 1.77.2 or newer. |
| React + TypeScript | React 19.x / TypeScript 5.x, exact versions pinned by lockfile | Toolbar, settings, tool selection, and application UI | The product has enough transient UI and settings to benefit from a mature component ecosystem. Keep the drawing engine in a framework-independent TypeScript module so React renders controls and state rather than owning pointer-level rendering. |
| Vite | 8.2.x supported line | Frontend dev server and production build | Tauri recommends Vite for SPA frontends. Vite 8 uses Rolldown and is the current supported line, with a fast dev loop and a straightforward static `frontendDist` build. |
| pnpm | current stable, pinned through Corepack | JavaScript package manager | Fast, deterministic installs and a lockfile that works well in CI. Use Corepack or a pinned package-manager version in CI. |
| Node.js | 24.x LTS | Frontend tooling and CI | Node 24 is the current LTS line in the project release table. Build tooling should use an Active or Maintenance LTS line, never an EOL runtime. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| None for MVP | — | — | The validated flow is transient annotation plus image export. Do not introduce a server or database before users ask for saved sessions, sync, or accounts. |
| Tauri Store plugin | 2.x | Local settings only | Store shortcut bindings, color/width preferences, fade duration, and last-used tool in a small local key-value file. Keep drawing sessions out of this store until persistence is an explicit requirement. |

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Actions | hosted macOS and Windows runners | Build, test, and release matrix | Tauri's official `tauri-action` workflow covers target builds and GitHub Releases. Run native tests on both OSes because overlay z-order and input behavior cannot be trusted from one platform. |
| Tauri bundler | 2.x | Installers and app bundles | Produce a signed `.dmg` for macOS and an NSIS setup executable for Windows. Generate MSI only if enterprise deployment or Microsoft Store requirements emerge; WiX/MSI builds require Windows. |
| Developer ID + notarization | Apple Developer ID | macOS direct downloads | macOS downloads need code signing, and direct distribution outside the App Store needs notarization. Store certificates and App Store Connect credentials only in CI secrets. |
| Windows code signing | Azure Artifact Signing or a managed OV/EV certificate | Installer trust | Signing reduces SmartScreen friction. Keep signing in a release job and never place a private certificate in the repository. |
| Tauri updater plugin | 2.x | Optional in-app updates | Enable after the first public release. The updater requires signed artifacts and HTTPS endpoints, so establish release keys and rotation procedures before turning it on. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tauri-apps/api` | 2.11.x | Typed window, event, monitor, path, and core APIs | Use this for normal frontend-to-native calls. Keep capability permissions explicit. |
| `@tauri-apps/plugin-global-shortcut` | 2.x | System-wide toggle and emergency-hide shortcuts | Register shortcuts only after the app is ready, report collisions to the user, and unregister on shutdown. |
| `@tauri-apps/plugin-dialog` | 2.x | Save-location and export dialogs | Use the native dialog for PNG export and permission-friendly UX. |
| `@tauri-apps/plugin-fs` | 2.x | Writing exported images to user-selected paths | Grant only the scopes needed for an explicit export. Do not expose unrestricted filesystem access to the webview. |
| `@tauri-apps/plugin-store` | 2.x | Local preferences | Persist user settings; debounce writes and version the settings schema. |
| `@tauri-apps/plugin-updater` | 2.x | Signed update checks and install | Add for public releases when signing and endpoint hosting are ready. |
| `windows` Rust crate | current stable, feature-gated | Windows.Graphics.Capture, virtual-screen metrics, Win32 window styles, and hotkey fallback | Add only the Windows target dependency and expose a small Rust command surface. Keep Win32/WinRT details out of the frontend. |
| Canvas 2D (`CanvasRenderingContext2D`) | platform WebView | Visible annotation rendering | Use a transparent canvas for the overlay. Keep a retained scene model of strokes and shapes, draw only dirty regions, and separate transient fading items from persistent items. |
| OffscreenCanvas | WebView capability | Optional worker-side raster work | Feature-detect it for large exports or heavy redraws. It is an optimization, not a required baseline for the MVP. |
| `@wdio/tauri-service` + WebdriverIO | current 9.x line | Cross-platform desktop E2E | Tauri's embedded WebDriver provider supports macOS and Windows; test the overlay lifecycle, hotkeys, click-through toggle, monitor sizing, and export flow. |
| Vitest | current supported line | Frontend unit/component tests | Use for scene reducers, undo/redo, stroke fading, coordinate transforms, and export composition helpers. Keep this layer independent from the desktop shell. |
| Rust `cargo test` | stable | Native unit tests | Cover monitor normalization, platform command validation, hotkey registration state, and serialization at the native boundary. |

## Native Platform Integration

Keep a narrow `platform` module behind Tauri commands and events. The frontend should request operations such as `set_overlay_mode`, `list_monitors`, `capture_background`, and `export_image`; it should not contain platform branches for window handles or permissions.

On macOS, use AppKit `NSWindow` configuration for the overlay: a transparent borderless window, a floating level appropriate for a presentation overlay, `canJoinAllSpaces`, and `canJoinAllApplications` or `fullScreenAuxiliary` when the product explicitly promises visibility over another app's full-screen Space. Tauri exposes much of this, but a small Swift/Objective-C plugin may be required for exact behavior on macOS versions. The Tauri WebView `transparent` option currently requires its `macos-private-api` feature; Tauri warns that private APIs can prevent App Store acceptance. Prototype window and WebView transparency early, and use direct signed/notarized DMG distribution if that tradeoff is accepted. If App Store submission becomes a hard requirement, treat Electron or a native AppKit overlay surface as a fallback decision.

For screenshot export on macOS, use ScreenCaptureKit and `SCScreenshotManager` for current systems. Apple marks `CGWindowListCreateImage` and `CGDisplayStream` as deprecated and warns that use can trigger content-capture alerts. Request Screen Recording permission only when the user chooses export, explain that capture is processed locally, and define a fallback when permission is denied. Capture the display without the overlay where possible, then composite the retained annotation scene into the captured image.

On Windows, use a top-level transparent layered window, `WS_EX_TRANSPARENT` or the equivalent Tauri click-through operation for interaction mode, and `RegisterHotKey` semantics through the Tauri global-shortcut plugin. Normalize monitor geometry from the virtual desktop, including negative coordinates and per-monitor DPI. For still capture, use `Windows.Graphics.Capture` where available; it has an explicit system picker and supports display/window snapshots. Keep DXGI Desktop Duplication as a lower-level option only if later performance requirements demand continuous capture.

The overlay has two native states. In drawing mode it accepts pointer input and keeps keyboard focus only as needed for text. In pass-through mode it remains visible but ignores cursor events and must not steal focus from the underlying application. Treat the transition as an atomic state change coordinated between the native window and the renderer; otherwise a fast hotkey press can leave a transparent window blocking clicks.

## Rendering and Data Model

Use a retained, serializable scene model even though Canvas 2D is immediate-mode. Each item should have an id, tool kind, points or geometry, style, creation time, and optional expiry time. Undo/redo stores scene commands or immutable snapshots, while the renderer maintains a spatial or bounding-box index for dirty redraws.

Render the stable scene and the currently active pointer stroke on separate transparent layers. Clear and redraw only affected bounds on pointer move; redraw the full scene only after resize, display-scale change, or a large structural edit. `requestAnimationFrame` drives fade animation. Use device-pixel dimensions for the canvas backing store and CSS/logical dimensions for pointer coordinates, converting through the current monitor scale factor.

Use Canvas 2D for the MVP because it handles freehand paths, arrows, shapes, text, alpha blending, and PNG export with low implementation risk. Keep rendering behind a small interface so WebGL or a native GPU renderer can be introduced if profiling shows the canvas cannot sustain the target scene size. SVG is useful for small editable diagrams but creates a DOM node per shape and complicates high-frequency freehand input; Skia/native rendering would increase the cross-platform bridge and export complexity without a demonstrated need.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Desktop shell | Tauri 2 + Rust | Electron + Electron Forge | Electron's BrowserWindow APIs are strong for transparent always-on-top windows, click-through, global shortcuts, and capture, but every install carries Chromium and Node. That increases download size, memory use, patch surface, and the amount of code handling process isolation. Keep Electron as a fallback if Tauri's native full-screen behavior cannot meet the acceptance tests. |
| Desktop shell | Tauri 2 + Rust | Wails | Wails is attractive for Go teams, but Tauri has the more direct Rust-native plugin ecosystem and documented macOS/Windows overlay controls needed here. |
| Desktop shell | Tauri 2 + Rust | Flutter or Qt | Both can deliver a desktop UI, but this product's hard part is native overlay/input/capture behavior, not widget rendering. They add a second rendering or licensing model and still require custom platform plugins. |
| UI framework | React + TypeScript | Svelte or Vue | Svelte and Vue are valid and can reduce UI ceremony, but React has the broadest component and testing ecosystem for the toolbar/settings surface. The canvas engine remains framework-independent, so switching later is contained. |
| Renderer | Canvas 2D with retained scene | SVG for every annotation | SVG makes individual objects easy to inspect, but high-frequency pointer updates create DOM churn and text/shape hit testing becomes coupled to the DOM. |
| Renderer | Canvas 2D with optional OffscreenCanvas | WebGL or Skia from day one | GPU paths are worthwhile for thousands of animated objects or advanced effects. They add shader, text, readback, and export complexity that the MVP does not justify. |
| Capture | ScreenCaptureKit / Windows.Graphics.Capture | Legacy Core Graphics or ad-hoc GDI capture | Apple has deprecated the old macOS capture functions; ad-hoc capture paths are fragile around permissions, HDR, protected content, and full-screen apps. |
| Windows installer | NSIS setup executable | MSI/WiX | MSI is valuable for enterprise deployment but is Windows-only to build and adds setup constraints. Add it as a second artifact when customer evidence requires it. |
| State persistence | Local settings store + in-memory scene | SQLite or cloud database | Sessions are explicitly out of MVP scope. A database creates schema, migration, and privacy obligations without helping the first value loop. |

## Installation

```bash
# Core frontend and Tauri
pnpm create vite . --template react-ts
pnpm add @tauri-apps/api @tauri-apps/plugin-global-shortcut \
  @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-store
pnpm add -D @tauri-apps/cli@^2 vite@^8.2 typescript

# Add these when the release workflow is introduced
pnpm add @tauri-apps/plugin-updater

# Test tooling
pnpm add -D vitest @testing-library/react @testing-library/user-event \
  @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter \
  @wdio/tauri-service

# Rust-side plugin dependencies are added from src-tauri
cargo add tauri-plugin-global-shortcut --target 'cfg(any(target_os = "macos", windows))'
cargo add tauri-plugin-dialog tauri-plugin-fs tauri-plugin-store
# Add on the Windows target only, with the Graphics_Capture and Win32 features
cargo add windows --target 'cfg(windows)'
```

Pin exact resolved versions in `pnpm-lock.yaml` and `Cargo.lock`. Keep `tauri`, `@tauri-apps/api`, CLI, and official plugins on compatible 2.x releases; upgrade them together in a deliberate maintenance change.

## Sources

- [Tauri 2 project creation and supported frontend templates](https://v2.tauri.app/start/create-project/) — MEDIUM confidence (verified websearch); official docs, current crawl.
- [Tauri Vite integration](https://v2.tauri.app/start/frontend/vite/) — MEDIUM confidence (verified websearch); official docs, Vite 8 guidance.
- [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) — MEDIUM confidence (verified websearch); official API reference for always-on-top, click-through, monitor scale, and window options.
- [Tauri WebView API](https://v2.tauri.app/reference/javascript/api/namespacewebview/) — MEDIUM confidence (verified websearch); official transparency and platform caveats.
- [Tauri global shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/) — MEDIUM confidence (verified websearch); official plugin docs and platform support.
- [Tauri plugin support table](https://v2.tauri.app/plugin/) — MEDIUM confidence (verified websearch); official plugin availability and Rust requirements.
- [Tauri distribution](https://v2.tauri.app/distribute/) — MEDIUM confidence (verified websearch); official bundling and signing overview.
- [Tauri macOS signing and notarization](https://v2.tauri.app/distribute/sign/macos/) — MEDIUM confidence (verified websearch); official release requirements.
- [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/) — MEDIUM confidence (verified websearch); official NSIS/MSI and cross-compilation notes.
- [Tauri GitHub Actions pipeline](https://v2.tauri.app/distribute/pipelines/github/) — MEDIUM confidence (verified websearch); official CI/release workflow.
- [Tauri updater](https://v2.tauri.app/plugin/updater/) — MEDIUM confidence (verified websearch); signed updater artifact and HTTPS requirements.
- [Tauri tests overview](https://v2.tauri.app/develop/tests/) — MEDIUM confidence (verified websearch); mock runtime and E2E support.
- [Tauri WebDriver testing](https://v2.tauri.app/develop/tests/webdriver/) — MEDIUM confidence (verified websearch); WebdriverIO service and macOS/Windows coverage.
- [Tauri current releases](https://v2.tauri.app/release/) — MEDIUM confidence (verified websearch); current 2.11.x ecosystem versions observed during research.
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window) — MEDIUM confidence (verified websearch); official API reference for transparent, always-on-top, click-through, and full-screen behavior.
- [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut/) — MEDIUM confidence (verified websearch); official API reference.
- [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer) — MEDIUM confidence (verified websearch); official API reference.
- [Electron Forge build lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle) — MEDIUM confidence (verified websearch); official packaging/signing workflow.
- [Apple NSWindow collection behavior](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct) — MEDIUM confidence (verified websearch); official full-screen, Spaces, and Stage Manager behavior.
- [Apple NSWindow levels](https://developer.apple.com/documentation/appkit/nswindow/level-swift.struct) — MEDIUM confidence (verified websearch); official z-order semantics.
- [Apple ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit) and [SCScreenshotManager](https://developer.apple.com/documentation/screencapturekit/scscreenshotmanager) — MEDIUM confidence (verified websearch); current screenshot APIs.
- [macOS 15 release notes](https://developer.apple.com/documentation/macOS-Release-Notes/macos-15-release-notes) — MEDIUM confidence (verified websearch); deprecation warning for legacy capture APIs.
- [Windows layered windows](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features) — MEDIUM confidence (verified websearch); official alpha and pass-through window behavior.
- [Windows RegisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey) — MEDIUM confidence (verified websearch); system-wide shortcut behavior.
- [Windows multiple-monitor metrics](https://learn.microsoft.com/en-us/windows/win32/gdi/multiple-monitor-system-metrics) — MEDIUM confidence (verified websearch); virtual desktop coordinate behavior.
- [Windows.Graphics.Capture screenshots](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture) — MEDIUM confidence (verified websearch); current display/window snapshot API.
- [web.dev OffscreenCanvas](https://web.dev/articles/offscreen-canvas) — MEDIUM confidence (verified websearch); Google web platform guidance for worker rendering.
- [MDN Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) and [canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — MEDIUM confidence (verified websearch); cross-browser API and performance guidance.
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases) — MEDIUM confidence (verified websearch); current LTS status.
- [Vite releases](https://vite.dev/releases) — MEDIUM confidence (verified websearch); supported Vite lines.

The code-classified provider tier for all fetches was MEDIUM (verified websearch). The linked official pages are primary sources within that tier; renderer recommendations that synthesize those APIs with project constraints remain MEDIUM until validated by a prototype on real multi-monitor/full-screen setups.

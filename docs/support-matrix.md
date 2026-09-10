# nABrush Phase 1 support matrix

This document is the release contract for the native overlay activation phase. It covers the primary display and the tray/background lifecycle only. It does not claim drawing tools, capture/export, persistence, billing, or multi-monitor topology support; those belong to later phases.

## Automated baseline

| Platform | Minimum baseline | WebView/runtime | Automated evidence |
| --- | --- | --- | --- |
| macOS | macOS 13 Ventura or newer | System WebKit | `.github/workflows/phase1.yml` job `macos-13`; `pnpm typecheck`, Vitest, Cargo tests, Tauri debug build, and `smoke:short` |
| Windows | Windows 10 22H2 or newer | WebView2 Evergreen | `.github/workflows/phase1.yml` job `windows-2022`; same commands as macOS |

The complete `smoke:matrix` suite runs after the short suite and native unit/build checks pass. The WebDriver configuration launches the debug Tauri executable through `@wdio/tauri-service` and keeps one worker so global shortcuts cannot race between sessions. Its mode transitions use a deterministic debug-only native action fixture; the device rows below remain the evidence for real global shortcut delivery and pointer behavior.

## Manual debug launch

From the repository root, run `pnpm tauri:dev` and keep the terminal process attached while reviewing the app. Look for the nABrush status item in the macOS menu bar or Windows notification area, open its menu, and exercise `Show` and `Hide`. Then focus a second application (TextEdit on macOS or Notepad on Windows) and invoke `Cmd/Ctrl+Shift+A` to verify cross-application activation.

The overlay and settings windows intentionally start hidden and do not create a normal document window. Closing either window hides it and leaves the background process running; only the tray `Quit` action exits the app. This is the expected tray-only lifecycle for D-01 and D-04.

The `src-tauri/target/debug/nabrush` executable is the raw WebDriver/debug binary used by automation. It does not provide a macOS app bundle or Dock identity for manual UAT, so use the documented `pnpm tauri:dev` path as the review entry point.

Record the following evidence for each available device:

- [ ] nABrush status-item icon is visible in the menu bar or notification area.
- [ ] `Show` and `Hide` from the tray menu change overlay visibility without quitting the process.
- [ ] `Cmd/Ctrl+Shift+A` activates the overlay while the second application has focus.
- [ ] Observed app/process state is recorded, including the intentional absence of a normal document window.

## Phase 1 acceptance contract

The operator verifies that the app starts without a normal document window, remains available from the tray, and activates on the configurable Cmd/Ctrl+Shift+A binding while another app is focused. Drawing mode accepts overlay input; click-through sends pointer input to the underlying app and retains the global shortcut service; bare Escape hides the overlay. Closing settings hides the settings window and leaves the background process alive. A conflicting shortcut keeps the previous binding and exposes a replacement suggestion. Overlay initialization failures are fail-closed and expose Retry (and, where applicable, Open System Settings).

Pointer delivery is recorded against concrete fixtures: macOS TextEdit with a known text target, and Windows Notepad with a known text target. With click-through enabled, the operator clicks the target and records whether the target app received focus/input.

## Device evidence

| Device | OS version | Text fixture | Tray/activation | Drawing/click-through/Escape | Close-to-hide | Recovery | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| macOS device | Pending (13+) | TextEdit, known text target | Pending | Pending | Pending | Pending | Attach screen recording or test log here |
| Windows device | Pending (10 22H2+) | Notepad, known text target | Pending | Pending | Pending | Pending | Attach screen recording or test log here |

## Platform limitations and distribution

The app enables Tauri `macOSPrivateApi` for transparent, always-on-top overlay behavior. macOS direct distribution therefore requires a Developer ID signed and notarized build; the setting is not a claim of App Store eligibility. Spaces, Stage Manager, and native full-screen behavior must be checked on a real macOS device. Exclusive full-screen games or protected surfaces may prevent an overlay from appearing or receiving input. On Windows, borderless full-screen is the supported observation target; exclusive full-screen can place the app below the display compositor. Permission-denied or protected-content outcomes are recorded as limitations rather than treated as successful support.

The primary-display contract intentionally leaves multi-monitor placement, drawing/rendering tools, screenshot capture/export, session persistence, and billing outside Phase 1.

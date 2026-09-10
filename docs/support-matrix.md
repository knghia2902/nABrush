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

- [x] nABrush status-item icon is visible in the menu bar or notification area on macOS and Windows.
- [x] `Show` and `Hide` from the tray menu change overlay visibility without quitting the process on macOS and Windows.
- [x] `Cmd/Ctrl+Shift+A` activates the overlay while the second application has focus on macOS and Windows.
- [x] The tray-only app/process state and intentional absence of a normal document window were confirmed on both platforms.

## Phase 1 acceptance contract

The operator verifies that the app starts without a normal document window, remains available from the tray, and activates on the configurable Cmd/Ctrl+Shift+A binding while another app is focused. Drawing mode accepts overlay input; click-through sends pointer input to the underlying app and retains the global shortcut service; bare Escape hides the overlay. Closing settings hides the settings window and leaves the background process alive. A conflicting shortcut keeps the previous binding and exposes a replacement suggestion. Overlay initialization failures are fail-closed and expose Retry (and, where applicable, Open System Settings).

Pointer delivery is recorded against concrete fixtures: macOS TextEdit with a known text target, and Windows Notepad with a known text target. With click-through enabled, the operator clicks the target and records whether the target app received focus/input.

## Device evidence

| Device | OS version | Text fixture | Tray/activation | Drawing/click-through/Escape | Close-to-hide | Recovery | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| macOS device | Version not recorded | TextEdit, known text target | Pass | Pass | Pass | Pass | Manual UAT recorded in `01-UAT.md` |
| Windows device | Version not recorded | Notepad, known text target | Pass (user-confirmed) | Pass (user-confirmed) | Pass (user-confirmed) | Pass (user-confirmed) | User confirmation recorded in `01-VERIFICATION.md`; no separate log attached |

## Platform limitations and distribution

The app enables Tauri `macOSPrivateApi` for transparent, always-on-top overlay behavior. macOS direct distribution therefore requires a Developer ID signed and notarized build; the setting is not a claim of App Store eligibility. Spaces, Stage Manager, and native full-screen behavior must be checked on a real macOS device. Exclusive full-screen games or protected surfaces may prevent an overlay from appearing or receiving input. On Windows, borderless full-screen is the supported observation target; exclusive full-screen can place the app below the display compositor. Permission-denied or protected-content outcomes are recorded as limitations rather than treated as successful support.

The primary-display contract intentionally leaves multi-monitor placement, drawing/rendering tools, screenshot capture/export, session persistence, and billing outside Phase 1.

## Phase 2 display topology and parity contract

The Phase 2 automated baseline runs the same Rust, frontend, debug-build, and
`phase2-matrix` WebDriver checks on macOS 13+ and Windows 10 22H2+. Fixture
results prove descriptor reconciliation and shared parity values; they do not
replace physical display evidence or compositor testing.

| Behavior | macOS 13+ | Windows 10 22H2+ | Evidence boundary |
| --- | --- | --- | --- |
| Mixed-DPI placement | Manual hardware evidence required | Manual hardware evidence required | Two displays with independent scale factors |
| Negative origin | Manual hardware evidence required | Manual hardware evidence required | Place one display left or above the native origin |
| Rotation | Manual hardware evidence required | Manual hardware evidence required | Rotate one display while the overlay is visible |
| Hot-plug and DPI/size change | Manual hardware evidence required | Manual hardware evidence required | Add/remove and reconfigure without restart |
| Borderless/native full-screen | Supported when the compositor admits the overlay; verify manually | Supported for borderless observation targets; verify manually | Native full-screen app on a physical device |
| Exclusive full-screen | Limited or Unsupported when the Space/compositor blocks the overlay | Limited or Unsupported when the compositor owns the surface | Never infer support from always-on-top alone |
| Global mode parity | Automated fixture plus manual shortcut evidence | Automated fixture plus manual shortcut evidence | `Show`, `Hide`, click-through, and `Esc` on both OSes |
| Tool-order contract parity | Automated `platform_parity_contract` comparison | Automated `platform_parity_contract` comparison | Exact ordered TypeScript/Rust fixture |
| Export-semantics contract parity | Automated fixture comparison | Automated fixture comparison | One canonical composition pass at display density |
| Scene retention after display removal | Automated fixture plus manual reappearance evidence | Automated fixture plus manual reappearance evidence | Scene ID/items survive removal and re-add |
| Protected/permission/compositor failure | Supported recovery path; scene remains alive | Supported recovery path; scene remains alive | Scoped actionable error and Retry evidence |

### Phase 2 device evidence

Record each physical run with the OS version, display arrangement, observed
classification, and an evidence location. Keep exclusive full-screen as
**Limited** or **Unsupported** whenever the compositor prevents the overlay.

| OS/device | OS version | Display arrangement and test | Result (Supported/Limited/Unsupported) | Evidence |
| --- | --- | --- | --- | --- |
| macOS device | Pending manual run | Mixed-DPI, negative origin, rotation, hot-plug, borderless/native full-screen, exclusive full-screen | Pending manual run | Pending `02-04` evidence reference |
| Windows device | Pending manual run | Mixed-DPI, negative origin, rotation, hot-plug, borderless/native full-screen, exclusive full-screen | Pending manual run | Pending `02-04` evidence reference |

The following rows are intentionally manual-only until dated device evidence is
recorded: mixed-DPI, negative-origin alignment, rotation, hot-plug and
DPI/size changes, borderless/native full-screen persistence, exclusive
full-screen limitation, global mode parity across displays, and recovery from a
blocked or protected surface. Do not claim Windows DISP-02 through DISP-04
completion from macOS results or automated fixtures alone.

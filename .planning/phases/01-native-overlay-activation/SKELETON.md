# Walking Skeleton — nABrush

**Phase:** 1
**Generated:** 2026-09-09

## Capability Proven End-to-End

> A presenter can launch nABrush from the menu bar or system tray, press Cmd/Ctrl+Shift+A while another app is focused, see a transparent primary-display overlay enter drawing mode, switch it to click-through, and press Esc to hide it while the in-memory scene remains available.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Tauri 2.11.x with Rust, React 19, TypeScript, and Vite | Keeps the process small while giving Rust ownership of native windowing, shortcuts, tray lifecycle, and platform adapters; React renders controls and state. |
| Data layer | No database; Rust owns lifecycle/mode state and the webview owns a retained in-memory scene contract | The MVP is local-first and transient. A database would add persistence obligations before saved sessions are required. The scene survives hide/show within the running process. |
| Auth | None | nABrush performs local annotation and does not require an account or server. |
| Deployment target | Local `pnpm tauri dev` and debug builds during Phase 1; signed direct distribution is resolved in Phase 6 | The walking skeleton proves the desktop runtime before packaging and signing decisions are finalized. |
| Directory layout | `src/` for React UI/state/types; `src-tauri/src/` for controller, shortcut registry, and platform adapters; `tests/e2e/` for desktop smoke checks; `docs/` for support evidence | Separates native responsibilities from renderer state and gives later phases stable extension points. |

## Stack Touched in Phase 1

- [x] Project scaffold (Tauri, Rust, React, Vite, TypeScript, test scripts)
- [x] Desktop entry/lifecycle — tray/menu-bar surface and explicit Quit
- [x] Native overlay — one primary-display transparent, borderless, topmost window
- [x] UI — mode badge/cursor feedback wired to typed native events
- [x] Verification — local build commands, desktop smoke configuration, and macOS/Windows manual matrix
- [ ] Database — intentionally absent; local in-memory state is the Phase 1 data contract

## Out of Scope (Deferred to Later Slices)

> These boundaries prevent later phases from re-litigating the walking skeleton.

- Multi-monitor overlays, mixed-DPI/orientation transforms, negative origins, and topology reconciliation — Phase 2.
- Pen, highlighter, lines, arrows, rectangles, ellipses, text, and eraser — Phase 3.
- Undo/redo, clear, persistent/vanishing ink, style memory, and full settings persistence — Phase 4.
- Screen capture, region selection, PNG composition, clipboard, capture permissions, and local save dialogs — Phase 5.
- Signing, notarization, installers, updater, release support matrix expansion, and launch-at-login packaging — Phase 6.
- Accounts, billing, cloud sync, collaboration, recording, AI/OCR, snapshots, spotlight, cursor halo, stylus pressure, and document whiteboard — outside the v1 boundary or deferred.

## Subsequent Slice Plan

Each later phase adds a vertical slice on top of the native lifecycle and typed mode contract without replacing its architectural decisions:

- Phase 2: Reconcile one overlay per connected display using canonical desktop coordinates, mixed-DPI transforms, rotation, negative origins, and supported full-screen behavior.
- Phase 3: Add the retained Canvas scene and core annotation tools over the trusted overlay viewport.
- Phase 4: Add command history, text/eraser, persistent and vanishing ink, per-tool style memory, and full settings controls.
- Phase 5: Capture the underlying display/region, composite the retained scene once, and export locally to PNG or clipboard.
- Phase 6: Package, sign, document, and release the validated macOS and Windows builds.

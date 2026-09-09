# Phase 1: Native Overlay & Activation - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the native overlay harness and safe activation lifecycle. A user can launch nABrush from the menu bar/system tray, toggle a transparent full-screen overlay on the primary display with global shortcuts, draw through an interactive mode, pass pointer input through in click-through mode, and hide every overlay urgently without losing the in-memory scene. Multi-monitor topology, drawing tools, ink lifecycle, and export remain in later phases.

</domain>

<decisions>
## Implementation Decisions

### Khởi động và kích hoạt
- **D-01:** nABrush starts in the background with the overlay hidden.
- **D-02:** The default overlay toggle shortcut is `⌘/Ctrl + Shift + A`.
- **D-03:** The shortcut registry is configurable; the default must be replaceable by the user.
- **D-04:** Closing the settings window or toolbar hides that UI while the app continues running from the menu bar/system tray. Only an explicit Quit action exits the process.
- **D-05:** Launch at login is off by default and can be enabled in settings.

### Chuyển chế độ an toàn
- **D-06:** Use separate shortcuts for overlay visibility, click-through, and emergency hide instead of cycling several states through one key.
- **D-07:** All user-facing shortcuts, including click-through and an alternate emergency shortcut, are configurable.
- **D-08:** Show a small corner badge and cursor feedback when the mode changes; the badge may auto-hide and must stay out of exported output.
- **D-09:** Click-through is a global state applied atomically to every overlay surface, with global shortcuts still active.
- **D-10:** `Esc` is always available as an emergency hide shortcut. It immediately hides every overlay, preserves the current in-memory scene, and may have a second configurable emergency shortcut.

### Phạm vi overlay Phase 1
- **D-11:** The Phase 1 harness targets the primary display only; Phase 2 owns all connected-display topology and per-monitor reconciliation.
- **D-12:** The harness uses one transparent, borderless, topmost native window covering the full primary display.
- **D-13:** Toggling the overlay from hidden enters drawing mode immediately.
- **D-14:** With no annotations, the overlay is fully transparent and does not dim or tint the underlying content.

### Lỗi và khôi phục
- **D-15:** Missing permissions, shortcut conflicts, and overlay initialization failures are reported through a lightweight notification plus persistent state in the menu bar/system tray; avoid blocking modal dialogs during presentation.
- **D-16:** If a shortcut conflicts, reject the new registration, preserve the last working shortcut, and suggest choosing another key.
- **D-17:** If an overlay cannot initialize, keep the app running in the background with overlays hidden, retain the current scene, and offer an explicit retry.
- **D-18:** Error badges provide contextual `Retry` and, where relevant, `Open System Settings` actions.

### the agent's Discretion
- Exact secondary shortcut defaults, provided they are documented, conflict-checked, and configurable.
- Exact badge placement, animation, auto-hide duration, and cursor treatment, provided the feedback is visible without obscuring presentation content.
- Native window flags, IPC command names, tray icon artwork, and platform-specific error wording within the behavior above.
- Harness test fixtures and the minimum OS versions used for Phase 1 validation, subject to the documented support matrix and real-device checks.

</decisions>

<specifics>
## Specific Ideas

- The interaction should feel like ScreenBrush: press a shortcut while another application is focused, annotate directly over it, and return control to the underlying application without clearing marks.
- The first visible surface should be a completely transparent full-screen overlay on the primary display, with only a small temporary mode badge and cursor feedback.
- The app should feel like a menu-bar/system-tray utility rather than a normal document window.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project contract and scope
- `.planning/PROJECT.md` — core value, platform constraints, local-first boundary, and key product decisions.
- `.planning/REQUIREMENTS.md` — OVLY-01 through OVLY-05 and the full v1 boundary.
- `.planning/ROADMAP.md` §Phase 1 — phase goal, success criteria, dependencies, and research flags.
- `.planning/STATE.md` — current project focus and recorded platform concerns.

### Research and platform risks
- `.planning/research/SUMMARY.md` — synthesized stack, feature, architecture, and risk guidance.
- `.planning/research/ARCHITECTURE.md` — native overlay boundaries, state machine, and per-platform window behavior.
- `.planning/research/STACK.md` — Tauri/Rust/React stack and platform API recommendations.
- `.planning/research/PITFALLS.md` — failure modes for z-order, click-through, permissions, and recovery.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet. The repository is a greenfield project containing planning artifacts only.

### Established Patterns
- Planning documents establish a Tauri 2 + Rust native boundary, React/TypeScript UI, retained scene model, and one native overlay per display for later phases.

### Integration Points
- Phase 1 will create the initial Tauri/Rust shell, tray/menu-bar lifecycle, global shortcut service, native overlay adapter, and typed events/commands that later phases extend for display topology and annotation state.

</code_context>

<deferred>
## Deferred Ideas

- Multi-monitor overlay reconciliation and mixed-DPI/orientation support — Phase 2.
- Cursor halo, spotlight, magnifier, stylus pressure, snapshots, and presentation presets — v2 or later.
- Billing, accounts, cloud sync, collaboration, recording, AI/OCR, and document-style whiteboard — outside v1.

</deferred>

---

*Phase: 01-native-overlay-activation*
*Context gathered: 2026-09-09*

# Feature Landscape

**Domain:** Cross-platform desktop screen annotation overlay
**Researched:** 2026-09-09
**Overall confidence:** MEDIUM

## Table Stakes

Features users expect from a credible screen annotation tool. Missing any of the first group makes the product feel incomplete for a presentation or lesson.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Global activation and a clear mode switch | The presenter must start annotating without leaving the slide, browser, or application | Med | Support a global shortcut for overlay on/off and a separate pointer/click-through state. Show the current state in a compact toolbar, tray/menu-bar icon, and a transient on-screen hint. |
| Transparent overlay over any application | The product's basic promise is to draw over slides, video, browsers, design tools, and code | High | Keep the overlay above normal windows, including presentation/full-screen workflows where the OS permits it. The overlay must not alter the underlying application. |
| Pointer/click-through mode | Users must be able to return to the app underneath while leaving ink visible | High | Make pointer mode explicit and reversible. A keyboard hold or toggle can be a fast path, but a visible toggle is needed to prevent accidental input capture. |
| Freehand pen | Handwritten emphasis is the primary presentation action | Med | Use low-latency stroke rendering, smoothing, and a sensible default width. Keep stroke endpoints and joins clean at different display scales. |
| Highlighter | Presenters need to emphasize text or regions while keeping the content readable | Med | Use semi-transparent, color-managed strokes with a separate width from the pen. Provide a small set of high-contrast defaults. |
| Lines, arrows, rectangles, and ellipses | Precise callouts are expected in teaching, demos, and bug reports | Med | Create shapes by drag, preview while dragging, and preserve them as editable objects. Arrowheads need a predictable size and orientation. |
| Text annotation | Labels and short explanations are needed when a mark alone is ambiguous | Med | Click-to-place or drag-to-size, then type. Escape cancels editing; a clear commit action prevents accidental text. Remember font size, color, and alignment. |
| Eraser and clear | Live presenters need to correct one mark or wipe the board quickly | Med | Support stroke/object erasing plus clear-all. Clear-all should have a keyboard shortcut and an undoable command, with a brief confirmation state for accidental activation. |
| Undo and redo | A single bad stroke must not force a presenter to restart | Med | Use platform conventions (Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z or the platform redo equivalent). Make clear-all and object edits participate in the same history. |
| Color and stroke controls | The annotation must remain legible over light and dark content | Low | Offer a compact palette, custom color, opacity, and width. Remember settings per tool so switching from pen to highlighter does not destroy a chosen style. |
| Persistent and vanishing ink modes | Teaching calls for temporary emphasis; diagramming calls for marks that stay | Med | Let the user choose persistent ink or a configurable fade duration. Make the active mode obvious and apply the lifecycle per stroke/object. |
| Screenshot/export of the composed screen | The stated v1 output is a shareable annotated image | High | Capture the underlying display plus annotations while excluding the nABrush toolbar and controls. Support full display and selected region first; save to a chosen path and copy to clipboard. |
| Multi-monitor targeting | Presenters commonly keep notes or controls on one display and content on another | High | Overlay instances and hit testing must work on every connected display. Follow the pointer/active window or let the user choose the target. Handle mixed resolutions, DPI/scaling, orientation, and negative coordinates. |
| Full-screen and display topology behavior | Full-screen slides and video are the highest-value presentation scenarios | High | Recreate overlay coverage when a window enters or leaves full-screen, a display is connected/disconnected, or a virtual desktop/Space changes. Surface platform permission requirements early. |
| Tray/menu-bar lifecycle and startup settings | A utility tool should be available without occupying a normal application window | Low | Launch to tray/menu bar, expose show/hide, mode, screenshot, and settings actions, and remember harmless preferences such as last tool and colors. |
| Configurable shortcuts | Fixed shortcuts collide with presentation software and keyboard layouts | Med | Let users rebind activation, pointer mode, each common tool, undo/redo, clear, screenshot, and fade mode. Detect conflicts and provide a reset-to-default action. |
| Privacy-first local capture | Screen contents can contain confidential material | Med | Keep strokes, compositing, and exports local by default. Explain macOS Screen Recording/Accessibility permissions in the first-run flow and offer a clear recovery path when permission is denied. |

These expectations are consistent across Zoom's annotation toolbar, Epic Pen's overlay and screenshot workflow, ScreenBrush's Mac feature set, and Microsoft's ZoomIt/Snipping Tool capture model. The confidence is **MEDIUM** because the evidence is product documentation and release notes rather than a broad user study.

## Differentiators

Features that can make nABrush notably better for presenters and teachers. They should be staged behind a stable core loop.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-platform behavioral parity | A user who teaches or demos from both macOS and Windows does not have to relearn modes, shortcuts, or export behavior | High | Treat parity as a product feature: same tool order, shortcut concepts, mode indicators, and output semantics. Hide platform-specific permission mechanics behind the same recovery UX. |
| Reliable ghost/click-through mode | Keeps the overlay visually present while allowing normal app interaction, reducing mode mistakes during a live demo | High | This is a strong nABrush differentiator because it directly solves the most disruptive presentation failure. Add unmistakable pointer-mode feedback and a safe escape shortcut. |
| Cursor halo, spotlight, and flashlight/magnifier | Directs an audience's attention without adding permanent ink | Med | Cursor halo is a lightweight follow-on. Spotlight and magnifier are valuable for teaching but need careful handling of scaling, pointer tracking, and capture behavior. |
| Whiteboard/blackboard mode | Provides a clean surface when screen content is distracting or when explaining a concept from scratch | Med | Make it a temporary overlay state with a quick return to the original screen. Keep it separate from a full document/whiteboard product. |
| Pressure-sensitive pen and touch support | Stylus input feels natural for teachers and tablet users | High | Support pressure where the platform and device expose it, with a mouse fallback. Test palm rejection and multi-touch separately; do not make pressure a prerequisite for the core workflow. |
| Selectable/editable annotation objects | Lets presenters move a label, resize a shape, or correct a diagram without erasing nearby marks | High | Requires a selection tool, hit testing, z-order rules, and object-aware history. Valuable after the basic stroke model is reliable. |
| Snapshot or slide-like recall | A teacher can clear the screen and restore a prior explanation instantly | High | A local snapshot panel is more useful than cloud sync for v1 users who teach. It can begin as a small bounded history and later gain named snapshots and export. |
| Numbered callouts and quick badges | Makes step-by-step instruction clearer than repeated freehand numbers | Low | A small set of keyboard-triggered badges is a high-value, low-scope addition once the overlay and shortcut system exist. |
| Presentation presets | One shortcut can load a preferred palette, widths, fade duration, cursor effect, and target display | Med | Save presets locally and make them importable/exportable later. This also creates a potential paid power-user feature without blocking free use. |
| One-action capture paths | Copy annotated display, save to a default folder, or choose a region without opening a full editor | Med | Optimize for the teaching loop. Exports should have deterministic filenames and preserve pixel density; offer PNG first and add PDF only when there is a demonstrated need. |
| Stylus-friendly and accessible controls | Users can present from a pen display, trackpad, keyboard, or assistive setup | Med | Keyboard equivalents, visible focus, non-color state indicators, configurable toolbar size, and adequate hit targets matter more than decorative UI. |

## Anti-Features

Features to explicitly avoid in the initial product because they dilute the validated job or add disproportionate risk.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cloud accounts and automatic session sync | Screen content is sensitive, and a backend adds authentication, storage, conflict handling, and trust cost before the core workflow is proven | Keep annotations and exports local. Add explicit export/import of local snapshots only if users ask for persistence. |
| Real-time collaborative annotation | Collaboration changes the product into a meeting/whiteboard system and requires identity, transport, conflict resolution, and moderation | Optimize one presenter annotating a local screen or screen share. Integrate with existing meeting software through ordinary screen sharing. |
| Screen recording and video editing | Recording introduces heavy capture, audio, codecs, performance, privacy, and timeline scope; it is a separate job from live marking | Export still images in v1. Consider a lightweight recording companion only after annotation retention and performance are validated. |
| AI drawing, OCR, or automatic summaries | AI adds latency, data handling, model cost, and unpredictable behavior to a tool whose value is immediate manual emphasis | Keep the marks deterministic. Revisit OCR or shape recognition as a focused, opt-in enhancement. |
| Full screenshot editor with frames, backgrounds, blur, and publishing | It competes with mature screenshot editors and distracts from live overlay reliability | Capture the composed screen and provide clean PNG/clipboard output. Add basic redaction only when a concrete privacy workflow requires it. |
| Remote clicker and mobile companion | Useful for some presenters, but introduces pairing, networking, and app-store surface area | Make keyboard shortcuts and the tray/menu-bar utility excellent first. Reassess a companion after user demand is clear. |
| Unlimited document-style whiteboard | A persistent canvas, pages, autosave, and search create a second product with different navigation and storage needs | Keep whiteboard mode ephemeral and bounded. Use local snapshots if recall is needed. |
| Hidden mode changes and modifier-only critical actions | A presenter may not know whether the app is intercepting clicks or drawing; accidental marks and missed clicks are costly in public demos | Provide a visible state indicator, a universal escape/pointer shortcut, and a short first-run tutorial. Modifiers may be fast paths, never the only path. |

## Feature Dependencies

```text
Platform permissions + global hotkeys
  → overlay lifecycle and display topology
  → explicit draw / pointer / click-through modes
  → tool input and style controls
  → object/stroke model
  → undo/redo, erase, clear, and fade lifecycle
  → screenshot compositor and clipboard/file export

Display enumeration + DPI/orientation tracking
  → per-monitor overlays and target selection
  → correct hit testing and stroke coordinates
  → correct full-screen capture and export

Stable shortcut registry
  → tool switching, clear, screenshot, fade toggle, cursor effects
  → presets and future presentation integrations

Stable local annotation model
  → editable objects, snapshots, restore, and future import/export
```

## MVP Recommendation

Prioritize:

1. **Fast, visible overlay control:** global activation, explicit draw/pointer/click-through modes, tray/menu-bar lifecycle, configurable shortcuts, and permission guidance.
2. **Complete annotation loop:** pen, highlighter, line, arrow, rectangle, ellipse, text, eraser, clear, undo/redo, and per-tool color/width/opacity.
3. **Two ink lifecycles:** persistent marks plus per-stroke vanishing ink with a user-set duration and a clear active-mode indicator.
4. **Trustworthy output:** capture the annotated display or selected region to PNG and clipboard, without toolbar artifacts, with correct scaling.
5. **Cross-platform display quality:** all connected displays, full-screen applications, mixed DPI/orientation, low-latency rendering, and graceful handling of macOS Accessibility/Screen Recording permissions and Windows overlay constraints.

Defer cursor halo, spotlight/magnifier, whiteboard/blackboard, pressure-sensitive stylus, badges/timers, editable selection, and snapshots to the first post-MVP release unless early interviews show one is essential to adoption. Defer cloud sync, real-time collaboration, recording, AI/OCR, remote control, and a full screenshot editor until usage data supports their cost.

The MVP success test should be observable: a new user can launch the utility, activate it from a full-screen or secondary-display presentation, mark a target with the pen or arrow, switch back to interacting with the underlying app, and export a clean image in one short flow. Measure activation-to-first-stroke time, accidental input capture, dropped/offset strokes, export success, and crashes during display changes before adding breadth.

## UX Details That Matter

- Make the current state unambiguous: a compact toolbar plus tray/menu-bar state should say whether nABrush is drawing, pointer/click-through, paused, or exporting. A visible cursor/tool affordance should follow the state.
- Keep the first action near the user's pointer or active window. On multiple displays, either follow the pointer by default or let the user pin a target; do not silently draw on a different monitor.
- Design every tool as a short gesture: select tool, drag, release. Show a live preview for shapes and arrows, and make Escape cancel the in-progress object without changing existing marks.
- Keep the toolbar out of the capture and away from the audience's focal content. Allow it to move to another display or collapse while shortcuts remain active.
- Use consistent modifier behavior across macOS and Windows. Offer editable shortcuts, conflict detection, and a reset action; avoid making Fn or another hardware-specific key the only route to click-through.
- Give pen and highlighter separate remembered styles. A small palette should include colors that remain legible on both light and dark backgrounds; pair color with width, opacity, or icon cues so state is not color-only.
- Make erasing forgiving: show the eraser size, erase complete strokes/objects predictably, and keep erase and clear operations undoable. Do not force a presenter to hunt through a settings panel to clear the board.
- Treat fade as a first-class mode. Show the duration in the toolbar, let the user change it quickly, and keep a newly fading mark undoable until its lifecycle completes or explicitly document the behavior.
- Text needs an obvious editing boundary. Provide font size and color controls, commit on a deliberate action or click away, and preserve the text object so a typo can be edited when selection arrives.
- Exports should default to a useful local destination and clipboard copy, use predictable names, and preserve the display's pixel density. Include annotations in the composition while excluding controls and transient cursor halos unless the user chooses otherwise.
- Explain permissions in plain language before asking for them. If a permission or full-screen limitation prevents drawing, show the exact recovery action and maintain a safe pointer mode rather than failing silently.
- Keep the core path local and account-free. Privacy is part of the product promise when the screen can contain student data, source code, customer information, or confidential slides.

## Sources

- [Zoom: Using annotation tools for collaboration](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067931) — toolbar, vanishing pen, erase, undo/redo, save formats, and shortcuts. **Confidence: MEDIUM**.
- [Epic Pen: Features](https://epicpen.com/features) and [User Guide](https://epicpen.com/userguide) — overlay, pen/highlighter, screenshots, hotkeys, text, shapes, fading ink, whiteboard, cursor halo, and eraser. **Confidence: MEDIUM**.
- [ScreenBrush App Store listing and release notes](https://apps.apple.com/us/app/screenbrush/id1233965871?mt=12) — Ghost Mode, click-through, snapshots, multiple screens, flashlight/magnifier, editable drawings, export, shortcuts, and presentation-oriented features. **Confidence: MEDIUM**.
- [Microsoft PowerToys ZoomIt](https://learn.microsoft.com/en-us/windows/powertoys/zoomit) — presentation hotkeys, drawing, screenshots, full-screen/region capture, clipboard/file output, and multi-monitor DemoMirror behavior. **Confidence: HIGH** for documented Windows behavior.
- [Microsoft Snipping Tool support](https://support.microsoft.com/en-US/windows/apps/use-snipping-tool-to-capture-screenshots) — rectangle, window, full-screen, freeform capture and clipboard/save workflow. **Confidence: HIGH** for documented Windows behavior.

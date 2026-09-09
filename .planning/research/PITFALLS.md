# Project Research: Pitfalls

**Project:** nABrush  
**Domain:** Cross-platform desktop screen annotation overlay  
**Researched:** 2026-09-09

## Critical Pitfalls

### 1. Assuming `alwaysOnTop` equals full-screen support

- **Warning signs:** Overlay disappears in macOS Spaces, Stage Manager, native full-screen, or Windows exclusive full-screen.
- **Prevention:** Build a platform harness in Phase 1 and maintain a support matrix for borderless, native, protected, and exclusive full-screen surfaces.
- **Phase:** 1 and 6

### 2. Treating the virtual desktop as one undifferentiated canvas

- **Warning signs:** Strokes shift on negative monitor coordinates, rotated displays, mixed DPI, or after a monitor is added/removed.
- **Prevention:** Use one native overlay per monitor and canonical desktop coordinates with explicit pixel transforms.
- **Phase:** 2

### 3. Implementing click-through only in the web renderer

- **Warning signs:** The underlying app cannot receive clicks, pointer capture remains stuck, or one monitor changes mode while another does not.
- **Prevention:** Change native hit testing, focus, and renderer state atomically across every overlay; keep an emergency-hide shortcut active.
- **Phase:** 1 and 4

### 4. Capturing the overlay as the export source

- **Warning signs:** Export contains duplicate marks, toolbar controls, missing annotations, or flicker while the overlay is hidden for capture.
- **Prevention:** Capture the underlying display or region and composite retained annotations explicitly with the same coordinate transform.
- **Phase:** 5

### 5. Making low-level event hooks the default shortcut mechanism

- **Warning signs:** Extra accessibility permissions, shortcut latency, conflicts with presentation software, or input events leaking to the app below.
- **Prevention:** Start with the dedicated global-shortcut API; add event taps only for a capability that cannot be implemented otherwise.
- **Phase:** 1 and 4

### 6. Using raster snapshots as the annotation model

- **Warning signs:** Undo/redo consumes large memory, text and shapes cannot be edited, fading is imprecise, and display migration loses quality.
- **Prevention:** Store semantic annotation objects and command history; render persistent and transient layers separately.
- **Phase:** 3 and 4

### 7. Ignoring permission and protected-content failure paths

- **Warning signs:** Blank captures, crashes after a permission change, or silent export failures on protected windows.
- **Prevention:** Report permission state, explain recovery/restart steps, handle unsupported targets and device loss, and keep capture local.
- **Phase:** 1 and 5

### 8. Packaging before resolving transparency and signing constraints

- **Warning signs:** Direct downloads work while App Store packaging fails, or unsigned installers trigger OS warnings.
- **Prevention:** Decide the macOS distribution path early; produce signed/notarized DMG and signed Windows installers only after behavior is validated.
- **Phase:** 6

## Validation Checklist

- [ ] Two monitors with different DPI, orientation, and negative virtual coordinates
- [ ] Monitor add/remove/rotation while overlay is active
- [ ] macOS Spaces, Stage Manager, and native full-screen
- [ ] Windows borderless and exclusive full-screen behavior
- [ ] Click-through transition while a pointer is captured
- [ ] Screen Recording/Accessibility denied, revoked, and restored
- [ ] Protected or unavailable capture targets
- [ ] Export with toolbar hidden and annotations composited exactly once
- [ ] Idle CPU/battery usage with persistent and fading ink

---
*Pitfalls research completed: 2026-09-09*

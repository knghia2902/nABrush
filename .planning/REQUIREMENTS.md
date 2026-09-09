# Requirements: nABrush

**Defined:** 2026-09-09  
**Core Value:** Người dùng có thể đánh dấu rõ ràng bất kỳ nội dung nào trên màn hình trong vài giây mà không phải rời khỏi ứng dụng đang dùng.

## v1 Requirements

Requirements for the initial cross-platform release. Each requirement is user-centric, atomic, and testable.

### Overlay and Activation

- [ ] **OVLY-01**: User can launch nABrush and keep it available from a macOS menu bar or Windows system tray entry.
- [ ] **OVLY-02**: User can toggle the drawing overlay on or off with a configurable global keyboard shortcut while another app is focused.
- [ ] **OVLY-03**: User can switch between drawing mode, which captures pointer input, and click-through mode, which passes pointer input to the app underneath.
- [ ] **OVLY-04**: User can trigger an emergency hide action that removes every overlay without clearing the annotation scene.
- [ ] **OVLY-05**: User can see the current overlay mode and capture/permission errors through an indicator that is not included in exported images.

### Display and Platform Support

- [ ] **DISP-01**: User sees an overlay on every connected display with correct placement for each display's resolution, orientation, scale factor, and negative desktop coordinates.
- [ ] **DISP-02**: User can draw while a supported application is in full-screen or borderless full-screen mode on macOS and Windows.
- [ ] **DISP-03**: User can add, remove, rotate, or reconfigure a display while nABrush is running and have overlays reconcile without restarting the app.
- [ ] **DISP-04**: User can use the same shortcut concepts, tool order, mode feedback, and export behavior on macOS and Windows.

### Drawing Tools

- [ ] **DRAW-01**: User can draw freehand strokes with configurable color, opacity, and width.
- [ ] **DRAW-02**: User can draw a semi-transparent highlighter stroke with configurable color, opacity, and width.
- [ ] **DRAW-03**: User can draw straight lines and arrows with configurable color, opacity, and width.
- [ ] **DRAW-04**: User can draw rectangles and ellipses with configurable stroke and fill/opacity settings.
- [ ] **DRAW-05**: User can create, edit, commit, or cancel a text annotation with configurable color and text size.
- [ ] **DRAW-06**: User can erase an annotation using an eraser tool without affecting unrelated annotations.

### Editing and Ink Lifecycle

- [ ] **EDIT-01**: User can undo and redo each drawing, text, erase, and clear operation in order.
- [ ] **EDIT-02**: User can clear all annotations from the active scene with an undoable action.
- [ ] **EDIT-03**: User can choose persistent ink that remains visible until explicitly erased or cleared.
- [ ] **EDIT-04**: User can choose vanishing ink and configure its fade duration in seconds.
- [ ] **EDIT-05**: User can see which ink lifecycle mode is active and can change it without losing existing annotations.
- [ ] **EDIT-06**: User's selected color, width, opacity, and text size are remembered per tool during the current app session.

### Capture and Export

- [ ] **EXPT-01**: User can export the full annotated display as a PNG with annotations composited exactly once and without the toolbar or mode indicator.
- [ ] **EXPT-02**: User can select a screen region and export that annotated region as a PNG at the display's pixel density.
- [ ] **EXPT-03**: User can copy the composed annotated display or region to the system clipboard.
- [ ] **EXPT-04**: User receives a clear recovery message when screen-capture permission is denied, revoked, unavailable, or blocked by protected content.
- [ ] **EXPT-05**: User can choose the destination path through a native save dialog, and nABrush writes the PNG locally without requiring an account or cloud service.

### Release Quality

- [ ] **RELS-01**: User can install a signed macOS build and a signed Windows build through documented direct-download installers.
- [ ] **RELS-02**: User can follow documented supported OS, full-screen, display, permission, and shortcut limitations for the released build.
- [ ] **RELS-03**: User can recover from a failed overlay, permission change, or display topology change using the emergency hide/restart guidance without losing the running app's data unexpectedly.

## User Stories

- As a presenter, I can underline and point at content in any app without switching away from the presentation.
- As a teacher, I can leave a persistent diagram on screen or let temporary marks fade automatically.
- As a user explaining a bug, I can annotate a region and copy or export a clean image for sharing.
- As a multi-monitor user, I can draw on the intended display even when monitors have different sizes and scaling.

## v2 Requirements

Deferred until the local v1 loop is validated.

### Presentation Enhancements

- **PRES-01**: User can show a cursor halo, spotlight, or magnifier during a presentation.
- **PRES-02**: User can use pressure-sensitive stylus/touch input and presentation presets.
- **PRES-03**: User can save and recall local snapshots or selectable/editable annotation objects.

### Collaboration and Advanced Output

- **COLL-01**: User can sync annotation sessions through a cloud account.
- **COLL-02**: User can collaborate on annotations in real time.
- **OUTP-01**: User can record, edit, and export annotated screen video.
- **OUTP-02**: User can use AI/OCR to extract or summarize screen content.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile or remote-clicker companion | The first release is desktop-first for live screen interaction. |
| Real-time collaboration | Adds accounts, synchronization, conflict handling, and privacy work before the core loop is validated. |
| Cloud session sync | Local-first export is sufficient for v1 and avoids making a backend a dependency. |
| Full screenshot editor or document-style whiteboard | The product's core value is overlay annotation, not replacing an image editor or whiteboard app. |
| Screen video recording and editing | Image export covers the confirmed output need; video is a later product decision. |
| AI/OCR features | Not required to validate fast, reliable manual annotation. |
| Billing, accounts, and paid-tier enforcement | Paid features are intentionally undecided and should follow usage evidence after the free core ships. |

## Definition of Done

- The core loop works on a clean macOS machine and a clean Windows machine using signed installers.
- Automated unit tests cover coordinate transforms, scene operations, command history, expiry scheduling, and export composition.
- Cross-platform end-to-end checks cover global activation, click-through, multi-monitor placement, full-screen behavior, permission failures, and PNG/clipboard output.
- Manual verification confirms the toolbar is excluded from exports, annotations are composited once, and the emergency hide path restores control to the underlying application.

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OVLY-01 | Phase 1 | Pending |
| OVLY-02 | Phase 1 | Pending |
| OVLY-03 | Phase 1 | Pending |
| OVLY-04 | Phase 1 | Pending |
| OVLY-05 | Phase 5 | Pending |
| DISP-01 | Phase 2 | Pending |
| DISP-02 | Phase 2 | Pending |
| DISP-03 | Phase 2 | Pending |
| DISP-04 | Phase 2 | Pending |
| DRAW-01 | Phase 3 | Pending |
| DRAW-02 | Phase 3 | Pending |
| DRAW-03 | Phase 3 | Pending |
| DRAW-04 | Phase 3 | Pending |
| DRAW-05 | Phase 3 | Pending |
| DRAW-06 | Phase 3 | Pending |
| EDIT-01 | Phase 4 | Pending |
| EDIT-02 | Phase 4 | Pending |
| EDIT-03 | Phase 4 | Pending |
| EDIT-04 | Phase 4 | Pending |
| EDIT-05 | Phase 4 | Pending |
| EDIT-06 | Phase 4 | Pending |
| EXPT-01 | Phase 5 | Pending |
| EXPT-02 | Phase 5 | Pending |
| EXPT-03 | Phase 5 | Pending |
| EXPT-04 | Phase 5 | Pending |
| EXPT-05 | Phase 5 | Pending |
| RELS-01 | Phase 6 | Pending |
| RELS-02 | Phase 6 | Pending |
| RELS-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-09*  
*Last updated: 2026-09-09 after roadmap creation*

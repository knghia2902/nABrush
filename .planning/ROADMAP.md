# Roadmap: nABrush

## Overview

nABrush sẽ được xây theo sáu lát dọc, mỗi lát hoàn thiện một năng lực người dùng có thể kiểm chứng trên macOS và Windows. Trước tiên là overlay native và điều khiển an toàn, sau đó là tọa độ đa màn hình, bộ công cụ chú thích, chỉnh sửa/vòng đời nét, xuất ảnh cục bộ, rồi đóng gói phát hành có chữ ký. Các phase giữ scene chú thích trong bộ nhớ và local-first; billing, tài khoản, cloud, cộng tác, quay video và AI nằm ngoài v1.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Native Overlay & Activation** - Khởi chạy từ tray/menu bar, bật overlay bằng phím tắt và chuyển đổi vẽ/click-through an toàn. (completed 2026-09-10)
- [ ] **Phase 2: Display Topology & Platform Parity** - Hiển thị đúng trên mọi màn hình, mixed-DPI, full-screen và thay đổi topology.
- [ ] **Phase 3: Core Annotation Tools** - Vẽ bút, highlight, đường, mũi tên, hình dạng và chữ trên scene giữ lại.
- [ ] **Phase 4: Editing & Ink Lifecycle** - Hoàn tác, tẩy, xóa, style theo tool và nét persistent/vanishing.
- [ ] **Phase 5: Capture & Export** - Chụp nền, ghép annotation chính xác và xuất PNG/clipboard cục bộ.
- [ ] **Phase 6: Signed Release Hardening** - Đóng gói, ký, kiểm thử hồi phục và tài liệu giới hạn hỗ trợ cho hai hệ điều hành.

## Phase Details

### Phase 1: Native Overlay & Activation

**Goal**: Người dùng có thể khởi chạy nABrush từ menu bar/system tray, bật overlay trên ứng dụng đang dùng và chuyển đổi an toàn giữa vẽ, click-through và ẩn khẩn cấp.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: OVLY-01, OVLY-02, OVLY-03, OVLY-04
**Plans:** 11/11 plans complete
Plans:

- [x] 01-08-PLAN.md
- [x] 01-09-PLAN.md

**Wave 1**

- [x] 01-01-PLAN.md — Reviewed frontend scaffold and pinned Rust toolchain

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Tray-to-primary-overlay activation tracer and lifecycle fixture

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Explicit mode contract and retained-scene emergency fixture

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Settings rebinding UI, transactional shortcuts, and launch-at-login opt-in

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Native hit-testing adapters and mode feedback

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-06-PLAN.md — Recoverable error states and non-modal retry UI

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 01-07-PLAN.md — Cross-platform smoke tests, CI matrix, and support evidence

**Success Criteria** (what must be TRUE):

  1. User can launch nABrush and keep it available from the macOS menu bar or Windows system tray without a normal application window taking over the presentation.
  2. User can configure and invoke a global shortcut while another app is focused to toggle the overlay on or off.
  3. User can switch all overlay surfaces between drawing mode and click-through mode, and the underlying app receives pointer input in click-through mode while annotations remain visible.
  4. User can trigger emergency hide to remove every visible overlay and later restore the same annotation scene.

**Research flags/spikes**: Validate macOS transparent borderless windows, `macos-private-api`, Spaces/Stage Manager/full-screen auxiliary behavior, Windows layered-window z-order/hit testing, shortcut conflicts, and the minimum supported OS matrix. Keep native hit testing and renderer state in one explicit state transition.
**UI hint**: yes

### Phase 2: Display Topology & Platform Parity

**Goal**: Người dùng có thể thấy và vẽ đúng trên mọi màn hình kết nối, kể cả mixed-DPI, xoay màn hình, tọa độ desktop âm và các ứng dụng full-screen được hỗ trợ trên macOS và Windows.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04
**Plans:** 5 plans
Plans:

- [ ] 02-01-PLAN.md — Canonical display model, viewport tracer, and topology coalescing
- [ ] 02-02-PLAN.md — Multi-display registry, asynchronous windows, and shared scene boundary
- [ ] 02-03-PLAN.md — Per-display canvas transforms and parity feedback UI
- [ ] 02-04-PLAN.md — Native platform observers, E2E matrix, and support evidence
- [ ] 02-05-PLAN.md — Shared shortcut, tool-order, and export-semantics parity contract

**Wave 1**

- [ ] 02-01-PLAN.md — Canonical display model, viewport tracer, and topology coalescing

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-02-PLAN.md — Multi-display registry, asynchronous windows, and shared scene boundary

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03-PLAN.md — Per-display canvas transforms and parity feedback UI

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 02-05-PLAN.md — Shared shortcut, tool-order, and export-semantics parity contract

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 02-04-PLAN.md — Native platform observers, E2E matrix, and support evidence

**Success Criteria** (what must be TRUE):

  1. User sees an overlay on every connected display with marks aligned to each display's resolution, orientation, scale factor, and negative desktop coordinates.
  2. User can draw over supported macOS and Windows full-screen or borderless full-screen applications without the overlay shifting or disappearing within the documented support matrix.
  3. User can add, remove, rotate, or reconfigure a display while nABrush is running and the overlays reconcile without restarting or losing the current scene.
  4. User encounters the same shortcut concepts, tool order, mode feedback, and export semantics on macOS and Windows, with only platform-specific permission wording differing.

**Research flags/spikes**: Test canonical top-left desktop coordinates, AppKit backing conversion, Windows Per-Monitor V2 DPI, negative origins, rotations, and topology event timing on real two-display hardware. Record borderless, native full-screen, Stage Manager/Spaces, protected, and exclusive-full-screen outcomes.
**Plans**: TBD

### Phase 3: Core Annotation Tools

**Goal**: Người dùng có thể tạo các chú thích cơ bản nhanh và mượt trên scene overlay bằng chuột hoặc bàn phím điều khiển.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06
**Success Criteria** (what must be TRUE):

  1. User can draw freehand pen and semi-transparent highlighter strokes with independent color, opacity, and width settings.
  2. User can drag to create straight lines and arrows with configurable color, opacity, and width, seeing a preview before committing.
  3. User can drag to create rectangles and ellipses with configurable stroke and fill/opacity settings.
  4. User can place text, edit it, commit it deliberately, or cancel it without changing existing annotations, with configurable color and text size.
  5. User can use an eraser to remove one selected annotation without affecting unrelated annotations.

**Plans:** 1/4 plans executed
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Pen/highlighter tracer, typed scene validation, toolbar and per-tool styles

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 03-02-PLAN.md — Line/arrow and rectangle/ellipse geometry tools with preview and fill styles

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 03-03-PLAN.md — Text draft lifecycle, canonical hit-testing and single-item eraser

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 03-04-PLAN.md — Native tool smoke suite and validation traceability

### Phase 4: Editing & Ink Lifecycle

**Goal**: Người dùng có thể sửa scene nhanh và kiểm soát việc annotation tồn tại bao lâu trong khi giữ được style quen thuộc theo từng tool.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06
**Success Criteria** (what must be TRUE):

  1. User can undo and redo each drawing, text, erase, and clear operation in the original order.
  2. User can clear all annotations with one undoable action and restore them through undo.
  3. User can choose persistent ink that stays visible until explicitly erased or cleared.
  4. User can choose vanishing ink, set its fade duration in seconds, and observe marks fade and disappear deterministically.
  5. User can see and change the active ink lifecycle mode without losing existing annotations, and selected color, width, opacity, and text size are remembered per tool during the session.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Capture & Export

**Goal**: Người dùng có thể tạo một ảnh PNG sạch từ display hoặc vùng đã chọn, chứa annotation đúng một lần và lưu/copy hoàn toàn cục bộ.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: OVLY-05, EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05
**Success Criteria** (what must be TRUE):

  1. User can export a full annotated display as a PNG where annotations are composited exactly once and the toolbar, mode indicator, and other overlay chrome are absent.
  2. User can select a screen region and export that annotated region as a PNG at the display's pixel density.
  3. User can copy either the composed display or selected region to the system clipboard.
  4. User receives a clear, actionable recovery message when capture permission is denied, revoked, unavailable, or blocked by protected content; the current mode and error indicator remain visible in the app UI but are excluded from the output.
  5. User can choose a destination through a native save dialog and nABrush writes the PNG locally without an account or cloud service.

**Research flags/spikes**: Validate ScreenCaptureKit permission/restart behavior, Windows.Graphics.Capture consent/device loss, protected content, HDR and large outputs, overlay exclusion, and hide-and-capture flicker fallback. Capture the underlying surface and re-render the retained scene through the canonical coordinate transform.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Signed Release Hardening

**Goal**: Người dùng có thể cài đặt và khôi phục nABrush từ các bản phát hành có chữ ký, với giới hạn hỗ trợ và hướng dẫn xử lý lỗi rõ ràng trên macOS và Windows.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: RELS-01, RELS-02, RELS-03
**Success Criteria** (what must be TRUE):

  1. User can install a signed macOS build and a signed Windows build from documented direct-download installers.
  2. User can follow release documentation describing supported OS versions, full-screen/display behavior, permissions, and shortcut limitations.
  3. User can recover from an overlay failure, permission change, or display topology change using emergency hide/restart guidance without unexpected loss of running app data.

**Research flags/spikes**: Resolve direct signed/notarized DMG versus App Store packaging, Tauri transparency implications, Windows installer/signing choice, CI secret handling, and updater key readiness before enabling updates. Keep exclusive-full-screen behavior explicit in the support matrix.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Native Overlay & Activation | 11/11 | Complete    | 2026-09-10 |
| 2. Display Topology & Platform Parity | 0/TBD | Not started | - |
| 3. Core Annotation Tools | 1/4 | In Progress|  |
| 4. Editing & Ink Lifecycle | 0/TBD | Not started | - |
| 5. Capture & Export | 0/TBD | Not started | - |
| 6. Signed Release Hardening | 0/TBD | Not started | - |

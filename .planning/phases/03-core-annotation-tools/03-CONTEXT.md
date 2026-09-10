# Phase 3: Core Annotation Tools - Context

**Gathered:** 2026-09-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 mở rộng overlay scene dùng chung thành bộ công cụ annotation cốt lõi: pen,
highlighter, line, arrow, rectangle, ellipse, text và eraser. Người dùng phải chọn
tool trên toolbar, chỉnh thuộc tính theo từng tool, thấy nét/hình đang tạo ngay trong
lúc kéo, tạo text nháp có commit hoặc hủy rõ ràng, và xóa từng annotation với preview
trước khi xóa. Mọi item vẫn nằm trong một scene canonical dùng chung cho các viewport
trên macOS và Windows.

Phase này bao phủ DRAW-01 đến DRAW-06. Undo/redo, chỉnh sửa text đã commit, lifecycle
persistent/vanishing, capture và export thuộc các phase sau.

</domain>

<decisions>
## Implementation Decisions

### Bảng tool và thuộc tính

- **D-01:** Toolbar luôn hiển thị trong chế độ vẽ và đặt ở cạnh dưới màn hình. Toolbar
  là UI chrome, không phải scene item và không được đi vào export.
- **D-02:** Click một lần để chọn tool; tool được chọn tiếp tục áp dụng cho các nét
  tiếp theo.
- **D-03:** Toolbar giữ gọn; click nút thuộc tính sẽ mở một bảng nhỏ cho tool đang
  chọn thay vì luôn phơi tất cả control.
- **D-04:** Màu, opacity, width, fill và cỡ chữ được nhớ riêng theo từng tool trong
  phiên chạy hiện tại. Không cần đưa session style vào cloud hay database.
- **D-05:** Nét mặc định phải thon hơn hiện tại, đặc biệt với pen, line, arrow và
  outline; người dùng vẫn có thể chỉnh width. Con số width mặc định cụ thể để kế
  hoạch xác định và kiểm tra bằng preview trực quan.

### Nét và hình học

- **D-06:** Pointer path đang hoạt động được render trong transient preview theo thời
  gian thực; chỉ commit vào retained scene khi thao tác hợp lệ kết thúc.
- **D-07:** Kéo line, arrow, rectangle hoặc ellipse dưới ngưỡng nhỏ không tạo item.
- **D-08:** Arrow dùng đầu mũi tên tam giác đặc, gọn và dễ nhìn.
- **D-09:** Rectangle và ellipse có lựa chọn fill riêng và giữ style riêng theo từng
  tool; stroke, fill và opacity đều là thuộc tính của shape tương ứng.
- **D-10:** Nhấn `Esc` hoặc kết thúc thao tác ngoài vùng overlay sẽ hủy preview hiện
  tại, không thay đổi scene đã có.

### Text

- **D-11:** Click một điểm trên canvas sẽ đặt con trỏ text tại điểm đó và bắt đầu nhập
  ngay, không yêu cầu kéo khung trước.
- **D-12:** `Enter` commit text nháp, `Shift + Enter` chèn dòng mới, và `Esc` hủy
  text nháp. Hủy không được thay đổi các annotation hiện có.
- **D-13:** Phase 3 chỉ cho phép chỉnh text trước khi commit. Chỉnh text đã commit
  được để Phase 4 cùng với selection/editing sâu hơn.

### Eraser

- **D-14:** Eraser dùng click để xóa đúng một annotation; thao tác kéo không xóa
  hàng loạt.
- **D-15:** Khi annotation chồng lên nhau, eraser chọn item được tạo sau cùng (item
  nằm trên cùng).
- **D-16:** Hit-area phụ thuộc loại item: stroke bắt theo đường tâm cộng vùng đệm;
  shape bắt theo vùng fill hoặc viền; text bắt theo khung chữ.
- **D-17:** Khi rê chuột bằng eraser, item mục tiêu được highlight trước; click mới
  thực hiện xóa.

### the agent's Discretion

- Chọn giá trị số cụ thể cho width/opacity mặc định, ngưỡng kéo tối thiểu và bán kính
  hit-test, miễn giữ đúng yêu cầu nét mảnh và dễ thao tác.
- Chọn màu mặc định, opacity fill mặc định, kiểu highlight preview và chi tiết hình
  học nội bộ của đầu mũi tên trong khuôn khổ đầu tam giác đặc.
- Chọn cách trình bày bảng thuộc tính nhỏ, kích thước toolbar, khoảng cách cạnh dưới,
  focus/accessibility treatment và cách toolbar ẩn ngoài chế độ vẽ, miễn toolbar
  không chặn click-through hoặc lọt vào scene/export.
- Chọn mô hình editor tạm thời phù hợp với hành vi bàn phím đã khóa; không mở rộng
  thành editor cho text đã commit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope and requirements

- `.planning/PROJECT.md` — core value, platform boundary, local-first constraint and
  retained annotation scene.
- `.planning/REQUIREMENTS.md` — DRAW-01 through DRAW-06, Definition of Done, and
  later-phase boundaries for editing, lifecycle and export.
- `.planning/ROADMAP.md` §Phase 3 — phase goal, dependencies, success criteria and
  requirement mapping.
- `.planning/STATE.md` — accumulated decisions and current workflow state.

### Prior overlay and parity contracts

- `.planning/phases/01-native-overlay-activation/01-CONTEXT.md` — activation modes,
  emergency hide, click-through safety and retained scene expectations.
- `.planning/phases/02-display-topology-platform-parity/02-CONTEXT.md` — one overlay
  per display, shared canonical scene, coordinate/scaling rules and topology behavior.
- `.planning/phases/02-display-topology-platform-parity/02-UI-SPEC.md` — manual CSS
  baseline, per-display overlay contract, scene-excluded chrome and Vietnamese UI copy.
- `.planning/phases/02-display-topology-platform-parity/02-DISCUSSION-LOG.md` — source
  discussion for topology and the deferred live-preview decision.
- `.planning/phases/02-display-topology-platform-parity/02-05-PLAN.md` — shared tool
  order and platform-neutral parity vocabulary.

### Architecture and risk guidance

- `.planning/research/ARCHITECTURE.md` — native/webview boundary, retained scene and
  viewport rendering model.
- `.planning/research/STACK.md` — Tauri, React/TypeScript and Canvas 2D stack.
- `.planning/research/PITFALLS.md` — overlay input, z-order, coordinate and rendering
  failure modes.
- `.planning/research/SUMMARY.md` — synthesized research decisions and risks.

### Current implementation surfaces

- `src/App.tsx` — scene/bootstrap hydration, mode and viewport events, and current
  native commit path.
- `src/components/OverlaySurface.tsx` — DPR canvas, canonical/viewport transforms,
  pointer capture and existing transient stroke preview.
- `src/components/overlay-surface.test.tsx` — current renderer and realtime-preview
  test seam.
- `src/types/overlay.ts` — overlay mode, viewport and current SceneItem wire types.
- `src/types/platform-parity.ts` — locked ordered `TOOL_ORDER` and parity contract.
- `src/types/platform-parity-schema.json` — checked-in cross-platform tool vocabulary.
- `src-tauri/src/overlay_registry.rs` — retained SceneStore, scene validation,
  viewport registry and scene broadcast.
- `src-tauri/src/main.rs` — Tauri commands, managed scene state and command registry.
- `.planning/debug/stroke-not-realtime.md` — prior investigation and resolution of the
  pointer-preview redraw issue; use it to avoid regressing realtime feedback.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/components/OverlaySurface.tsx` already provides `viewportSize`, DPR-backed
  canvas sizing, canonical/viewport transforms, pointer capture and a transient stroke
  preview state. Extend this renderer instead of introducing a second canvas path.
- `src/types/platform-parity.ts` and `src/types/platform-parity-schema.json` already
  expose the exact shared tool order: `pen`, `highlighter`, `line`, `arrow`,
  `rectangle`, `ellipse`, `text`, `eraser`.
- `ModeBadge`, `ErrorBadge` and the existing manual CSS establish scene-excluded chrome,
  pointer-event conventions and Vietnamese UI styling.

### Established Patterns

- All display viewports render one shared semantic scene in canonical desktop logical
  coordinates; new items must not become display-local documents.
- `VisibleInteractive` captures pointer input while `VisibleClickThrough` is controlled
  atomically by the native adapter. Toolbar controls must respect this separation.
- The frontend receives `scene-changed` snapshots, while Rust `SceneStore` validates
  and retains items before broadcasting. Scene operations should preserve this
  idempotent, snapshot-based synchronization pattern.
- The current canvas renderer only draws stroke items and uses a transient layer for
  active input. Shapes, text, styles, hit-testing and eraser preview are new retained
  scene capabilities, not existing payloads to silently reinterpret.

### Integration Points

- `App.tsx` currently passes `scene`, `mode` and `viewport` to `OverlaySurface` and only
  exposes `onCommitStroke`. Phase 3 must connect tool/style state, draft text, shape
  previews and erase operations to this path.
- `src/types/overlay.ts` currently gives shape/text only `{ id, kind }`; it needs typed
  payloads for geometry, style and text while preserving Rust-compatible serialization.
- `src-tauri/src/overlay_registry.rs` currently accepts generic JSON scene items and
  validates kind/finite numbers. Commit and erase mutations must keep validation,
  stable IDs, whole-scene snapshots and broadcast behavior intact.
- `src-tauri/src/main.rs` owns the scene commands and Tauri handler registration; any
  new scene mutation command must be registered there and covered by native tests.
- The transparent `main` surface uses `pointer-events: none` with explicit interactive
  descendants. The toolbar/property popover must explicitly opt into pointer events
  without intercepting the underlying app in click-through mode.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly needs the active stroke to be visible in realtime while the
  pointer moves, not only after releasing the mouse. Preserve the transient preview
  layer and commit on completion.
- The user wants the drawing line to be thinner than the current visual default. Treat
  this as a visible product preference, not a request to remove configurability.
- The intended feel remains a lightweight ScreenBrush-like presenter annotation tool:
  choose a tool quickly, mark content without leaving the underlying application, and
  keep the scene available across overlay mode changes.

</specifics>

<deferred>
## Deferred Ideas

- Editing text after it has been committed and general object selection/editing —
  Phase 4.
- Undo/redo, clear-all and bulk erasing — Phase 4.
- Persistent/vanishing ink lifecycle controls and per-session setting persistence as a
  broader editing workflow — Phase 4.
- Capture, composition and PNG/clipboard export — Phase 5.
- Stylus pressure, snapshots, collaboration, cloud sync, AI/OCR and document-style
  whiteboard behavior — v2 or outside the product boundary.

</deferred>

---

*Phase: 03-core-annotation-tools*
*Context gathered: 2026-09-10*

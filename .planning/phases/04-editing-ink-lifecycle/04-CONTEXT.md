# Phase 4: Editing & Ink Lifecycle - Context

**Gathered:** 2026-09-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 bổ sung vòng đời chỉnh sửa cho scene annotation hiện có: undo/redo theo
từng thao tác, clear-all có thể hoàn tác, lifecycle Persistent/Vanishing với thời
lượng fade cấu hình được, hiển thị và thay đổi lifecycle hiện tại, cùng việc ghi
nhớ style theo từng tool trong phiên chạy. Phase này giữ nguyên scene dùng chung
trên các viewport macOS/Windows và không mở rộng sang cloud sync, cộng tác, quay
video, editor ảnh hay document-style whiteboard.

</domain>

<decisions>
## Implementation Decisions

### Undo/Redo

- **D-01:** Mỗi thao tác tạo hoặc thay đổi scene là một history entry riêng: một nét
  vẽ, một text được tạo/commit, di chuyển text đã commit, xóa một item và clear-all.
  Click ra ngoài khung text để commit cũng tạo đúng một entry tạo text.
- **D-02:** Khi người dùng Undo rồi thực hiện thao tác mới, nhánh Redo cũ bị xóa.
- **D-03:** Undo dùng `Cmd/Ctrl+Z`; Redo dùng `Ctrl+Y`. Toolbar luôn có nút Undo và
  Redo, disabled khi stack tương ứng rỗng.
- **D-04:** Undo/Redo tác động lên scene canonical dùng chung, không tạo history
  riêng theo từng display.

### Lifecycle semantics

- **D-05:** Chuyển giữa Persistent và Vanishing chỉ ảnh hưởng annotation tạo sau
  thời điểm chuyển. Annotation cũ giữ nguyên lifecycle, không bị thay đổi hoặc mất.
- **D-06:** Vanishing áp dụng cho mọi loại annotation được tạo trong phase, gồm pen,
  highlighter, line, arrow, rectangle, ellipse và text.
- **D-07:** Thời lượng Vanishing có các preset nhanh `1 / 3 / 5 / 10 / 30` giây và
  cho phép nhập số giây tùy chọn.
- **D-08:** Với thời lượng đã chọn, annotation giữ rõ gần hết thời lượng và fade
  trong 1 giây cuối trước khi bị loại khỏi scene.

### Fade timing and history

- **D-09:** Mỗi annotation Vanishing có timer độc lập, bắt đầu khi annotation được
  commit; các annotation tạo khác thời điểm không ảnh hưởng lẫn nhau.
- **D-10:** Timer vẫn chạy khi overlay bị ẩn hoặc chuyển sang click-through. Khi mở
  lại, annotation đã hết hạn không xuất hiện trở lại một cách tự động.
- **D-11:** Hết hạn không tạo thêm một history entry. Annotation đã hết hạn vẫn có
  thể được khôi phục bằng Undo thao tác tạo tương ứng.
- **D-12:** Đổi thời lượng chỉ áp dụng cho annotation mới; annotation đang fade giữ
  thời lượng đã snapshot lúc tạo.

### Control surface and text interaction

- **D-13:** Nút Undo/Redo nằm ở đầu toolbar, luôn nhìn thấy.
- **D-14:** Nút lifecycle nhỏ luôn hiện trên toolbar và hiển thị `Persistent` hoặc
  `Vanishing`.
- **D-15:** Khi chọn Vanishing, bộ chọn thời lượng hiện cạnh nút lifecycle, gồm preset
  và ô nhập số giây.
- **D-16:** Toolbar tiếp tục kéo di chuyển được. Toolbar và popover phải được clamp
  trong viewport, giữ control gọn và có tooltip khi cần.
- **D-17:** Text nháp commit bằng `Enter` hoặc click ra ngoài khung nhập; `Shift+Enter`
  chèn dòng mới và `Esc` hủy. Hành vi click ngoài không được vô tình tạo thêm một
  text draft thứ hai trong cùng thao tác.

### the agent's Discretion

- Chọn nơi lưu history (frontend hay native boundary), dạng command/snapshot và cách
  đồng bộ history với scene-changed, miễn giữ thứ tự thao tác và scene dùng chung.
- Chọn giới hạn hợp lệ, validation và cách trình bày ô nhập số giây ngoài các preset.
- Chọn curve/animation nội bộ để đạt trạng thái rõ gần hết thời lượng và fade trong
  giây cuối, cùng lịch scheduling không làm nghẽn render.
- Chọn glyph, màu trạng thái, kích thước cụ thể và chi tiết accessibility của các
  control mới trong giới hạn toolbar hiện tại.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope and phase contract

- `.planning/PROJECT.md` — core value, local-first boundary, platform scope and
  retained scene model.
- `.planning/REQUIREMENTS.md` — EDIT-01 through EDIT-06, Definition of Done and
  boundaries for capture/export and later features.
- `.planning/ROADMAP.md` §Phase 4 — phase goal, requirements and success criteria.
- `.planning/STATE.md` — accumulated cross-phase decisions and current workflow state.

### Prior phase decisions and research

- `.planning/phases/03-core-annotation-tools/03-CONTEXT.md` — tool vocabulary, per-tool
  style memory, realtime transient rendering, text keyboard behavior and Phase 4
  editing boundary.
- `.planning/phases/02-display-topology-platform-parity/02-CONTEXT.md` — shared
  canonical scene, viewport model and cross-platform overlay behavior.
- `.planning/research/ARCHITECTURE.md` — retained scene/native boundary and snapshot
  synchronization model.
- `.planning/research/STACK.md` — Tauri, Rust, React/TypeScript and test stack.
- `.planning/research/PITFALLS.md` — overlay input, rendering and lifecycle risks.
- `.planning/research/SUMMARY.md` — synthesized architecture and risk guidance.

### Current implementation surfaces

- `src/state/annotation.ts` — per-tool style state, text draft transitions, text bounds
  and scene hit-testing helpers.
- `src/types/overlay.ts` — typed scene item, style, viewport and snapshot wire models.
- `src/App.tsx` — scene hydration, scene-changed subscription and native scene command
  integration.
- `src/components/AnnotationToolbar.tsx` — draggable toolbar, property popover and
  per-tool style controls.
- `src/components/OverlaySurface.tsx` — retained/transient canvas rendering, pointer
  gestures, text draft editor and committed text movement.
- `src-tauri/src/overlay_registry.rs` — validated `SceneStore`, typed scene items,
  clear/erase operations and scene snapshots.
- `src-tauri/src/main.rs` — Tauri command boundary, managed scene state and broadcast
  registration.
- `src/state/annotation.test.ts`, `src/components/overlay-surface.test.tsx` and
  `tests/e2e/core-annotation-tools.e2e.ts` — existing frontend/native test seams.

No external product spec or ADR was referenced during this discussion; the phase
requirements and decisions above are the source of truth.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `AnnotationState.stylesByTool` already stores color, opacity, width, fill and text
  size independently per tool for the current session; Phase 4 should extend the
  existing state rather than introduce a second style store.
- `AnnotationToolbar` already owns a draggable/clamped toolbar and a compact Properties
  popover; history and lifecycle controls can reuse its interaction and scene-excluded
  chrome patterns.
- `OverlaySurface` already separates retained scene items from transient gesture state,
  has canonical hit-testing and supports committed text movement; lifecycle rendering
  can extend this retained/transient boundary.
- `SceneStore` already validates typed scene items and exposes snapshot-based commit,
  erase and clear primitives; history should preserve this validation and broadcast
  pattern.

### Established Patterns

- All display overlays render one shared semantic scene in canonical desktop logical
  coordinates. Undo/redo and expiry must therefore update one shared history/scene,
  not one stack per viewport.
- Native scene mutations return a whole `SceneSnapshot` and broadcast `scene-changed`.
  New mutation paths should preserve idempotence, validation and snapshot ordering.
- Toolbar/property UI is scene-excluded and must not intercept the underlying app in
  click-through mode. Lifecycle and history controls must follow the same pointer-event
  conventions.
- Text input currently uses an explicit draft transition model; outside-click commit
  must go through that model and preserve the locked Enter/Shift+Enter/Esc behavior.

### Integration Points

- `App.tsx` is the coordination point for history actions, lifecycle state, scene
  snapshots and native commands/events.
- `src-tauri/src/overlay_registry.rs` and `src-tauri/src/main.rs` are the native
  boundaries for validating, retaining, expiring, clearing, undoing and broadcasting
  scene state.
- `OverlaySurface.tsx` must render lifecycle opacity and remove expired items without
  duplicating retained/transient items or breaking realtime pointer feedback.
- `AnnotationToolbar.tsx` and the existing CSS are the integration point for the
  always-visible history/lifecycle controls and the compact duration editor.
- Vitest, Rust unit tests and WDIO native tests already cover the relevant frontend,
  native scene and desktop interaction seams.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly requested that clicking outside the text input commits the text,
  in addition to `Enter` commit, `Shift+Enter` newline and `Esc` cancel.
- The user asked for recommendations on technical choices; the selected defaults favor
  predictable presenter behavior, compact controls and minimal surprise.
- Existing committed text movement is treated as an undoable text operation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 04-editing-ink-lifecycle*
*Context gathered: 2026-09-11*

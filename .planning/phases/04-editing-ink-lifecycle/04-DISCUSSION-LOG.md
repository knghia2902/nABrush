# Phase 4: Editing & Ink Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-09-11
**Phase:** 4-Editing & Ink Lifecycle
**Areas discussed:** Undo/Redo, Lifecycle, Cách fade, Bố trí control

---

## Undo/Redo

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Mỗi thao tác là một history entry: vẽ, tạo/commit text, di chuyển text, xóa item hoặc clear-all. | ✓ |
| 2 | Gộp các thao tác liên tiếp thành một nhóm. | |
| 3 | Chỉ history cho tạo/xóa/clear, không history cho di chuyển text. | |

**User's choice:** 1
**Notes:** Người dùng muốn mỗi thao tác được hoàn tác theo thứ tự. Sau Undo rồi có thao tác mới, nhánh Redo cũ bị xóa. Undo dùng `Cmd/Ctrl+Z`; toolbar có nút Undo/Redo; Redo dùng `Ctrl+Y`.

---

## Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Chỉ annotation mới dùng lifecycle mới; annotation cũ giữ nguyên. | ✓ |
| 2 | Chuyển chế độ cho toàn bộ annotation hiện có. | |
| 3 | Không lưu lifecycle riêng cho annotation cũ. | |

**User's choice:** 1
**Notes:** Thời lượng Vanishing dùng preset `1 / 3 / 5 / 10 / 30 giây` và cho nhập số tùy chọn. Annotation giữ rõ gần hết thời lượng rồi fade trong giây cuối. Vanishing áp dụng cho mọi loại annotation, gồm cả text và shape.

---

## Cách fade

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Mỗi annotation có timer riêng từ lúc commit. | ✓ |
| 2 | Tất cả annotation dùng chung timer. | |
| 3 | Annotation tạo gần nhau dùng chung timer theo nhóm. | |

**User's choice:** 1
**Notes:** Timer tiếp tục chạy khi overlay ẩn hoặc click-through. Annotation hết hạn không tạo history entry riêng và vẫn được khôi phục bằng Undo. Đổi thời lượng chỉ ảnh hưởng annotation mới; annotation cũ giữ thời lượng lúc tạo.

---

## Bố trí control

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Nút Undo/Redo ở đầu toolbar, lifecycle luôn hiện trên toolbar, duration hiện cạnh lifecycle khi Vanishing. | ✓ |
| 2 | Đưa control vào Properties hoặc popover riêng để toolbar gọn hơn. | |
| 3 | Chỉ dùng control trong Settings hoặc phím tắt. | |

**User's choice:** 1
**Notes:** Người dùng yêu cầu trợ giúp lựa chọn chuyên môn; các lựa chọn đề xuất còn lại được tự chọn theo hướng dễ dùng cho presenter. Toolbar tiếp tục kéo được, toolbar/popover clamp trong viewport và giữ control gọn.

---

## the agent's Discretion

- Chọn mô hình history và boundary đồng bộ phù hợp với SceneStore/snapshot hiện có.
- Chọn validation/giới hạn số giây và chi tiết animation/scheduling.
- Chọn glyph, kích thước, màu trạng thái và accessibility treatment cụ thể.

## Deferred Ideas

Không có.

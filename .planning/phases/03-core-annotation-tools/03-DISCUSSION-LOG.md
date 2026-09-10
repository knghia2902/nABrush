# Phase 3: Core Annotation Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-10  
**Phase:** 3-Core Annotation Tools  
**Areas discussed:** Bảng tool và thuộc tính, Nét và hình học, Text, Eraser

---

## Bảng tool và thuộc tính

| Option | Description | Selected |
|--------|-------------|----------|
| A | Toolbar luôn hiện trong lúc vẽ, đặt ở cạnh dưới màn hình. | ✓ |
| B | Toolbar hiện rồi tự ẩn sau vài giây. | |
| C | Toolbar chỉ hiện bằng shortcut hoặc khi đưa chuột tới cạnh màn hình. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Click một lần để chọn và giữ tool cho các nét tiếp theo. | ✓ |
| B | Giữ chuột để dùng tool tạm thời rồi quay lại tool trước. | |
| C | Hỗ trợ cả chọn cố định và chọn tạm thời. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Thuộc tính hiển thị ngay trên toolbar. | |
| B | Toolbar gọn; click nút thuộc tính mở bảng nhỏ. | ✓ |
| C | Chỉnh thuộc tính trong Settings riêng. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Nhớ màu, opacity, width, fill và cỡ chữ riêng theo từng tool trong phiên hiện tại. | ✓ |
| B | Mọi tool dùng chung style hiện tại. | |
| C | Chỉ màu và width được nhớ riêng. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Nét mặc định mảnh hơn, vẫn cho phép chỉnh width. | ✓ |
| B | Nét mặc định dày hơn. | |
| C | Không có ưu tiên mặc định. | |

**User's choice:** `1A 2A 3B 4A`; user added: “Chỗ nét vẽ mình cần thon hơn.”  
**Notes:** Áp dụng ưu tiên nét mảnh hơn cho pen, line, arrow và outline; giá trị pixel cụ thể để implementation discretion xác định và kiểm tra trực quan.

---

## Nét và hình học

| Option | Description | Selected |
|--------|-------------|----------|
| A | Kéo quá ngắn không tạo annotation. | ✓ |
| B | Vẫn tạo một điểm/hình rất nhỏ. | |
| C | Click ngắn tạo chấm; kéo mới tạo hình. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Đầu mũi tên là tam giác đặc. | ✓ |
| B | Đầu mũi tên là hai nét mở dạng `>`. | |
| C | Cho phép chọn kiểu sau này. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Shape mặc định chỉ viền. | |
| B | Shape mặc định có fill trong suốt nhẹ. | |
| C | Rectangle và ellipse có lựa chọn fill riêng, giữ style riêng theo tool. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| A | `Esc` hoặc thả ngoài overlay hủy preview, không đổi scene. | ✓ |
| B | Giới hạn điểm cuối vào mép overlay rồi commit. | |
| C | Chỉ `Esc` hủy; thả ngoài overlay vẫn commit. | |

**User's choice:** `1A 2A 3C 4A`.  
**Notes:** Preview khi kéo và commit khi thao tác hợp lệ kết thúc được giữ từ contract phase 2; click/drag dưới ngưỡng nhỏ không tạo item.

---

## Text

| Option | Description | Selected |
|--------|-------------|----------|
| A | Click một điểm trên canvas và bắt đầu nhập ngay. | ✓ |
| B | Kéo để tạo khung text rồi nhập. | |
| C | Click đặt điểm, kéo thêm nếu muốn giới hạn chiều rộng. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | `Enter` commit, `Esc` hủy. | ✓ |
| B | Dùng nút Commit/Cancel. | |
| C | `Cmd/Ctrl + Enter` commit, `Esc` hủy. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | `Enter` xuống dòng; commit bằng nút hoặc `Cmd/Ctrl + Enter`. | |
| B | Chỉ hỗ trợ một dòng. | |
| C | `Shift + Enter` xuống dòng; `Enter` thường commit. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Phase 3 chỉ sửa draft trước commit; text đã commit để Phase 4. | ✓ |
| B | Click text đã commit để sửa trực tiếp. | |
| C | Có chế độ chọn rồi sửa text đã commit. | |

**User's choice:** `1A 2C 3 Shift Enter 4A`, sau đó làm rõ: `Enter` là commit, `Shift + Enter` xuống dòng, `Esc` hủy.  
**Notes:** Text đã commit không bị thay đổi khi hủy draft; chỉnh sửa text đã commit và selection sâu hơn được hoãn sang phase 4.

---

## Eraser

| Option | Description | Selected |
|--------|-------------|----------|
| A | Click xóa đúng một annotation; kéo không xóa hàng loạt. | ✓ |
| B | Click xóa một; kéo qua nhiều item sẽ xóa từng item chạm phải. | |
| C | Chọn trước rồi click lần hai mới xóa. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Chọn annotation được tạo sau cùng, nằm trên cùng. | ✓ |
| B | Chọn annotation gần con trỏ nhất. | |
| C | Hiện danh sách/selector để người dùng chọn. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Stroke theo đường tâm cộng vùng đệm; shape theo fill/viền; text theo khung chữ. | ✓ |
| B | Chỉ bắt đúng phần pixel nhìn thấy. | |
| C | Dùng vùng bắt rộng, ưu tiên dễ thao tác. | |

| Option | Description | Selected |
|--------|-------------|----------|
| A | Hover highlight item mục tiêu; click mới xóa. | ✓ |
| B | Click là xóa ngay. | |
| C | Click lần đầu chọn, click lần hai xác nhận. | |

**User's choice:** `1A 2A 3A 4A`.  
**Notes:** Xóa chỉ là mutation một item; không mở rộng sang batch erase hoặc undo/redo vì đó là phạm vi phase 4.

---

## the agent's Discretion

- Giá trị số mặc định cho width/opacity, ngưỡng drag tối thiểu và bán kính hit-test.
- Màu mặc định, opacity fill, chi tiết preview và kích thước toolbar/property panel.
- Chi tiết editor tạm thời và accessibility treatment miễn giữ nguyên các phím commit/cancel/newline đã khóa.

## Deferred Ideas

- Sửa text đã commit và general object selection/editing — Phase 4.
- Undo/redo, clear-all, bulk erase và ink lifecycle — Phase 4.
- Capture, composition và PNG/clipboard export — Phase 5.
- Stylus pressure, snapshots, collaboration, cloud sync, AI/OCR và document editor — v2 hoặc ngoài phạm vi sản phẩm.

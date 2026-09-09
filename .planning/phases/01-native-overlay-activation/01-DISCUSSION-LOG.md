# Phase 1: Native Overlay & Activation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 1-Native Overlay & Activation
**Areas discussed:** Khởi động và kích hoạt, Chuyển chế độ an toàn, Phạm vi overlay Phase 1, Lỗi và khôi phục

---

## Khởi động và kích hoạt

| Option | Description | Selected |
|--------|-------------|----------|
| Chạy nền, overlay ẩn | Hiện trong menu bar/system tray; chủ động bật bằng phím tắt. | ✓ |
| Overlay hiện ngay | Hiện trên màn hình chính khi mở app. | |
| Nhớ trạng thái lần trước | Khởi động theo trạng thái trước đó. | |

**User's choice:** Chạy nền, overlay ẩn.
**Notes:** Default startup should be unobtrusive.

| Option | Description | Selected |
|--------|-------------|----------|
| ⌘/Ctrl + Shift + A | Cùng ý nghĩa trên hai hệ điều hành, theo “Annotate”. | ✓ |
| F6 | Phím chức năng nhanh nhưng dễ trùng. | |
| Không đặt sẵn | Yêu cầu cấu hình trước khi dùng. | |

**User's choice:** ⌘/Ctrl + Shift + A.
**Notes:** The user additionally required all shortcuts to be customizable.

| Option | Description | Selected |
|--------|-------------|----------|
| Ẩn giao diện, tiếp tục chạy nền | Chỉ Quit mới thoát app. | ✓ |
| Hỏi lại khi đóng | Xác nhận mỗi lần đóng giao diện. | |
| Thoát khi đóng | Đóng giao diện là thoát app. | |

**User's choice:** Ẩn giao diện nhưng tiếp tục chạy ở menu bar/system tray.

| Option | Description | Selected |
|--------|-------------|----------|
| Tắt mặc định, bật trong cài đặt | Không gây bất ngờ khi cài lần đầu. | ✓ |
| Bật mặc định | Luôn sẵn sàng khi đăng nhập. | |
| Không hỗ trợ | Luôn mở thủ công. | |

**User's choice:** Tắt mặc định, cho phép bật trong cài đặt.

---

## Chuyển chế độ an toàn

| Option | Description | Selected |
|--------|-------------|----------|
| Phím tắt riêng | Tách bật/tắt overlay, click-through và emergency hide. | ✓ |
| Một phím tắt tuần tự | Cycle ẩn → vẽ → click-through. | |
| Giữ một phím | Giữ để vẽ, thả để click-through. | |

**User's choice:** Phím tắt riêng; các phím đều tùy chỉnh được.

| Option | Description | Selected |
|--------|-------------|----------|
| Badge nhỏ + phản hồi con trỏ | Dễ nhận biết, ít che nội dung, có thể tự ẩn. | ✓ |
| Toolbar luôn hiện | Nhiều điều khiển nhưng chiếm chỗ. | |
| Chỉ báo qua tray/menu bar | Sạch nhưng khó thấy khi trình chiếu. | |

**User's choice:** Badge nhỏ ở góc và phản hồi con trỏ.

| Option | Description | Selected |
|--------|-------------|----------|
| Tất cả overlay trên mọi màn hình | Trạng thái nhất quán và app dưới nhận chuột ở mọi nơi. | ✓ |
| Chỉ màn hình hiện tại | Cho phép độc lập nhưng dễ nhầm. | |
| Riêng từng màn hình | Linh hoạt nhưng phức tạp. | |

**User's choice:** Tất cả overlay trên mọi màn hình.

| Option | Description | Selected |
|--------|-------------|----------|
| Esc luôn ẩn ngay và giữ scene | Có thể thêm phím thay thế tùy chỉnh. | ✓ |
| Esc tùy chỉnh hoàn toàn | Linh hoạt nhưng mất lối thoát cố định. | |
| Không có phím riêng | Dùng phím bật/tắt overlay. | |

**User's choice:** Esc luôn là emergency hide, giữ nguyên scene.

---

## Phạm vi overlay Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Màn hình chính trước | Harness một màn hình; Phase 2 mở rộng topology. | ✓ |
| Tất cả màn hình ngay | Kiểm chứng đa màn hình sớm hơn. | |
| Màn hình có con trỏ | Overlay theo màn hình tương tác. | |

**User's choice:** Màn hình chính trước.

| Option | Description | Selected |
|--------|-------------|----------|
| Cửa sổ trong suốt phủ toàn màn hình | Kiểm chứng đúng luồng trình chiếu và click-through. | ✓ |
| Cửa sổ quanh app | Cần theo dõi vị trí/kích thước app. | |
| Vùng kéo giãn | Không phản ánh luồng thực tế. | |

**User's choice:** Cửa sổ trong suốt, không viền, phủ toàn màn hình chính.

| Option | Description | Selected |
|--------|-------------|----------|
| Chế độ vẽ | Bật lên là vẽ ngay. | ✓ |
| Click-through | Hiện nhưng chưa bắt chuột. | |
| Nhớ lần trước | Tiện nhưng dễ bất ngờ. | |

**User's choice:** Chế độ vẽ.

| Option | Description | Selected |
|--------|-------------|----------|
| Trong suốt hoàn toàn | Không làm tối nền; chỉ badge/con trỏ báo trạng thái. | ✓ |
| Tint nhẹ | Dễ nhận biết nhưng ảnh hưởng nội dung. | |
| Viền/lưới kiểm thử | Hữu ích cho debug, không phù hợp sản phẩm. | |

**User's choice:** Trong suốt hoàn toàn, không làm tối nền.

---

## Lỗi và khôi phục

| Option | Description | Selected |
|--------|-------------|----------|
| Thông báo nhẹ + trạng thái giữ lại | Không chặn trình bày nhưng vẫn có hướng khắc phục. | ✓ |
| Modal | Nổi bật nhưng gây gián đoạn. | |
| Chỉ log | Yên tĩnh nhưng khó chẩn đoán. | |

**User's choice:** Thông báo nhẹ và trạng thái trong tray/menu bar.

| Option | Description | Selected |
|--------|-------------|----------|
| Từ chối, giữ phím cũ, gợi ý phím mới | Không mất khả năng bật overlay. | ✓ |
| Cảnh báo nhưng lưu phím mới | Shortcut có thể không hoạt động. | |
| Tự chọn thay thế | Người dùng không biết phím thực tế. | |

**User's choice:** Từ chối đăng ký, giữ phím cũ và gợi ý phím mới.

| Option | Description | Selected |
|--------|-------------|----------|
| Ẩn overlay, giữ app nền, cho phép thử lại | Giữ scene và khôi phục nhanh. | ✓ |
| Retry liên tục | Có thể nhấp nháy/tốn tài nguyên. | |
| Thoát app | Đơn giản nhưng khó khôi phục. | |

**User's choice:** Ẩn overlay, giữ app chạy nền và cho phép thử lại.

| Option | Description | Selected |
|--------|-------------|----------|
| Badge lỗi có Retry và Open System Settings | Khắc phục ngay khi có thể. | ✓ |
| Chỉ nội dung lỗi | Gọn nhưng người dùng tự tìm cách sửa. | |
| Tự mở System Settings | Có thể gây gián đoạn. | |

**User's choice:** Badge lỗi có nút Thử lại và Mở Cài đặt hệ thống khi cần.

---

## the agent's Discretion

- Exact secondary shortcut defaults, badge placement/timing, cursor feedback details, native window flags, IPC names, tray artwork, and test fixture details.

## Deferred Ideas

- Multi-monitor topology is assigned to Phase 2; presentation effects and commercial features remain deferred per project scope.

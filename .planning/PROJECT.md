# nABrush

## What This Is

nABrush là công cụ chú thích màn hình đa nền tảng cho macOS và Windows. Người dùng có thể bật một lớp vẽ phủ lên bất kỳ ứng dụng hoặc màn hình nào, dùng các công cụ như bút, highlight, mũi tên, hình dạng và chữ, rồi xuất ảnh đã chú thích khi cần. Sản phẩm ưu tiên người thuyết trình và giảng dạy nhưng vẫn đủ đơn giản cho người dùng phổ thông.

## Core Value

Người dùng có thể đánh dấu rõ ràng bất kỳ nội dung nào trên màn hình trong vài giây mà không phải rời khỏi ứng dụng đang dùng.

## Business Context

- **Customer**: Người thuyết trình, giáo viên, người hướng dẫn và người dùng phổ thông cần chú thích màn hình.
- **Revenue model**: Miễn phí cho chức năng cốt lõi, tính năng nâng cao có thể trả phí; chi tiết chưa quyết định.
- **Success metric**: Người dùng bật overlay, vẽ chú thích và xuất được ảnh thành công trong một luồng ngắn, ổn định.
- **Strategy notes**: Cần xác thực nhóm tính năng trả phí sau khi bản miễn phí được dùng thực tế.

## Requirements

### Validated

- ✓ Người dùng có thể bật/tắt lớp vẽ từ tray/menu bar và phím tắt toàn cục — Phase 1.
- ✓ Người dùng có thể chuyển giữa drawing mode, click-through và emergency hide mà không mất scene — Phase 1.

### Active

- [ ] Người dùng có thể vẽ trên bất kỳ màn hình, ứng dụng hoặc cửa sổ toàn màn hình nào.
- [ ] Người dùng có thể sử dụng đầy đủ bộ công cụ chú thích cơ bản.
- [ ] Người dùng có thể chọn nét vẽ giữ nguyên hoặc tự biến mất.
- [ ] Người dùng có thể hoàn tác, làm lại, xóa và điều chỉnh thuộc tính nét vẽ.
- [ ] Người dùng có thể xuất ảnh/chụp màn hình đã chú thích.
- [ ] Ứng dụng hỗ trợ nhiều màn hình và không cản trở thao tác với ứng dụng bên dưới khi lớp vẽ tắt.
- [ ] Có bản phát hành chạy được trên macOS và Windows.

### Out of Scope

- Ứng dụng di động — bản đầu tập trung vào desktop và thao tác chuột/bàn phím.
- Cộng tác chú thích theo thời gian thực — chưa cần để kiểm chứng giá trị cốt lõi.
- Ghi và chỉnh sửa video bài giảng — xuất ảnh là nhu cầu đã xác định cho bản đầu.
- Đồng bộ phiên chú thích qua cloud — chưa có yêu cầu lưu phiên, cần tránh mở rộng backend sớm.

## Context

- Sản phẩm lấy cảm hứng từ ScreenBrush nhưng cần hoạt động trên cả macOS và Windows.
- Luồng chính là bật overlay bằng phím tắt, vẽ trực tiếp trên nội dung đang hiển thị, sau đó tắt overlay để tương tác bình thường với ứng dụng bên dưới.
- Bộ công cụ bản đầu gồm bút tự do, highlight, mũi tên, đường thẳng, hình chữ nhật, hình tròn, chữ, tẩy và undo/redo.
- Cần hỗ trợ màu, độ dày nét, thời lượng tự biến mất và nhiều màn hình, kể cả ứng dụng toàn màn hình.
- Tính năng xuất ảnh/chụp màn hình đã chú thích là yêu cầu bản đầu; cách lưu phiên lâu dài chưa nằm trong phạm vi hiện tại.

## Constraints

- **Platforms**: macOS và Windows — đây là phạm vi phát hành ngay từ bản đầu.
- **Interaction**: Lớp vẽ phải chuyển được giữa chế độ bắt chuột để vẽ và chế độ click-through để thao tác ứng dụng bên dưới.
- **Performance**: Nét vẽ phải hiển thị mượt trong khi trình chiếu hoặc dùng ứng dụng toàn màn hình.
- **Distribution**: Có đường phát hành miễn phí cơ bản và chừa không gian cho tính năng trả phí sau khi có dữ liệu sử dụng.
- **Privacy**: Chức năng chú thích và xuất ảnh nên xử lý cục bộ theo mặc định, không yêu cầu tải nội dung màn hình lên máy chủ.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Desktop-first trên macOS và Windows | Phù hợp nhu cầu trình chiếu và làm việc trên màn hình thật | — Pending |
| Overlay điều khiển bằng phím tắt toàn cục | Giảm số lần rời khỏi ứng dụng đang trình bày | ✓ Validated in Phase 1 |
| Hai chế độ nét vẽ: tự biến mất và giữ nguyên | Phục vụ cả chú thích nhanh lẫn giải thích lâu | — Pending |
| Xuất ảnh là đầu ra bản đầu | Người dùng cần chia sẻ kết quả ngay, không cần backend lưu phiên | — Pending |
| Mô hình miễn phí cơ bản + trả phí mở | Cho phép kiểm chứng giá trị trước khi chốt monetization | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-10 after Phase 1*

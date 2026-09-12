---
status: diagnosed
phase: 04-editing-ink-lifecycle
source: [04-VERIFICATION.md]
started: 2026-09-12T14:02:13Z
updated: 2026-09-12T15:21:49Z
---

## Current Test

[testing complete]

## Tests

### 1. Nét Vanishing hết hạn khi click-through
expected: Một nét ở chế độ Vanishing mờ dần rồi hết hạn đúng thời điểm khi lớp phủ đang ở chế độ click-through, và không xuất hiện lại khi bật tương tác.
result: issue
reported: "Nó không mất từ từ mà mất luôn với nó nhảy nét lung tung khi mà bật Vanishing, thành toolbar mình chỉ cần hiện icon thôi"
severity: major

### 2. Tính năng trên Windows
expected: Trên Windows, vẽ, xác nhận/di chuyển văn bản, điều khiển vòng đời nét, nút Undo/Redo và Ctrl+Z/Ctrl+Y hoạt động; phím tắt không tác động ứng dụng bên dưới.
result: issue
reported: "Ctrl+Z/Ctrl+Y đang là clear all"
severity: major

### 3. Thiết lập riêng theo công cụ sau Undo/Redo
expected: Màu sắc, độ dày, độ mờ, màu tô và cỡ chữ vẫn gắn với đúng công cụ sau khi chuyển đổi giữa các công cụ và khôi phục lịch sử.
result: pass

## Summary

total: 3
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->
- gap_id: G-04-1
  truth: "Nét Vanishing mờ dần và hết hạn đúng thời điểm khi lớp phủ ở chế độ click-through, sau đó không xuất hiện lại khi bật tương tác."
  status: failed
  reason: "Người dùng báo nét Vanishing biến mất ngay thay vì mờ dần, đồng thời nét vẽ nhảy lung tung khi bật Vanishing."
  severity: major
  test: 1
  root_cause: "Chưa xác định được nguyên nhân gốc: kiểm thử hiện có không bao phủ chuyển sang click-through; triệu chứng nét nhảy thiếu trace pointer/viewport để phân biệt nguyên nhân."
  artifacts:
    - path: "src/components/OverlaySurface.tsx"
      issue: "Opacity được áp dụng khi render; tọa độ nét phụ thuộc pointer samples và canvas/viewport, nhưng chưa có trace để khoanh vùng lỗi nhảy nét."
    - path: "src-tauri/src/main.rs"
      issue: "Scheduler phát cập nhật trong đoạn fade cuối và không phân nhánh theo visibility/mode; chưa có bằng chứng về hành vi lúc chuyển click-through."
    - path: "tests/e2e/editing-ink-lifecycle.e2e.ts"
      issue: "Có kiểm tra fade/expiry khi hiển thị hoặc ẩn, chưa kiểm tra chuyển trạng thái click-through."
    - path: ".planning/debug/vanishing-fade-and-stroke-jump.md"
      issue: "Ghi lại điều tra chưa kết luận và các khả năng cần kiểm chứng."
  missing:
    - "Tái hiện với log alpha từng frame, timestamp lifecycle, scene points, pointer events, canvas bounds, viewport và overlay mode."
    - "Xác minh riêng liệu chuyển VisibleClickThrough có làm gián đoạn redraw/pointer capture hay không."
  debug_session: ".planning/debug/vanishing-fade-and-stroke-jump.md"
- gap_id: G-04-2
  truth: "Trên Windows, Ctrl+Z và Ctrl+Y thực hiện Undo/Redo, không xóa toàn bộ nét và không tác động ứng dụng bên dưới."
  status: failed
  reason: "Người dùng báo Ctrl+Z/Ctrl+Y đang kích hoạt Clear All thay vì Undo/Redo."
  severity: major
  test: 2
  root_cause: "Chưa xác định được nguyên nhân gốc: mã frontend đã kiểm tra ánh xạ Ctrl+Z/Ctrl+Y sang undo_scene/redo_scene và native Undo/Redo là các handler riêng; chưa xác minh đường focus/keyboard hoặc đúng bản build trên Windows."
  artifacts:
    - path: "src/App.tsx"
      issue: "Đường xử lý phím được kiểm tra ánh xạ shortcut sang lệnh Undo/Redo, không phải Clear All."
    - path: "src/types/overlay.ts"
      issue: "Khai báo hành động Undo/Redo riêng biệt."
    - path: "src-tauri/src/main.rs"
      issue: "Native Undo, Redo và Clear là các handler tách biệt."
    - path: "tests/e2e/editing-ink-lifecycle.e2e.ts"
      issue: "Có assertion cho shortcut nhưng không chứng minh hành vi native của bản Windows người dùng chạy."
    - path: ".planning/debug/windows-undo-redo-shortcuts.md"
      issue: "Ghi lại các giả thuyết chưa được xác nhận và bằng chứng hiện có."
  missing:
    - "Xác nhận commit/build cụ thể của ứng dụng đang chạy trên Windows."
    - "Ghi nhận target, modifiers và focus của keydown trên Windows, đồng thời kiểm tra clear_scene có bị gọi hay không."
    - "Kiểm tra có đường xử lý phím hoặc handler khác kích hoạt Clear All trong bản chạy thực tế hay không."
  debug_session: ".planning/debug/windows-undo-redo-shortcuts.md"

## Additional User Requests

- Toolbar: chỉ hiển thị biểu tượng, ẩn nhãn chữ.

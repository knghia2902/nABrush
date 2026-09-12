---
status: complete
phase: 04-editing-ink-lifecycle
source: [04-VERIFICATION.md]
started: 2026-09-12T14:02:13Z
updated: 2026-09-12T15:06:18Z
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
  artifacts: []
  missing: []
- gap_id: G-04-2
  truth: "Trên Windows, Ctrl+Z và Ctrl+Y thực hiện Undo/Redo, không xóa toàn bộ nét và không tác động ứng dụng bên dưới."
  status: failed
  reason: "Người dùng báo Ctrl+Z/Ctrl+Y đang kích hoạt Clear All thay vì Undo/Redo."
  severity: major
  test: 2
  artifacts: []
  missing: []

## Additional User Requests

- Toolbar: chỉ hiển thị biểu tượng, ẩn nhãn chữ.

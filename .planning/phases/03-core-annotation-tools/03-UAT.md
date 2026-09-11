---
status: complete
phase: 03-core-annotation-tools
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md, 03-08-SUMMARY.md
started: 2026-09-11T02:53:04Z
updated: 2026-09-11T06:12:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Mô hình scene và validation native
expected: SceneItem có kiểu dữ liệu hợp lệ, style/geometry/text được giới hạn và scene giữ item hợp lệ, không lưu trùng khi replay.
result: pass
source: automated
coverage_id: D1

### 2. Pen/highlighter realtime và commit một item
expected: Preview xuất hiện trong lúc kéo, style được chụp lúc bắt đầu và pointer-up hợp lệ tạo đúng một item retained.
result: pass
source: automated
coverage_id: D2

### 3. Line/arrow realtime, threshold và arrowhead
expected: Line/arrow chỉ commit khi đủ khoảng cách, giữ style độc lập và arrowhead tam giác đặc bám đúng endpoint.
result: pass
source: automated
coverage_id: D1

### 4. Rectangle/ellipse geometry và fill
expected: Rectangle/ellipse có geometry chuẩn hoá, preview realtime và snapshot fill/stroke/opacity độc lập.
result: pass
source: automated
coverage_id: D2

### 5. Canonical scene và DPR transform
expected: Geometry mới đi qua cùng scene canonical và pipeline DPR theo viewport, không bị biến thành dữ liệu riêng từng display.
result: pass
source: automated
coverage_id: D3

### 6. Text draft, IME và multiline Canvas
expected: Text draft đặt đúng vị trí, an toàn với IME, hiển thị multiline đo bằng Canvas và có hit bounds canonical.
result: pass
source: automated
coverage_id: D1

### 7. Eraser hit-test topmost
expected: Eraser chọn item trên cùng theo hit-test theo loại và chỉ xoá đúng một item, không xoá chrome.
result: pass
source: automated
coverage_id: D2

### 8. Traceability của validation artifact
expected: Validation artifact chứa đủ task ID, command, failure signal, Wave 0 dependency và source audit.
result: pass
source: automated
coverage_id: D2

### 9. Regression suite sau native smoke addition
expected: Frontend tests, Rust tests và production build vẫn xanh sau khi thêm suite smoke.
result: pass
source: automated
coverage_id: D3

### 10. Fill controls trong toolbar
expected: Popover rectangle/ellipse có fill mode, fill color và fill opacity được controlled và giới hạn hợp lệ.
result: pass
source: automated
coverage_id: D1

### 11. Fill state độc lập theo tool
expected: Thay đổi fill của rectangle không làm đổi fill của ellipse hoặc style không liên quan.
result: pass
source: automated
coverage_id: D2

### 12. Frontend regression sau toolbar extraction
expected: Toàn bộ frontend test và production build vẫn xanh sau khi tách toolbar.
result: pass
source: automated
coverage_id: D3

### 13. Capture lifecycle preview/commit/cancel
expected: Capture có trạng thái pressed/previewing, không mutate retained scene sớm, terminal lệch bị từ chối và capture dở dang huỷ an toàn.
result: pass
source: automated
coverage_id: D1

### 14. Regression sau lifecycle hardening
expected: Frontend regression suite và production build vẫn xanh sau khi harden pointer lifecycle.
result: pass
source: automated
coverage_id: D3

### 15. Canonical Phase 3 goal
expected: Roadmap dùng đúng user story Phase 3 và GSD user-story validator trả về hợp lệ.
result: pass
source: automated
coverage_id: D1

### 16. Final validation traceability
expected: Final validation map đủ goal, DRAW requirements, research, decisions, plan references và sign-off fields.
result: pass
source: automated
coverage_id: D1

### 17. Toolbar, popover và click-through trên máy thật
expected: Toolbar nằm ngoài scene, popover đúng tool và click-through chuyển được giữa overlay với ứng dụng bên dưới trên macOS/Windows.
result: pass
reported: "pass"

### 18. Text/IME và eraser trên máy thật
expected: Text nhận focus/IME đúng, Enter commit, Shift+Enter xuống dòng, Esc huỷ; hover/click eraser highlight và xoá đúng item.
result: issue
reported: "Text không dùng được không hiện gì"
severity: major

### 19. Native smoke cho toàn bộ công cụ
expected: Pointer thật cho pen, highlighter, line, arrow, rectangle, ellipse tạo preview realtime và đúng một commit; fill style được giữ đúng.
result: pass
reported: "pass"

### 20. Native smoke lifecycle trên macOS
expected: Suite `phase3-tools`, `short-lifecycle` và `phase1-matrix` chạy qua window lifecycle, không còn lỗi `window not found` hoặc `invoke` timeout.
result: issue
reported: "Chạy native smoke trên macOS"
severity: major
evidence: |
  Ba suite đã được chạy tuần tự. Native runner gặp `Tauri core.invoke not available after 5s timeout`
  và `Tauri invoke bridge is unavailable`; lifecycle smoke nhận `expected Hidden received VisibleInteractive`
  và pointer drag không commit ổn định. Tiến trình native vẫn còn sau khi runner kết thúc.

### 21. Native parity trên Windows
expected: Windows xác nhận được pointer input, text/IME, eraser, click-through, style và lifecycle tương đương macOS.
result: issue
reported: "Trên Windows cũng tương tự"
severity: major
evidence: "Windows được báo gặp cùng nhóm lỗi native lifecycle/bridge và pointer commit không ổn định như macOS; chưa xác nhận được parity cho text/IME, eraser, click-through và style."

### 22. Multi-display canonical placement
expected: Annotation giữ đúng vị trí khi display có origin âm, DPR khác nhau, xoay màn hình hoặc topology thay đổi.
result: skipped
reported: "skip"

### 23. Validation artifact và manual sign-off
expected: `03-VALIDATION.md` phản ánh đúng kết quả test thực tế trên từng host, không đánh dấu PASS khi chưa có bằng chứng.
result: pass
reported: "pass"

### 24. Final Phase 3 evidence
expected: Native/manual evidence đủ để xác nhận Phase 3 goal từ góc nhìn presenter trên các platform được hỗ trợ.
result: pass
reported: "passs"

## Summary

total: 24
passed: 19
issues: 3
pending: 0
skipped: 1
blocked: 0

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->
- truth: "Text draft hiển thị khi click đặt text và hỗ trợ commit/cancel bằng keyboard"
  gap_id: G-03-18
  status: failed
  reason: "User reported: Text không dùng được không hiện gì"
  severity: major
  test: 18
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Native smoke lifecycle chạy qua window lifecycle ổn định trên macOS"
  gap_id: G-03-20
  status: failed
  reason: "Ba suite native smoke không hoàn tất ổn định: invoke bridge timeout/unavailable, lifecycle state mismatch và pointer drag không commit."
  severity: major
  test: 20
  root_cause: ""
  artifacts:
    - "wdio.conf.ts"
    - "tests/e2e/core-annotation-tools.e2e.ts"
  missing:
    - "Một lần chạy xanh của phase3-tools, short-lifecycle và phase1-matrix trên macOS"
  debug_session: ""
- truth: "Native parity trên Windows xác nhận pointer input, text/IME, eraser, click-through, style và lifecycle"
  gap_id: G-03-21
  status: failed
  reason: "User reported Windows gặp tình trạng tương tự macOS; native lifecycle/bridge và pointer commit chưa ổn định."
  severity: major
  test: 21
  root_cause: ""
  artifacts:
    - "wdio.conf.ts"
    - "tests/e2e/core-annotation-tools.e2e.ts"
  missing:
    - "Bằng chứng chạy xanh trên Windows cho toàn bộ parity matrix"
  debug_session: ""

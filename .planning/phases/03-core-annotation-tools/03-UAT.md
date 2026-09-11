---
status: diagnosed
phase: 03-core-annotation-tools
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md, 03-08-SUMMARY.md
started: 2026-09-11T02:53:04Z
updated: 2026-09-11T06:25:00Z
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
  root_cause: "Investigation inconclusive; leading cause is that native overlay/window input does not reliably deliver the placement pointerdown, so onPlaceTextDraft never runs. Remaining possibilities are click-through state, per-display overlay targeting, native focus/hit-testing, or a WebDriver-only input failure."
  artifacts:
    - path: "tests/e2e/core-annotation-tools.e2e.ts"
      issue: "Native/W3C pointer action fails before the text placement handler."
    - path: ".planning/debug/text-tool-draft-g-03-18.md"
      issue: "Text draft and Enter commit work when pointerdown is delivered; real event delivery was not independently observed."
  missing:
    - "Independent evidence that placement pointerdown reaches the text tool on the real overlay"
    - "A passing native text placement flow with draft visibility and keyboard commit/cancel"
  debug_session: ".planning/debug/text-tool-draft-g-03-18.md"
- truth: "Native smoke lifecycle chạy qua window lifecycle ổn định trên macOS"
  gap_id: G-03-20
  status: failed
  reason: "Ba suite native smoke không hoàn tất ổn định: invoke bridge timeout/unavailable, lifecycle state mismatch và pointer drag không commit."
  severity: major
  test: 20
  root_cause: "WebDriver smoke target cố định cửa sổ bootstrap `overlay` đang hidden, trong khi canvas native hiển thị nằm ở các cửa sổ động `overlay-display-*`. Đường tạo cửa sổ động và bridge là asynchronous; test còn gọi bridge trực tiếp trước khi webview mục tiêu sẵn sàng, làm khuếch đại lỗi window-not-found/invoke timeout. Process còn lại có thể là tray lifecycle riêng, chưa phải nguyên nhân chính."
  artifacts:
    - path: "wdio.conf.ts"
      issue: "Runner hardcodes windowLabel `overlay`."
    - path: "tests/e2e/overlay.e2e.ts"
      issue: "Smoke switches to the bootstrap label instead of asserting the visible generated overlay target."
    - path: "src-tauri/src/controller.rs"
      issue: "Show/reconcile creates and shows per-display overlay windows asynchronously."
    - path: "src-tauri/src/overlay_registry.rs"
      issue: "Visible native surfaces use generated `overlay-display-*` labels."
  missing:
    - "WebDriver target identity and readiness must match the visible generated overlay window"
    - "A green run of phase3-tools, short-lifecycle and phase1-matrix on macOS"
  debug_session: ".planning/debug/g-03-20-native-lifecycle.md"
- truth: "Native parity trên Windows xác nhận pointer input, text/IME, eraser, click-through, style và lifecycle"
  gap_id: G-03-21
  status: failed
  reason: "User reported Windows gặp tình trạng tương tự macOS; native lifecycle/bridge và pointer commit chưa ổn định."
  severity: major
  test: 21
  root_cause: "Không có bằng chứng runtime Windows độc lập: Windows được ghi nhận NOT RUN, CI không chạy full phase3-tools parity matrix và không lưu native artifacts. Shared E2E path còn target bootstrap `overlay` bị hidden thay vì `overlay-display-*`; đây là rủi ro được chứng minh trên macOS nhưng chưa xác nhận là Windows runtime root cause."
  artifacts:
    - path: ".planning/phases/03-core-annotation-tools/03-VALIDATION.md"
      issue: "Windows parity rows remain NOT RUN/PENDING and no dated host evidence is retained."
    - path: "src-tauri/src/platform/windows.rs"
      issue: "Policy tests exist but install_observer is a no-op; no host-level input/lifecycle result."
    - path: "wdio.conf.ts"
      issue: "Runner uses the shared hidden bootstrap window label."
    - path: ".github/workflows/phase1.yml"
      issue: "Windows workflow does not execute the full Phase 3 parity matrix or upload native artifacts."
    - path: ".planning/debug/g-03-21-windows-parity.md"
      issue: "Investigation found an evidence gap and shared target/readiness risk, not a confirmed Windows-only defect."
  missing:
    - "Một lần chạy full phase3-tools parity matrix trên Windows thật"
    - "Bằng chứng host-level cho pointer input, text/IME, eraser, click-through, style và lifecycle"
    - "Native logs/results có timestamp được lưu lại"
  debug_session: ".planning/debug/g-03-21-windows-parity.md"

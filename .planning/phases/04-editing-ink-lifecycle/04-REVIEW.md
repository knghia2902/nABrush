---
phase: 04-editing-ink-lifecycle
reviewed: 2026-09-12T08:33:30Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src-tauri/src/overlay_registry.rs
  - src/App.tsx
  - src/components/OverlaySurface.tsx
  - src/components/overlay-surface.test.tsx
  - tests/e2e/editing-ink-lifecycle.e2e.ts
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 04: Báo cáo code review

**Reviewed:** 2026-09-12T08:33:30Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Chỉ review diff đã commit từ `e7a73a0` đến `HEAD`; các thay đổi ngoài phạm vi trong working tree không được quy cho Phase 04. Đã xác nhận các findings của review trước:

- **CR-01 — resolved:** revision tăng ở mutation/expiry và `applySceneSnapshot` bỏ snapshot revision cũ.
- **CR-02 — resolved:** giới hạn điểm/byte UTF-8/số dòng đồng bộ với native; nét được lấy mẫu có thông báo, còn draft và gesture được giữ lại khi IPC lỗi để retry hoặc bỏ tường minh.
- **CR-03 — resolved cho luồng đã báo cáo:** outside-click trong composition được trì hoãn; sau `compositionend`, callback đọc giá trị editor rồi commit với guard idempotent. Có thêm một race ở callback trì hoãn được ghi bên dưới.
- **WR-01 — resolved:** Enter bị `preventDefault()` trước nhánh draft rỗng/whitespace; chỉ Shift+Enter chèn newline.

Tìm thấy hai edge case mới trong vòng đời IME: callback timeout không kiểm tra một composition mới bắt đầu trước khi chạy; Escape có thể hủy draft mà để cờ composition tồn tại. Vitest đạt 26/26 và `cargo test` đạt 54/54; các test này không bao phủ hai trình tự sự kiện nêu dưới đây.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-04: [BLOCKER] Timeout IME có thể commit giữa một composition mới

**File:** `src/components/OverlaySurface.tsx:1166-1168,1175-1188`

**Issue:** `compositionend` đặt `setTimeout(0)`, nhưng `handleTextCompositionStart` chỉ bật `textCompositionRef` và không hủy timeout đang chờ. Callback `finishDeferredCommit` cũng không kiểm tra cờ này: nếu editor bắt đầu composition mới trước khi timeout chạy, callback vẫn xóa cờ defer và commit giá trị hiện tại trong khi người dùng còn đang nhập. Phần còn lại của composition mới có thể bị mất hoặc bị tách thành thao tác khác. Kịch bản E2E hiện có kết thúc composition rồi gửi giá trị cuối ngay trong cùng `browser.execute`, nên không kiểm tra được compositionstart chen vào trước callback.

**Fix:** Khi composition mới bắt đầu, hủy timeout đang chờ; trong callback, kiểm tra `textCompositionRef.current` trước khi commit và giữ trạng thái defer nếu còn composing. Chỉ lên lịch commit sau `compositionend` cuối cùng. Thêm regression test gửi `compositionend`, rồi `compositionstart` trước khi timer chạy; xác nhận draft chưa commit cho đến khi composition thứ hai kết thúc.

## Warnings

### WR-02: [WARNING] Escape khi IME đang nhập có thể để cờ composition bị treo

**File:** `src/components/OverlaySurface.tsx:1099-1103,1166-1168`

**Issue:** Nhánh Escape hủy draft ngay cả khi `textCompositionRef.current` đang bật, nhưng không reset cờ này. Nếu textarea bị unmount trước khi nhận `compositionend`, cờ vẫn `true` trong component. Ở draft text tiếp theo, outside-click sẽ luôn đi vào nhánh trì hoãn; nếu composition mới không phát `compositionend`, draft không được commit bởi outside-click và cũng không được xử lý như draft bình thường khi blur.

**Fix:** Xử lý Escape khi `event.nativeEvent.isComposing` theo quy tắc IME (để IME kết thúc/hủy composition trước), và tập trung việc hủy draft vào một helper xóa `textCompositionRef`, `deferredOutsideTextCommitRef` cùng timeout đang chờ. Thêm test: compositionstart → Escape/cancel → mở draft mới → outside-click vẫn commit được.

---

_Reviewed: 2026-09-12T08:33:30Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

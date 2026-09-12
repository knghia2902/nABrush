---
phase: 04-editing-ink-lifecycle
reviewed: 2026-09-12T08:55:44Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/OverlaySurface.tsx
  - tests/e2e/editing-ink-lifecycle.e2e.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 04: Báo cáo code review

**Reviewed:** 2026-09-12T08:55:44Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** clean

## Summary

Review tăng dần diff đã commit từ `2fd5dfd` đến `f900daf`, giới hạn ở `OverlaySurface.tsx` và E2E Phase 4. Các thay đổi khác còn dirty trong working tree được loại khỏi phạm vi. Bốn finding trước đó vẫn được giữ nguyên và đã xử lý. CR-04 cùng WR-02 được kiểm tra lại trên code và regression WDIO; cả hai đã được khắc phục. Không phát hiện finding mới trong diff này.

- **CR-01 — resolved:** revision tăng ở mutation/expiry và `applySceneSnapshot` bỏ snapshot revision cũ.
- **CR-02 — resolved:** giới hạn điểm/byte UTF-8/số dòng đồng bộ với native; nét được lấy mẫu có thông báo, còn draft và gesture được giữ lại khi IPC lỗi để retry hoặc bỏ tường minh.
- **CR-03 — resolved:** outside-click trong composition được trì hoãn; sau `compositionend`, callback đọc giá trị editor rồi commit với guard idempotent.
- **WR-01 — resolved:** Enter bị `preventDefault()` trước nhánh draft rỗng/whitespace; chỉ Shift+Enter chèn newline.

**CR-04 và WR-02 — resolved:** composition mới hủy timeout cũ và callback còn guard theo trạng thái composition; Escape lúc IME đang xử lý không hủy draft, còn thao tác hủy draft thật dọn timer cùng các cờ liên quan. Regression WDIO bao phủ cả hai chuỗi sự kiện.

**Verification:** `pnpm build` đạt; `pnpm test` đạt 67/67; `cargo test --manifest-path src-tauri/Cargo.toml` đạt 54/54; WDIO `phase4-editing` đạt 4/4 trên macOS/WebKit.

## Resolved findings (historical)

## Critical Issues

### CR-04: [RESOLVED] Timeout IME có thể commit giữa một composition mới

**File:** `src/components/OverlaySurface.tsx`

**Issue:** `compositionend` đặt `setTimeout(0)`, nhưng `handleTextCompositionStart` chỉ bật `textCompositionRef` và không hủy timeout đang chờ. Callback `finishDeferredCommit` cũng không kiểm tra cờ này: nếu editor bắt đầu composition mới trước khi timeout chạy, callback vẫn xóa cờ defer và commit giá trị hiện tại trong khi người dùng còn đang nhập. Phần còn lại của composition mới có thể bị mất hoặc bị tách thành thao tác khác. Kịch bản E2E hiện có kết thúc composition rồi gửi giá trị cuối ngay trong cùng `browser.execute`, nên không kiểm tra được compositionstart chen vào trước callback.

**Fix:** Khi composition mới bắt đầu, hủy timeout đang chờ; trong callback, kiểm tra `textCompositionRef.current` trước khi commit và giữ trạng thái defer nếu còn composing. Chỉ lên lịch commit sau `compositionend` cuối cùng. Thêm regression test gửi `compositionend`, rồi `compositionstart` trước khi timer chạy; xác nhận draft chưa commit cho đến khi composition thứ hai kết thúc.

## Warnings

### WR-02: [RESOLVED] Escape khi IME đang nhập có thể để cờ composition bị treo

**File:** `src/components/OverlaySurface.tsx`

**Issue:** Nhánh Escape hủy draft ngay cả khi `textCompositionRef.current` đang bật, nhưng không reset cờ này. Nếu textarea bị unmount trước khi nhận `compositionend`, cờ vẫn `true` trong component. Ở draft text tiếp theo, outside-click sẽ luôn đi vào nhánh trì hoãn; nếu composition mới không phát `compositionend`, draft không được commit bởi outside-click và cũng không được xử lý như draft bình thường khi blur.

**Fix:** Xử lý Escape khi `event.nativeEvent.isComposing` theo quy tắc IME (để IME kết thúc/hủy composition trước), và tập trung việc hủy draft vào một helper xóa `textCompositionRef`, `deferredOutsideTextCommitRef` cùng timeout đang chờ. Thêm test: compositionstart → Escape/cancel → mở draft mới → outside-click vẫn commit được.

---

_Reviewed: 2026-09-12T08:55:44Z_
_Reviewer: Codex — manual incremental review (the delegated reviewer was interrupted before final verdict)_
_Depth: standard_

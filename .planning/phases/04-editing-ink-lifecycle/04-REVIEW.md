---
phase: 04-editing-ink-lifecycle
reviewed: 2026-09-12T06:04:44Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/types/overlay.ts
  - src/state/annotation.ts
  - src/state/annotation.test.ts
  - src/components/OverlaySurface.tsx
  - src/components/overlay-surface.test.tsx
  - src/components/AnnotationToolbar.tsx
  - src/components/annotation-toolbar.test.tsx
  - src/App.tsx
  - src/styles.css
  - src-tauri/src/overlay_registry.rs
  - src-tauri/src/main.rs
  - tests/e2e/editing-ink-lifecycle.e2e.ts
  - wdio.conf.ts
findings:
  critical: 3
  warning: 1
  info: 0
  total: 4
status: issues_found
---

# Phase 04: Báo cáo code review

**Reviewed:** 2026-09-12T06:04:44Z  
**Depth:** standard  
**Files Reviewed:** 13  
**Status:** issues_found

## Summary

Đã review các phiên bản đã commit trong phạm vi `217b3f7^..HEAD`; các thay đổi unstaged trong `AnnotationToolbar.tsx` và `wdio.conf.ts` không được tính. Có ba blocker liên quan đến snapshot scene và mất nội dung khi commit văn bản, cùng một warning về xử lý Enter trên bản nháp rỗng.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: [BLOCKER] Snapshot hết hạn cũ có thể ghi đè scene mới trên mọi overlay

**File:** `src-tauri/src/main.rs:48-60`, `src-tauri/src/main.rs:295-302`; `src/App.tsx:42-46,62-67`

**Issue:** Scheduler chụp `expired_snapshot` dưới mutex scene rồi thả mutex trước khi broadcast. Nếu một thao tác commit/undo xảy ra trước lúc scheduler phát sự kiện, snapshot mới có thể được phát trước, sau đó snapshot hết hạn cũ được phát sau và ghi đè state React vì `applySceneSnapshot` nhận mọi snapshot mà không kiểm tra thứ tự. Ví dụ, nét persistent vừa commit có thể biến mất khỏi tất cả overlay dù vẫn còn trong `SceneStore`; trạng thái Undo/Redo trên toolbar cũng trở nên cũ.

**Fix:** Tuần tự hóa cập nhật scene với việc phát snapshot, hoặc thêm revision tăng đơn điệu vào `SceneSnapshot` và để mọi client bỏ qua snapshot có revision thấp hơn revision đã áp dụng. Scheduler và các command mutation phải dùng chung thứ tự phát.

### CR-02: [BLOCKER] Payload vượt giới hạn Rust bị loại sau khi giao diện đã xóa nội dung

**File:** `src-tauri/src/overlay_registry.rs:798-801,831-834`; `src/components/OverlaySurface.tsx:812-834,989-1004`; `src/App.tsx:94-97`

**Issue:** Native từ chối stroke có hơn 4.096 điểm và text trên 4.096 byte UTF-8 hoặc 256 dòng. Phía UI không giới hạn/hiển thị các ngưỡng này: gesture bị `cancelGesture()` trước khi gửi, còn `commitTextDraft` đóng draft trước khi kết quả IPC trả về. Nếu native từ chối, promise chỉ bị bỏ qua ở callback commit; người dùng mất nét hoặc văn bản (đặc biệt dễ chạm giới hạn byte khi nhập Unicode) mà không có thông báo hay cơ hội sửa.

**Fix:** Đồng bộ giới hạn với UI trước khi xóa gesture/draft và hiển thị lỗi giữ nguyên dữ liệu; bắt lỗi IPC thay vì bỏ promise. Có thể rút gọn mẫu stroke trước khi gửi, nhưng không được âm thầm bỏ annotation.

### CR-03: [BLOCKER] Click ngoài chốt văn bản khi IME vẫn đang composition

**File:** `src/components/OverlaySurface.tsx:989-1004,1006-1025`

**Issue:** Handler capture `pointerdown` gọi `commitTextDraft` trước sự kiện blur/composition-end. Hàm luôn gọi `textDraftTransition(..., { isComposing: false })` và lấy `draft.value` từ React state, nên khi người dùng đang chọn ứng viên IME (ví dụ tiếng Việt/Trung/Nhật) rồi click ra ngoài, composition cuối chưa được áp dụng nhưng draft đã bị commit và hủy. Kết quả là chuỗi đang nhập bị cắt hoặc mất.

**Fix:** Theo dõi trạng thái composition (`compositionstart`/`compositionend`) và trì hoãn commit ngoài cho đến khi composition hoàn tất; đọc giá trị textarea cuối cùng sau khi nhận input/composition-end, rồi mới đóng draft.

## Warnings

### WR-01: [WARNING] Enter trên draft rỗng chèn newline mặc định

**File:** `src/components/OverlaySurface.tsx:964-977`; kiểm tra kỳ vọng tại `tests/e2e/editing-ink-lifecycle.e2e.ts:468-470`

**Issue:** Khi draft rỗng hoặc chỉ có khoảng trắng, `textDraftTransition(..., { type: "commit" })` trả lại draft và handler return mà không gọi `preventDefault()`. Trình duyệt vì vậy thực hiện hành vi mặc định của `<textarea>` và chèn newline. Điều này trái với kiểm tra E2E yêu cầu giá trị vẫn là chuỗi rỗng; người dùng có thể vô tình tạo dòng trống khi chỉ muốn giữ editor mở.

**Fix:** Trong nhánh không thể commit, gọi `event.preventDefault()` trước khi return; chỉ để hành vi mặc định chèn newline khi phím là Shift+Enter.

---

_Reviewed: 2026-09-12T06:04:44Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_

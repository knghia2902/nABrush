---
phase: 04-editing-ink-lifecycle
fixed_at: 2026-09-12T08:51:09Z
review_path: .planning/phases/04-editing-ink-lifecycle/04-REVIEW.md
iteration: 2
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 04: Báo cáo sửa code review

**Fixed at:** 2026-09-12T08:51:09Z  
**Source review:** `.planning/phases/04-editing-ink-lifecycle/04-REVIEW.md`  
**Iteration:** 2

**Summary:**
- Findings in scope: 6 (four from iteration 1; two new findings from the follow-up review)
- Fixed: 6
- Skipped: 0

## Các lỗi đã sửa

### CR-01: Snapshot scene hết hạn cũ ghi đè scene mới

**Files modified:** `src-tauri/src/overlay_registry.rs`, `src/App.tsx`  
**Commit:** `3087db0`  
**Applied fix:** Thêm revision tăng theo mutation/expiry vào snapshot native; mỗi overlay bỏ qua snapshot cùng scene có revision thấp hơn revision đã áp dụng.

### CR-02: Nội dung vượt giới hạn hoặc IPC thất bại bị mất âm thầm

**Files modified:** `src-tauri/src/overlay_registry.rs`, `src/App.tsx`, `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`  
**Commit:** `7552235`  
**Applied fix:** Đồng bộ giới hạn 4.096 điểm, 4.096 byte UTF-8 và 256 dòng. Stroke dài được lấy mẫu đều, giữ hai đầu và báo rõ; text quá giới hạn được giữ để sửa. Chỉ xóa draft/gesture sau IPC thành công; lỗi IPC giữ annotation trên overlay và cho phép retry hoặc bỏ tường minh.

### CR-03: Outside-click chốt text trước khi IME composition kết thúc

**Files modified:** `src/components/OverlaySurface.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`  
**Commit:** `cbbd541`  
**Applied fix:** Theo dõi composition; giữ draft khi outside-click/blur xảy ra giữa composition, rồi đọc giá trị textarea cuối sau frame tiếp theo trước khi commit. Thêm kịch bản WDIO với chuỗi tiếng Việt.

### WR-01: Enter trên draft rỗng chèn newline mặc định

**Files modified:** `src/components/OverlaySurface.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`  
**Commit:** `bc706e0`  
**Applied fix:** Ngăn hành vi mặc định của Enter trước khi xét draft rỗng/whitespace; chỉ Shift+Enter mới chèn newline. Bổ sung kỳ vọng E2E cho draft rỗng và whitespace-only.

### CR-04: Timeout IME có thể commit giữa một composition mới

**Files modified:** `src/components/OverlaySurface.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`  
**Commit:** `f900daf`  
**Applied fix:** `compositionstart` hủy timeout của composition trước; callback kiểm tra cờ composition trước khi chốt. Thêm E2E xác nhận composition thứ hai bắt đầu trước khi timer chạy thì draft vẫn mở và chỉ commit sau compositionend cuối.

### WR-02: Escape khi IME đang nhập có thể để cờ composition bị treo

**Files modified:** `src/components/OverlaySurface.tsx`, `tests/e2e/editing-ink-lifecycle.e2e.ts`  
**Commit:** `f900daf`  
**Applied fix:** Escape khi `nativeEvent.isComposing` được để IME xử lý trước. Helper hủy draft tập trung dọn cờ composition, trạng thái outside-click defer và timeout; E2E xác nhận Escape hủy draft rồi outside-click ở draft mới vẫn commit được.

## Xác minh — vòng 1

Các lệnh chạy trong main checkout vì `.planning/config.json` đặt `workflow.use_worktrees=false`.

- `pnpm build` — đạt.
- `pnpm exec tsc --noEmit` — đạt.
- `pnpm exec vitest run src/components/overlay-surface.test.tsx src/state/annotation.test.ts` — 2 test files, 40 tests đạt.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 54 Rust tests đạt.
- Lượt WDIO đầu của fixer không chạy được test case: `test_dispatch_action("Show")` trả `window not found` trước khi test bắt đầu. Sau đó debug session chạy WDIO trên host có monitor và đạt 4/4; vòng 2 cũng chạy lại toàn suite sau khi rebuild binary.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` — không đạt do formatter báo nhiều khác biệt định dạng trong project; không chạy formatter ghi file để tránh sửa ngoài phạm vi.

## Xác minh — vòng 2

Các lệnh chạy trên macOS hiện tại sau khi build lại app nhúng mà WDIO mở (`pnpm exec tauri build --debug`).

- `pnpm build` — đạt.
- `pnpm test` — 7 test files, 67 tests đạt.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 54 tests đạt.
- `TAURI_WEBDRIVER_PORT=4457 caffeinate -u -t 180 pnpm exec wdio run wdio.conf.ts --suite phase4-editing --logLevel error` — 4/4 đạt trên macOS/WebKit, gồm hai regression IME mới.

---

_Fixed: 2026-09-12T08:51:09Z_  
_Fixer: Codex_  
_Iteration: 2_

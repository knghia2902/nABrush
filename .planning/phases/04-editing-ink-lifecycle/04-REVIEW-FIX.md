---
phase: 04-editing-ink-lifecycle
fixed_at: 2026-09-12T07:43:47Z
review_path: .planning/phases/04-editing-ink-lifecycle/04-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 04: Báo cáo sửa code review

**Fixed at:** 2026-09-12T07:43:47Z  
**Source review:** `.planning/phases/04-editing-ink-lifecycle/04-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
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

## Xác minh

Các lệnh chạy trong main checkout vì `.planning/config.json` đặt `workflow.use_worktrees=false`.

- `pnpm build` — đạt.
- `pnpm exec tsc --noEmit` — đạt.
- `pnpm exec vitest run src/components/overlay-surface.test.tsx src/state/annotation.test.ts` — 2 test files, 40 tests đạt.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 54 Rust tests đạt.
- `pnpm exec wdio run wdio.conf.ts --suite phase4-editing` — chưa chạy được test case: app/embedded WebDriver khởi tạo được, nhưng hook `before all` dừng ở `test_dispatch_action("Show")` với `window not found`, trước khi test bắt đầu. `display_snapshot` trả lỗi này khi không có monitor khả dụng trong phiên macOS hiện tại. Cần chạy lại trên phiên macOS có monitor; Windows native WDIO cũng cần Windows runner.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` — không đạt do formatter báo nhiều khác biệt định dạng trong project; không chạy formatter ghi file để tránh sửa ngoài phạm vi.

---

_Fixed: 2026-09-12T07:43:47Z_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_

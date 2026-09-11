---
status: complete
quick_id: 260911-udb
---

# Summary

Đã cho phép di chuyển text đã commit và thu gọn khung nhập text.

## Thay đổi

- Công cụ Text nhận diện text đã viết, kéo preview realtime và lưu vị trí mới khi thả chuột.
- Thêm lệnh Tauri/SceneStore để cập nhật và broadcast anchor mới của text.
- Textarea nhập bản nháp tự co theo nội dung, với kích thước mặc định gọn hơn.
- Bổ sung kiểm thử Rust, frontend và native E2E cho hai hành vi trên.

## Verification

- `pnpm exec vitest run src/state/annotation.test.ts src/components/overlay-surface.test.tsx` — 29 tests passed
- `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` — 12 tests passed
- `pnpm build` — passed
- `pnpm exec tauri build --debug --no-bundle` — passed
- Native WDIO text test — 1 passed

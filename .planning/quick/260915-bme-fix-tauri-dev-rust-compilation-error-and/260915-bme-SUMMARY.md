---
status: complete
quick_id: 260915-bme
---

# Summary

Đã khắc phục lỗi biên dịch Rust (`tauri_plugin_wdio` unresolved module) và cảnh báo unused imports trong quá trình chạy Tauri dev.

## Thay đổi

- `src-tauri/src/main.rs`: Xoá lời gọi `.plugin(tauri_plugin_wdio::init())` không hợp lệ vì crate phụ thuộc là `tauri_plugin_wdio_webdriver`.
- `src-tauri/src/tracer.rs`: Chuyển các kiểu dữ liệu chỉ dùng trong unit test (`DisplayOrientation`, `DisplayPoint`, `DisplaySize`) vào phạm vi `mod tests` để loại bỏ cảnh báo unused import.

## Verification

- `cargo check --manifest-path src-tauri/Cargo.toml` — passed (0 errors, loại bỏ hoàn toàn cảnh báo trong tracer.rs).
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed (54 tests passed).
- `pnpm build` — passed (tsc --noEmit & vite build).
- `cargo build` — passed (biên dịch và link file thực thi thành công).

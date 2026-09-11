---
status: complete
quick_id: 260911-e0s
plan: 01
description: "Đưa toolbar bên trái, thiết kế lại theo cảm hứng từ mẫu và cho phép kéo di chuyển"
started: 2026-09-11T03:05:44Z
completed: 2026-09-11T03:32:00Z
commits: 4
plan_head_before: 04af113
---

## Accomplished

- Chuyển annotation toolbar thành palette dọc nổi ở bên trái với hierarchy, màu sắc,
  grip và glyph riêng; không sao chép asset hay layout của hình tham khảo.
- Thêm drag handle scene-excluded với pointer capture, giữ offset, cleanup khi up/cancel/
  lost-capture/blur và clamp toàn bộ toolbar trong viewport; resize sẽ re-clamp.
- Thêm di chuyển bằng Arrow và Shift+Arrow, giữ nguyên tool order, property popover,
  aria state, focus-visible và click-through visibility contract.
- Bổ sung regression test cho markup/position/keyboard và native E2E assertion chứng minh
  drag toolbar không làm thay đổi scene hoặc canvas gesture state.

## Files Changed

- `src/components/AnnotationToolbar.tsx`
- `src/components/annotation-toolbar.test.tsx`
- `src/styles.css`
- `tests/e2e/core-annotation-tools.e2e.ts`

## Verification

| Command | Result |
|---|---|
| `pnpm exec vitest run src/components/annotation-toolbar.test.tsx` | PASS — 1 file, 5 tests |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm test` | PASS — 7 files, 54 tests |
| `pnpm build` | PASS |
| `pnpm exec wdio run wdio.conf.ts --suite phase3-tools` | BLOCKED — embedded macOS WebKit reaches window setup but fails before gestures with `Tauri invoke bridge unavailable`; exit 1 |

## Commits

- `f08c31d` feat(quick-260911-e0s-01): add draggable left annotation palette
- `cbc0808` feat(quick-260911-e0s-01): document toolbar keyboard movement steps
- `5fc0c97` test(quick-260911-e0s-01): add keyboard movement marker regression
- `2ddfa6e` test(quick-260911-e0s-01): prove toolbar drag scene isolation

## Notes

The native WebDriver limitation is environmental and was recorded honestly; it does not
count as native UAT approval. macOS/Windows manual testing remains required through AnyDesk
or a separate Windows host.

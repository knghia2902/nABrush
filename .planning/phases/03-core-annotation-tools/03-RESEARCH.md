# Phase 03: Core Annotation Tools - Research

**Researched:** 2026-09-11  
**Domain:** retained Canvas 2D annotation scene, Tauri/Rust IPC, multi-display input  
**Confidence:** MEDIUM — các seam hiện tại và test baseline có bằng chứng trực tiếp; các lựa chọn schema, ngưỡng hình học và chi tiết toolbar vẫn là quyết định cần planner chốt.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Bảng tool và thuộc tính

- **D3-01:** Toolbar luôn hiển thị trong chế độ vẽ và đặt ở cạnh dưới màn hình. Toolbar
  là UI chrome, không phải scene item và không được đi vào export.
- **D3-02:** Click một lần để chọn tool; tool được chọn tiếp tục áp dụng cho các nét
  tiếp theo.
- **D3-03:** Toolbar giữ gọn; click nút thuộc tính sẽ mở một bảng nhỏ cho tool đang
  chọn thay vì luôn phơi tất cả control.
- **D3-04:** Màu, opacity, width, fill và cỡ chữ được nhớ riêng theo từng tool trong
  phiên chạy hiện tại. Không cần đưa session style vào cloud hay database.
- **D3-05:** Nét mặc định phải thon hơn hiện tại, đặc biệt với pen, line, arrow và
  outline; người dùng vẫn có thể chỉnh width. Con số width mặc định cụ thể để kế
  hoạch xác định và kiểm tra bằng preview trực quan.

### Nét và hình học

- **D3-06:** Pointer path đang hoạt động được render trong transient preview theo thời
  gian thực; chỉ commit vào retained scene khi thao tác hợp lệ kết thúc.
- **D3-07:** Kéo line, arrow, rectangle hoặc ellipse dưới ngưỡng nhỏ không tạo item.
- **D3-08:** Arrow dùng đầu mũi tên tam giác đặc, gọn và dễ nhìn.
- **D3-09:** Rectangle và ellipse có lựa chọn fill riêng và giữ style riêng theo từng
  tool; stroke, fill và opacity đều là thuộc tính của shape tương ứng.
- **D3-10:** Nhấn `Esc` hoặc kết thúc thao tác ngoài vùng overlay sẽ hủy preview hiện
  tại, không thay đổi scene đã có.

### Text

- **D3-11:** Click một điểm trên canvas sẽ đặt con trỏ text tại điểm đó và bắt đầu nhập
  ngay, không yêu cầu kéo khung trước.
- **D3-12:** `Enter` commit text nháp, `Shift + Enter` chèn dòng mới, và `Esc` hủy
  text nháp. Hủy không được thay đổi các annotation hiện có.
- **D3-13:** Phase 3 chỉ cho phép chỉnh text trước khi commit. Chỉnh text đã commit
  được để Phase 4 cùng với selection/editing sâu hơn.

### Eraser

- **D3-14:** Eraser dùng click để xóa đúng một annotation; thao tác kéo không xóa
  hàng loạt.
- **D3-15:** Khi annotation chồng lên nhau, eraser chọn item được tạo sau cùng (item
  nằm trên cùng).
- **D3-16:** Hit-area phụ thuộc loại item: stroke bắt theo đường tâm cộng vùng đệm;
  shape bắt theo vùng fill hoặc viền; text bắt theo khung chữ.
- **D3-17:** Khi rê chuột bằng eraser, item mục tiêu được highlight trước; click mới
  thực hiện xóa.

[VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:21-67]

### the agent's Discretion

- Chọn giá trị số cụ thể cho width/opacity mặc định, ngưỡng kéo tối thiểu và bán kính
  hit-test, miễn giữ đúng yêu cầu nét mảnh và dễ thao tác.
- Chọn màu mặc định, opacity fill mặc định, kiểu highlight preview và chi tiết hình
  học nội bộ của đầu mũi tên trong khuôn khổ đầu tam giác đặc.
- Chọn cách trình bày bảng thuộc tính nhỏ, kích thước toolbar, khoảng cách cạnh dưới,
  focus/accessibility treatment và cách toolbar ẩn ngoài chế độ vẽ, miễn toolbar
  không chặn click-through hoặc lọt vào scene/export.
- Chọn mô hình editor tạm thời phù hợp với hành vi bàn phím đã khóa; không mở rộng
  thành editor cho text đã commit.

[VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:69-79]

### Deferred Ideas (OUT OF SCOPE)

- Editing text after it has been committed and general object selection/editing —
  Phase 4.
- Undo/redo, clear-all and bulk erasing — Phase 4.
- Persistent/vanishing ink lifecycle controls and per-session setting persistence as a
  broader editing workflow — Phase 4.
- Capture, composition and PNG/clipboard export — Phase 5.
- Stylus pressure, snapshots, collaboration, cloud sync, AI/OCR and document-style
  whiteboard behavior — v2 or outside the product boundary.

[VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:198-209]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAW-01 | User can draw freehand strokes with configurable color, opacity, and width. | Mở rộng transient stroke hiện có thành typed stroke + style; test preview, commit và per-tool style trong `src/components/overlay-surface.test.tsx` [VERIFIED: .planning/REQUIREMENTS.md:25-32]. |
| DRAW-02 | User can draw a semi-transparent highlighter stroke with configurable color, opacity, and width. | Dùng cùng path/coordinate pipeline với pen, khác style/compositing; giữ retained semantic item thay vì raster riêng [VERIFIED: .planning/REQUIREMENTS.md:27-28]. |
| DRAW-03 | User can draw straight lines and arrows with configurable color, opacity, and width. | Dùng start/end geometry, transient preview và arrowhead tam giác đặc theo D3-06…D3-08 [VERIFIED: .planning/REQUIREMENTS.md:29-29; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:40-43]. |
| DRAW-04 | User can draw rectangles and ellipses with configurable stroke and fill/opacity settings. | Dùng bounds canonical, stroke/fill style và `CanvasRenderingContext2D.ellipse()` [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse]. |
| DRAW-05 | User can create, edit, commit, or cancel a text annotation with configurable color and text size. | Dùng draft editor tạm thời, `Enter`, `Shift + Enter`, `Esc`, IME guard và canvas text metrics; không mở editor text đã commit [VERIFIED: .planning/REQUIREMENTS.md:31-31; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:51-56]. |
| DRAW-06 | User can erase an annotation using an eraser tool without affecting unrelated annotations. | Reverse-order hit-test + `erase_scene_item` một ID + full snapshot broadcast; drag không được gọi erase nhiều lần [VERIFIED: .planning/REQUIREMENTS.md:32-32; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:60-67]. |
</phase_requirements>

## Summary

`OverlaySurface` hiện là seam đúng để mở rộng: nó đã có `viewportSize`, backing canvas theo scale factor, canonical/viewport transforms, pointer capture và transient preview; nhưng chỉ vẽ `kind === "stroke"`, style còn hard-code trong `redraw`, và chỉ expose `onCommitStroke` [VERIFIED: src/components/OverlaySurface.tsx:8-20,45-57,96-117,120-150,166-193]. Giữ một renderer Canvas 2D với scene semantic đã retain, tách committed scene khỏi transient gesture, rồi thêm typed geometry/style/hit-test helpers dùng chung cho mọi tool [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas].

`SceneStore` hiện dùng `Vec<Value>`, chỉ allowlist `"stroke" | "shape" | "text"`, kiểm tra ID/finite numbers và deduplicate ID trước khi push; `commit_scene_item` sau đó phát whole-scene snapshot qua global event `"scene-changed"` [VERIFIED: src-tauri/src/overlay_registry.rs:39-44,46-90,93-113,277-283]. Planner nên thay validation lỏng bằng Rust typed discriminator/struct payloads, thêm mutation erase nguyên tử và giữ nguyên snapshot/broadcast contract; frontend tiếp tục hydrate bằng `get_scene_snapshot`, lắng nghe `scene-changed`, và không biến toolbar/draft thành scene item [VERIFIED: src/App.tsx:28-65; CITED: https://v2.tauri.app/develop/calling-rust/].

**Primary recommendation:** dùng một shared retained scene với `kind` phân loại ổn định và `tool`/payload/style typed, một pipeline pointer-to-canonical cho preview/commit, một reverse hit-test cho eraser, và Rust là trusted validation/mutation boundary; không thêm package mới [ASSUMED] cho chi tiết schema, nhưng phù hợp với stack và UI contract hiện tại [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-UI-SPEC.md:27-29].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pointer gesture, transient preview, canonical conversion | Browser / Client | Frontend Server — | `OverlaySurface` đã sở hữu pointer capture, transient React state và conversion theo viewport [VERIFIED: src/components/OverlaySurface.tsx:127-192]. |
| Canvas rendering của stroke/line/arrow/shape/text | Browser / Client | — | Canvas 2D cung cấp stroke/fill/text/ellipse; renderer cần đọc scene semantic, không làm source of truth [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D]. |
| Toolbar, property popover, per-tool style state, text draft | Browser / Client | — | `main` hiện `pointer-events: none`; descendants tương tác phải opt-in và chrome không được vào scene/export [VERIFIED: src/styles.css:3-15; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:166-180]. |
| Typed scene validation, commit, erase, stable IDs, snapshot | API / Backend (Rust) | Browser / Client | `SceneStore` và Tauri commands đang là native source of truth; Tauri command args phải Deserialize được và kết quả trả qua Promise [VERIFIED: src-tauri/src/main.rs:209-254; CITED: https://v2.tauri.app/develop/calling-rust/]. |
| Multi-display placement/DPR/orientation | Database / Storage — | Browser / Client + native overlay | Native display descriptor và client transform cùng giữ canonical desktop logical coordinates; không tạo display-local document [VERIFIED: src-tauri/src/display.rs:58-86,226-255; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:153-161]. |

## Current Code and Test Seam

- `src/components/OverlaySurface.tsx`: `normalizePointerPath()` lấy `clientX/clientY` từ `getBoundingClientRect()`, clamp viewport, rồi đưa về canonical; `drawScene()` hiện clear toàn canvas và vẽ scene + transient stroke [VERIFIED: src/components/OverlaySurface.tsx:60-117].
- `src/components/overlay-surface.test.tsx`: đã có regression cho negative origin, cả bốn rotation, DPR backing size, clamp, pointer-up canonical path, retained-scene isolation và transient draw [VERIFIED: src/components/overlay-surface.test.tsx:23-139]. Mở rộng chính file này cho geometry/style/hover helper trước khi thêm E2E.
- `src/App.tsx`: hydrate `sceneId/items`, listen `overlay-mode-changed`, `overlay-viewport-changed`, `scene-changed`, rồi invoke `commit_scene_item`; Phase 3 cần truyền tool/style và `onErase` nhưng giữ snapshot event làm đồng bộ cuối cùng [VERIFIED: src/App.tsx:28-65].
- `src/types/overlay.ts`: `StrokeSceneItem` hiện chỉ là `{ id, kind: "stroke", points }`; `SceneItem` còn `{ id, kind: "shape" | "text" }`, nên shape/text chưa có payload typed [VERIFIED: src/types/overlay.ts:14-40].
- `src/types/platform-parity.ts`: `TOOL_ORDER` đã khóa đúng `pen`, `highlighter`, `line`, `arrow`, `rectangle`, `ellipse`, `text`, `eraser`; không tạo vocabulary platform-specific mới [VERIFIED: src/types/platform-parity.ts:13-23].
- Baseline hiện tại: `pnpm typecheck`, `pnpm test -- --runInBand` (30 tests) và `cargo test --manifest-path src-tauri/Cargo.toml` (35 native tests) đều pass trong session này [VERIFIED: command probe 2026-09-11].

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Canvas 2D `CanvasRenderingContext2D` | platform WebView | Render retained annotations + transient preview | Có API chuẩn cho `strokeStyle`, `fillStyle`, `lineWidth`, `lineCap`, `lineJoin`, `fillText`, `measureText`, `ellipse`; DPR backing + context scale phù hợp overlay trong suốt [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D; https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas]. |
| `@tauri-apps/api` | 2.11.1 trong repo | `invoke`, `listen`, window/event boundary | Đã dùng trong `src/App.tsx`; Tauri docs xác nhận JSON object camelCase args, typed `listen<T>` và Promise result [VERIFIED: package.json:21-25; src/App.tsx:1-4,33-65; CITED: https://v2.tauri.app/develop/calling-rust/]. |
| Rust + `serde`/`serde_json` | 1.98.1 toolchain; 1.0.229/1.0.151 trong repo | Typed scene model và validation native | Native boundary đã có `serde` derive và JSON snapshot; internally tagged enum là pattern chính thức cho struct variants [VERIFIED: src-tauri/Cargo.toml:16-20; CITED: https://serde.rs/enum-representations.html]. |
| React + TypeScript | React 19.2.8; TypeScript 7.0.2 | Toolbar/draft/popover/state orchestration | Đã là frontend stack; giữ drawing engine ở helper thuần để React không sở hữu toàn bộ pointer raster loop [VERIFIED: package.json:21-39]. |

### Supporting

| Library/API | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `Vitest` | 5.0.0 trong repo | Pure helper tests cho geometry, style, draft, hit-test | Mọi thuật toán deterministic, không cần DOM; config hiện dùng `environment: "node"` [VERIFIED: package.json:27-39; vitest.config.ts:1-10]. |
| `cargo test` | Rust 1.98.1 | Rust SceneStore typed validation/mutation tests | Test reject malformed payload, duplicate ID, erase one item và snapshot invariants [VERIFIED: command probe 2026-09-11; src-tauri/src/overlay_registry.rs:354-430]. |
| WebdriverIO + `@wdio/tauri-service` | 9.31.7 / 1.4.0 trong repo | Native E2E cho tool selection, pointer flow, mode safety | Chỉ dùng cho smoke trên macOS/Windows thật; config đã dùng embedded provider [VERIFIED: package.json:32-36; wdio.conf.ts:7-35]. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas 2D retained scene | SVG node-per-annotation | Không dùng: DOM churn và hit-test/render coupling tăng theo pointer frequency [VERIFIED: AGENTS.md:80-88]. |
| Typed Rust payload | tiếp tục `serde_json::Value` + kind check | Không dùng: payload geometry/style mới sẽ lọt qua nếu không có positive validation ở trusted service layer [CITED: https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation]. |
| Manual toolbar CSS | component library mới | Không dùng: UI contract đã chỉ rõ không có component library và không thêm frontend dependency cho phase trước [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-UI-SPEC.md:17-29]. |

**Installation:** Không có lệnh cài package cho Phase 3; dùng dependency và lockfile hiện có [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-UI-SPEC.md:27-29]. `npm view` trong session xác nhận registry hiện có các package đã pin; không nâng version trong plan vì phase không yêu cầu dependency change [VERIFIED: npm registry probe 2026-09-11].

## Package Legitimacy Audit

Không áp dụng: Phase 3 không cài external package mới; `package.json` và `src-tauri/Cargo.toml` đã cung cấp stack hiện hữu [VERIFIED: package.json:21-39; src-tauri/Cargo.toml:13-29]. Nếu planner phát sinh package mới, phải chạy `gsd_run query package-legitimacy check --ecosystem npm|crates ...` trước khi thêm.

## Architecture Patterns

### System Architecture Diagram

```text
Pointer/keyboard event
        |
        v
OverlaySurface -> viewportToCanonical -> tool gesture reducer
        |                                      |
        |                               transient preview
        |                                      |
        +--> toolbar/style/text draft ----------+
                                               |
                         valid pointer-up / Enter commit
                                               v
                         Tauri invoke -> Rust SceneStore validation
                                               |
                                 commit or erase exactly one ID
                                               v
                              whole SceneSnapshot + scene-changed
                                               |
                                               v
                         every display viewport -> Canvas 2D redraw
```

Data flow này giữ client lo phần tương tác/preview, Rust lo validation/mutation, và mọi viewport nhận cùng snapshot; đây là mở rộng trực tiếp của `commit_scene_item`/`broadcast_scene` hiện có [VERIFIED: src-tauri/src/main.rs:236-253; src-tauri/src/overlay_registry.rs:277-283].

### Recommended Project Structure

Giữ các integration points hiện có: `src/components/OverlaySurface.tsx`, `src/App.tsx`, `src/types/overlay.ts`, `src-tauri/src/overlay_registry.rs`, `src-tauri/src/main.rs`, `src/components/overlay-surface.test.tsx`; có thể tách pure helpers mới dưới `src/drawing/` chỉ khi planner muốn giảm kích thước `OverlaySurface.tsx` [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:120-180; ASSUMED: tên thư mục `src/drawing/`]. Không tạo database/session persistence trong phase [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:198-206].

### Pattern 1: Typed discriminated retained scene

**Use:** giữ `SceneItem` là discriminated union có `id`, category `kind`, exact `tool`, canonical geometry, và immutable style snapshot. Khuyến nghị giữ `kind` hiện có (`"stroke"`, `"shape"`, `"text"`) để không phá wire envelope, rồi thêm `tool` (`pen`/`highlighter`/`line`/`arrow`/`rectangle`/`ellipse`/`text`) và payload typed; đây là quyết định schema mới cần planner khóa [ASSUMED].

Rust nên deserialize cùng discriminator bằng `#[serde(tag = "type")]` hoặc một enum struct tương đương, bật reject unknown fields/range validation phù hợp; Serde xác nhận internal tag nằm cạnh fields và phù hợp struct variants [CITED: https://serde.rs/enum-representations.html; https://serde.rs/attributes.html]. Không dùng untagged enum vì nó không có discriminator và match theo thứ tự variant [CITED: https://serde.rs/enum-representations.html].

Validation tối thiểu: ID không rỗng/bounded; mọi số finite và trong display bounds; points có tối thiểu hai điểm với stroke; line/shape có start/end hoặc bounds hợp lệ; text có vị trí, text bounded và style hợp lệ; fill/opacity/width nằm trong range dương/0…1. Các range số cụ thể cần planner chốt [ASSUMED].

### Pattern 2: Gesture state machine with transient preview

Giữ `samplesRef` cho input frequency nhưng luôn derive `transientItem` bằng React state khi pointer move; `pointerdown` gọi `setPointerCapture`, `pointerup`/`pointercancel` release và clear, chỉ commit item hợp lệ. MDN xác nhận capture route các pointer event tiếp theo về element cho đến release hoặc pointerup [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture]. Debug đã chứng minh refs đơn thuần không trigger redraw và fix hiện tại dùng transient state [VERIFIED: .planning/debug/stroke-not-realtime.md:25-50].

Mọi tool dùng một lifecycle: pointer-down ghi anchor/path; pointer-move tạo preview; pointer-up tạo candidate; reducer bỏ candidate dưới threshold; commit async chỉ sau khi scene validation thành công. `Esc`, mode đổi, pointer cancel và mất focus phải abort preview, release capture và không gọi native mutation [ASSUMED; locked behavior: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:40-47].

### Pattern 3: Geometry rendering and hit-testing share canonical helpers

Render và hit-test phải nhận cùng canonical item rồi apply `canonicalToViewport` đúng một lần. `viewportSize()` đổi width/height cho `degrees90`/`degrees270`; backing size round logical dimensions × `scaleFactor`; tests đã khóa negative origin, rotations và DPR [VERIFIED: src/components/OverlaySurface.tsx:8-20,45-57; src/components/overlay-surface.test.tsx:50-86]. Không multiply style width thêm lần nữa sau `context.setTransform(dpr, 0, 0, dpr, 0, 0)` [VERIFIED: src/components/OverlaySurface.tsx:134-150].

Canvas implementation: line/arrow dùng moveTo/lineTo; arrowhead tính vector endpoint và vẽ path tam giác đặc; rectangle dùng stroke/fill rect; ellipse dùng center/radii với `ellipse()` rồi stroke/fill; text set `font`/`fillStyle` và vẽ từng dòng. `measureText()` trả `TextMetrics`, phù hợp dựng text hit bounds [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse; https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText; https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText].

### Pattern 4: Snapshot mutation boundary

Frontend gọi `invoke("commit_scene_item", { item })`-style command và nhận `SceneSnapshot`; Rust lock store, validate typed item, deduplicate ID, mutate, clone snapshot, emit `"scene-changed"`, rồi return snapshot. Tauri docs xác nhận command args là JSON object/camelCase, return là Promise, global event tới mọi listener và `listen<T>` hỗ trợ typed payload [VERIFIED: src-tauri/src/main.rs:236-253; CITED: https://v2.tauri.app/develop/calling-rust/]. Erase phải dùng cùng boundary: nhận một `id`, remove tối đa một matching item, broadcast snapshot kể cả no-op để UI deterministic [ASSUMED].

### Pattern 5: Text draft as scene-excluded editor

Click text tool tạo draft `{ anchor, value, style }` ở client, focus một `textarea`/input overlay scene-excluded; không tạo `SceneItem` cho đến commit. `event.key === "Enter"` commit khi không `Shift` và không IME composition; `Shift + Enter` giữ newline; `Escape` cancel; `KeyboardEvent.key` phản ánh layout/modifier, `shiftKey` là boolean modifier, và `CompositionEvent` đại diện indirect text input [CITED: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key; https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/shiftKey; https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent]. Không commit khi `isComposing` để tránh cắt IME draft [ASSUMED].

### Pattern 6: Eraser preview then single mutation

Khi `tool === "eraser"`, pointer move chỉ tính `hoveredItemId` và render highlight transient; pointer down gọi erase đúng ID, không set pointer capture cho drag erase. Iterate `scene` từ cuối về đầu để item push sau cùng thắng; `SceneStore.commit_scene_item` hiện push item mới vào cuối và deduplicate theo ID [VERIFIED: src-tauri/src/overlay_registry.rs:80-87]. Hit-test: stroke point-to-polyline distance + half-width/padding; shape fill trước rồi stroke ring; ellipse dùng normalized equation/ring tolerance; text dùng measured line bounds. Công thức và padding là implementation choices cần unit-test [ASSUMED].

### Anti-Patterns to Avoid

- **Hard-code one red 4px style:** `redraw` hiện đặt `strokeStyle = "rgba(239, 68, 68, 0.92)"` và `lineWidth = 4`; chuyển style vào từng retained item để pen/highlighter/shape/text không biến thành một visual [VERIFIED: src/components/OverlaySurface.tsx:143-149].
- **Vẽ trực tiếp vào scene khi pointer move:** phá D3-06 và tạo item rác; chỉ state transient được thay đổi cho preview [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:40-47].
- **Hit-test theo DOM/canvas pixel:** không ổn định qua rotation/DPR; dùng canonical geometry và transform helpers hiện có [VERIFIED: src/components/OverlaySurface.tsx:45-72].
- **Để toolbar nằm trong canvas scene hoặc bật pointer events toàn `main`:** toolbar sẽ lọt export/chặn click-through; chỉ descendants chrome opt-in `pointer-events: auto`, và ẩn/không tương tác ngoài drawing mode theo quyết định UI [VERIFIED: src/styles.css:3-5; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:26-33,75-77].
- **Chỉ validate ở TypeScript:** webview payload là untrusted; positive validation phải ở Rust trusted service layer [CITED: https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation].
- **Xóa qua nhiều viewport riêng:** mọi overlay phải nhận một shared scene snapshot; erase chỉ mutate native store một lần rồi broadcast [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:153-161; src-tauri/src/overlay_registry.rs:277-283].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pointer continuity | Global mouse hook riêng cho canvas | Pointer Events + `setPointerCapture` | Native/browser API đã route pointer sau khi rời bounds; giữ pointerId và release đúng lifecycle [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture]. |
| DPR crispness | Pixel coordinate system riêng cho từng tool | `viewportBackingSize`, `context.setTransform(dpr,...)`, canonical helpers | Các helper và tests hiện đã chứng minh mixed scale/rotation/negative origin [VERIFIED: src/components/OverlaySurface.tsx:15-20,134-150; src/components/overlay-surface.test.tsx:50-86]. |
| Text layout | Rich-text/editor framework hoặc DOM-per-committed-text | Draft `textarea` + Canvas `fillText`/`measureText` | Phase chỉ cần pre-commit editing; Canvas có text API/metrics chuẩn [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:51-56; CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText]. |
| IPC event sync | Event bus frontend thứ hai | Tauri `invoke`, `listen<SceneEventPayload>`, `scene-changed` | Đã có command/snapshot/event seam; global event phù hợp nhiều display webviews [VERIFIED: src/App.tsx:33-48; src-tauri/src/overlay_registry.rs:277-283; CITED: https://v2.tauri.app/develop/calling-rust/]. |
| Undo/erase history | Pixel snapshots hoặc custom history trong phase này | Deferred Phase 4 `CommandHistory`; Phase 3 chỉ single erase mutation | Context khóa undo/redo và bulk erase ở Phase 4 [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:201-205]. |

**Key insight:** source of truth phải là semantic scene, vì cùng model này phục vụ render trên nhiều viewport, topmost hit-test và các phase editing/export sau; transient raster chỉ là frame feedback [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:153-164].

## Common Pitfalls

### Pitfall 1: DPR bị áp dụng hai lần

**What goes wrong:** nét dày/gấp đôi hoặc hit-test lệch trên scale factor khác 1.  
**Why it happens:** style width đã ở logical canvas units nhưng bị nhân thêm scale trong geometry helper.  
**How to avoid:** backing canvas nhân `scaleFactor`, context transform nhân một lần, geometry/style vẫn logical.  
**Warning signs:** test `viewportBackingSize` pass nhưng visual pen/shape sai trên `scaleFactor: 2` [VERIFIED: src/components/OverlaySurface.tsx:15-20,134-150; src/components/overlay-surface.test.tsx:66-69].

### Pitfall 2: Preview stale hoặc commit preview thành item

**What goes wrong:** item xuất hiện hai lần, preview không realtime, hoặc Esc vẫn để lại nét.  
**Why it happens:** giữ samples trong ref nhưng không set state; hoặc clear transient sau native commit thay vì trước lifecycle end.  
**How to avoid:** derive transient state mỗi move, clear trên cancel/Esc/mode change, commit một candidate duy nhất trên valid end [VERIFIED: .planning/debug/stroke-not-realtime.md:42-50].

### Pitfall 3: Rotated/negative-origin hit-test sai display

**What goes wrong:** annotation nhìn đúng nhưng eraser xóa item khác hoặc không bắt được.  
**Why it happens:** hit-test ở viewport pixels, bỏ qua inverse rotation/origin.  
**How to avoid:** pointer → `viewportToCanonical`, hit-test canonical, render → `canonicalToViewport`; giữ clamp behavior đã test [VERIFIED: src/components/OverlaySurface.tsx:45-72; src/components/overlay-surface.test.tsx:50-86].

### Pitfall 4: Toolbar bắt click-through

**What goes wrong:** underlying app không nhận click hoặc toolbar không thể dùng sau khi native `set_ignore_cursor_events(true)`.  
**Why it happens:** CSS pointer-events bị xem là native hit-test authority; `main`/canvas layering không tách chrome.  
**How to avoid:** toolbar/property popover là sibling scene-excluded, opt-in pointer events chỉ ở `VisibleInteractive`; native adapter vẫn điều khiển click-through toàn overlay [VERIFIED: src-tauri/src/overlay_registry.rs:329-333; src/styles.css:3-5; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:166-180].

### Pitfall 5: Enter phá IME hoặc newline

**What goes wrong:** text commit giữa composition hoặc `Shift + Enter` không chèn dòng mới.  
**Why it happens:** chỉ kiểm tra `keyCode`/keypress, không xét `key`, `shiftKey`, `isComposing`.  
**How to avoid:** xử lý `keydown` theo `key === "Enter"`, rẽ nhánh `shiftKey`, bỏ qua khi composing; `Escape` cancel draft only [CITED: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key; https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/shiftKey; https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent].

### Pitfall 6: Rust accepts malformed style/geometry

**What goes wrong:** frontend render được nhưng viewport khác hoặc native snapshot chứa NaN-like/oversized/unknown payload.  
**Why it happens:** validator hiện chỉ kiểm tra object, ID, 3 kind và finite JSON; chưa kiểm tra field schema/ranges [VERIFIED: src-tauri/src/overlay_registry.rs:93-113].  
**How to avoid:** deserialize typed enum, reject unknown/missing fields, validate positive geometry/ranges/text bounds in Rust, test every invalid class [CITED: https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation].

## Code Examples

### Existing transient and native mutation seam to preserve

```typescript
setTransientStroke(transientStrokeForSamples(samplesRef.current, event.currentTarget.getBoundingClientRect(), viewport));
onCommitStroke(createStroke(`stroke-${nextStrokeIdRef.current}`, points));
```

Đây là pattern hiện tại: move chỉ set transient, pointer-up mới gọi commit; mở rộng bằng `transientSceneItemForGesture` và typed callbacks thay vì tạo một canvas path thứ hai [VERIFIED: src/components/OverlaySurface.tsx:174-193].

```rust
app.emit("scene-changed", snapshot)
```

Giữ global whole-snapshot event sau commit/erase; frontend đã listen typed `SceneEventPayload` và cleanup unlisten trong effect [VERIFIED: src-tauri/src/overlay_registry.rs:277-283; src/App.tsx:42-56; CITED: https://v2.tauri.app/develop/calling-rust/].

### Typed Rust direction

Serde’s documented internal-tag form is:

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
enum Message {
    Request { id: String, method: String, params: Params },
    Response { id: String, result: Value },
}
```

Phase 3 nên áp dụng cùng hình thức cho scene struct variants, thay `Message`/`Request`/`Response` bằng vocabulary scene đã khóa; tên enum/field cụ thể là `[ASSUMED]` cho đến khi planner chốt schema [CITED: https://serde.rs/enum-representations.html].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ref-only pointer samples, redraw committed scene only | React transient preview + retained commit | 2026-09-10 debug resolution | Realtime preview không mutate scene; regression đã có [VERIFIED: .planning/debug/stroke-not-realtime.md:42-50]. |
| Generic `serde_json::Value` scene item | Typed discriminated struct payload validated in Rust | Phase 3 planned change | Bắt schema/range errors tại trusted boundary; exact wire schema còn `[ASSUMED]` [VERIFIED: src-tauri/src/overlay_registry.rs:39-113; CITED: https://serde.rs/enum-representations.html]. |
| Single primary-display assumptions | Shared canonical scene over per-display viewport transforms | Phase 2 completed foundation | Tool geometry có thể render/hit-test xuyên negative origin, rotation và mixed DPR [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-CONTEXT.md:18-30; src/components/overlay-surface.test.tsx:50-86]. |

**Deprecated/outdated:** không dùng `kind: "shape" | "text"` payload rỗng như wire model cuối cùng; đó chỉ là scaffold hiện tại cần mở rộng typed payload [VERIFIED: src/types/overlay.ts:24-26]. Không đưa ScreenCaptureKit/Windows.Graphics.Capture, export, undo/redo hoặc persistent/vanishing scheduler vào phase này [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:198-209].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite/TypeScript/Vitest | ✓ | v25.8.2 | Dùng project engine `>=24.0.0`; CI nên pin Node 24.x theo stack [VERIFIED: command probe 2026-09-11; package.json:7-10]. |
| pnpm | install/test/build | ✓ | 11.19.0 | `pnpm` hiện là fallback runtime path nhưng command hoạt động [VERIFIED: command probe 2026-09-11; package.json:7]. |
| Tauri CLI | native dev/build/E2E | ✓ | 2.11.4 | `pnpm exec tauri` [VERIFIED: command probe 2026-09-11]. |
| Rust/cargo | SceneStore + native tests | ✓ | rustc/cargo 1.98.1 | `cargo test --manifest-path src-tauri/Cargo.toml` [VERIFIED: command probe 2026-09-11]. |
| macOS native host | overlay behavior | ✓ | host hiện tại | Chạy manual/native E2E trên host macOS [VERIFIED: filesystem workspace `/Users/khacnghia/Desktop/Tools/nABrush` và command probe]. |
| Windows native host | parity/full-screen/click-through | No observation in this shell | — | Bắt buộc runner/host Windows cho cross-platform E2E; không suy diễn support từ macOS [ASSUMED]. |

**Missing dependencies with no fallback:** chưa phát hiện dependency code/build nào bị thiếu trên host hiện tại [VERIFIED: command probe 2026-09-11].  
**Missing dependencies with fallback:** Windows hardware/runner chưa có observation; fallback là CI/manual Windows matrix trước khi khóa phase [ASSUMED].

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 + Rust `cargo test` [VERIFIED: package.json:27-39; src-tauri/Cargo.toml:16-20] |
| Config file | `vitest.config.ts` — `environment: "node"`, include `src/**/*.test.{ts,tsx}` [VERIFIED: vitest.config.ts:4-10] |
| Quick run command | `pnpm exec vitest run src/components/overlay-surface.test.tsx` [VERIFIED: package.json:11-19; src/components/overlay-surface.test.tsx:1-13] |
| Full suite command | `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml` [VERIFIED: package.json:11-19; command probe 2026-09-11] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---------|----------|-----------|-------------------|--------------|
| DRAW-01 | Pen path realtime, style snapshot, valid commit | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx` | ✅ extend existing |
| DRAW-02 | Highlighter style independent from pen | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx` | ✅ extend existing |
| DRAW-03 | Line/arrow geometry preview, threshold, arrowhead | unit + native E2E | `pnpm exec vitest run src/components/overlay-surface.test.tsx` + future phase-3 WebdriverIO suite [ASSUMED] | unit ✅; E2E ❌ Wave 0 |
| DRAW-04 | Rectangle/ellipse bounds, fill/stroke/opacity | unit | `pnpm exec vitest run src/components/overlay-surface.test.tsx` | ✅ extend existing |
| DRAW-05 | Draft click placement, Enter commit, Shift+Enter newline, Esc cancel | unit | `pnpm exec vitest run src/state/annotation.test.ts` [ASSUMED path] | ❌ Wave 0 |
| DRAW-06 | Reverse topmost hit-test and exactly-one native erase | unit + Rust | `pnpm exec vitest run src/state/annotation.test.ts` + `cargo test --manifest-path src-tauri/Cargo.toml overlay_registry` [ASSUMED new tests] | Rust ✅; TS ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm exec vitest run src/components/overlay-surface.test.tsx` và test Rust target liên quan [ASSUMED workflow choice].
- **Per wave merge:** `pnpm test && cargo test --manifest-path src-tauri/Cargo.toml` [VERIFIED: command probe 2026-09-11].
- **Phase gate:** full suite xanh; manual macOS + Windows kiểm tra toolbar/click-through, all eight tools, IME text và multi-display visual parity trước `$gsd-verify-work` [VERIFIED: .planning/REQUIREMENTS.md:103-108; ASSUMED phase-3 execution matrix].

### Wave 0 Gaps

- [ ] `src/state/annotation.test.ts` — pure tests cho tool/style reducer, text draft và hit-test [ASSUMED path].
- [ ] Rust `overlay_registry` tests — typed payload allowlist/ranges, erase one ID/no-op, snapshot identity/broadcast seam [VERIFIED existing test location: src-tauri/src/overlay_registry.rs:354-430].
- [ ] Phase-3 WebdriverIO suite registration in `wdio.conf.ts` — smoke selection/drawing/text/eraser on native overlay [ASSUMED; existing suite pattern at wdio.conf.ts:7-35].
- [ ] `vitest.config.ts` không cần đổi nếu tests vẫn pure Node; chỉ thêm DOM environment/package nếu planner chọn component-level test [VERIFIED: vitest.config.ts:7-10; ASSUMED latter condition].

## Security Domain

OWASP mô tả ASVS là bộ yêu cầu kiểm chứng security và nhấn mạnh input phải được validate ở trusted service layer; trang chính hiện ghi latest stable là 5.0.0 và chapter identifiers có thể thay đổi [CITED: https://owasp.org/www-project-application-security-verification-standard/; https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation]. Project bật `security_enforcement: true` và `security_asvs_level: 1` [VERIFIED: .planning/config.json:46-50].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no cho Phase 3 | Không thêm account/login; giữ local-first scene [VERIFIED: .planning/REQUIREMENTS.md:81-90; .planning/phases/03-core-annotation-tools/03-CONTEXT.md:201-208]. |
| V3 Session Management | no cho Phase 3 | Không có user session/token; scene chỉ là app-runtime state [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:32-33,198-206]. |
| V4 Access Control | yes tại Tauri command boundary | Chỉ expose mutation commands đã register; Rust kiểm tra item/id và không cho caller thay scene snapshot [VERIFIED: src-tauri/src/main.rs:236-281; src-tauri/src/overlay_registry.rs:80-103]. |
| V5 Input Validation | yes | Typed discriminator, positive allowlist, finite/range checks, bounded text/style/geometry ở Rust; client validation chỉ UX [CITED: https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation; VERIFIED current validator seam: src-tauri/src/overlay_registry.rs:93-113]. |
| V6 Cryptography | no | Phase không xử lý secret/crypto; không tự xây crypto [VERIFIED: .planning/REQUIREMENTS.md:81-90; ASSUMED no new crypto surface]. |

> Mapping V2–V6 ở trên follows the project security template; khi lock plan phải đối chiếu identifier với ASVS 5.0 vì OWASP đã thay đổi chapter numbering [CITED: https://owasp.org/www-project-application-security-verification-standard/].

### Known Threat Patterns for Tauri + React + Rust

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/oversized scene JSON | Tampering / Denial of Service | Rust typed deserialize, unknown-field rejection, finite/range/length bounds, reject without mutating prior snapshot [CITED: https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation]. |
| Duplicate/replayed commit | Tampering | Stable bounded ID + idempotent dedupe already present; preserve no-duplicate behavior [VERIFIED: src-tauri/src/overlay_registry.rs:80-87,422-430]. |
| Text injection into UI | Tampering | Render committed text via canvas `fillText`; never use `innerHTML`/HTML template from scene text [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText; ASSUMED implementation rule]. |
| Eraser deletes unrelated item | Tampering | Reverse topmost hit-test, hover highlight, click-only one-ID erase, snapshot test [VERIFIED locked behavior: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:60-67; ASSUMED algorithm]. |
| Toolbar intercepts underlying app | Denial of Service / Tampering | Keep chrome outside Canvas scene; explicit pointer-events and native click-through state; emergency `Esc` remains available [VERIFIED: src-tauri/src/overlay_registry.rs:329-333; .planning/phases/01-native-overlay-activation/01-CONTEXT.md:23-29]. |

## Assumptions Log

Các marker `[ASSUMED]` inline được gom vào các nhóm dưới đây; planner phải biến chúng
thành quyết định hoặc checkpoint trước implementation [VERIFIED: research contract].

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Giữ `kind` category hiện tại và thêm `tool` discriminator/payload typed là wire schema phù hợp nhất. | Pattern 1 | Nếu schema chọn `kind` tool-specific, phải sửa Rust allowlist, TS fixture và mọi test serialization. |
| A2 | Ngưỡng drag ban đầu khoảng 4 logical px, hit padding khoảng 6 logical px, default width/opacity cần bắt đầu mảnh và được visual-check. | Pattern 1/6 | Threshold quá nhỏ tạo item rác; quá lớn khiến click/erase khó; style sai cảm giác presenter. |
| A3 | Draft dùng `textarea` scene-excluded, text committed vẽ multiline bằng `fillText` từng dòng, và không commit khi `isComposing`. | Pattern 5 | IME, focus hoặc multiline layout có thể cần component khác; phải test trên macOS/Windows. |
| A4 | Gesture abort trên mode change/mất focus; command mới nên có tên `erase_scene_item`, nhận một ID và no-op vẫn trả/broadcast snapshot. | Pattern 2/4/6 | Đổi lifecycle hoặc command shape ảnh hưởng `main.rs`, frontend callback và E2E contract. |
| A5 | Hit-test dùng polyline distance, shape fill/stroke ring, ellipse equation và text line bounds; reverse scene order là topmost. | Pattern 6 | Công thức/padding sai làm hover hoặc xóa nhầm; cần unit tests hình học. |
| A6 | `src/state/annotation.test.ts`, phase-3 WebdriverIO suite và test command cadence là tên/path/workflow hợp lý cho Wave 0. | Validation | Planner có thể chọn path khác, nhưng phải giữ test coverage tương đương. |
| A7 | Windows native runner chưa sẵn trong shell hiện tại; fallback là CI/manual Windows matrix. | Environment | Không được coi macOS pass là bằng chứng platform parity. |
| A8 | ASVS V2–V6 mapping theo project template là đủ cho phase này, dù chapter numbering cần re-check theo ASVS 5.0. | Security | Có thể phải đổi mã/category trong plan security nếu project chuẩn hóa theo ASVS 5.0 đầy đủ. |
| A9 | Không thêm crypto, không dùng `innerHTML`, không đổi production code ngoài implementation phase, và validity window 30 ngày là phù hợp. | Security/Metadata | Nếu scope đổi, cần bổ sung threat model hoặc cập nhật research trước planning. |

## Open Questions

1. **Schema cuối cùng dùng `kind` category + `tool`, hay `kind` chính là từng tool?**  
   - What we know: current wire model chỉ allowlist `"stroke" | "shape" | "text"`, còn tool order đã khóa tám tên [VERIFIED: src-tauri/src/overlay_registry.rs:93-103; src/types/platform-parity.ts:13-23].  
   - What's unclear: backward compatibility mong muốn của phase với stroke sentinel cũ.  
   - Recommendation: planner chọn `kind` category + `tool` để mở rộng ít phá vỡ nhất; ghi schema JSON/type quote trong plan [ASSUMED].
2. **Default widths, opacity và threshold chính xác là bao nhiêu?**  
   - What we know: D3-05/D3 discretion yêu cầu nét thon và visual preview, không khóa số [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:34-36,69-74].  
   - What's unclear: cảm giác trên scale factor/độ phân giải và pen/highlighter contrast.  
   - Recommendation: bắt đầu bằng constants logical, unit-test invariant/range và manual visual check trên cả hai OS [ASSUMED].
3. **Toolbar có hiện ở `VisibleClickThrough` không?**  
   - What we know: toolbar phải ở cạnh dưới trong chế độ vẽ và không chặn click-through [VERIFIED: .planning/phases/03-core-annotation-tools/03-CONTEXT.md:26-33,75-77].  
   - What's unclear: UI có nên chỉ render ở `VisibleInteractive` hay vẫn visible nhưng không tương tác.  
   - Recommendation: chỉ render interactive; user chuyển mode bằng shortcut trước khi dùng toolbar, tránh chrome cản underlying app [ASSUMED].

## Project Constraints (from AGENTS.md)

- Platforms là macOS và Windows; overlay phải chuyển giữa capture-pointer và click-through [VERIFIED: AGENTS.md:11-17].
- Giữ local-first/privacy: annotation và export xử lý cục bộ, không upload screen content [VERIFIED: AGENTS.md:13-17].
- Dùng Tauri 2 + Rust, React/TypeScript, retained Canvas scene; không tự thêm backend/database cho MVP [VERIFIED: AGENTS.md:21-70].
- Không thêm component library/new frontend dependency trong manual UI baseline [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-UI-SPEC.md:17-29].
- Trước file-changing tool phải đi qua GSD command; workflow entry points là `$gsd-quick`, `$gsd-debug`, `$gsd-execute-phase` [VERIFIED: AGENTS.md:158-170].
- Không sửa production code trong research này; artifact duy nhất là `.planning/phases/03-core-annotation-tools/03-RESEARCH.md` [VERIFIED: user objective; ASSUMED artifact scope].

## Sources

### Primary (HIGH confidence)

- `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`, `src/types/overlay.ts`, `src/App.tsx` — current renderer, transforms, scene wire types, event/command integration [VERIFIED: paths and line ranges cited inline].
- `src-tauri/src/overlay_registry.rs`, `src-tauri/src/main.rs`, `src-tauri/src/display.rs` — native SceneStore, validation, mutation registration, broadcast, and viewport transforms [VERIFIED: paths and line ranges cited inline].
- `src/types/platform-parity.ts`, `src/types/platform-parity-schema.json`, `.planning/phases/02-display-topology-platform-parity/02-UI-SPEC.md` — locked tool order and manual scene-excluded UI baseline [VERIFIED: paths and line ranges cited inline].
- [Tauri Calling Rust](https://v2.tauri.app/develop/calling-rust/) — command args/results, event emission/listening/cleanup [CITED: https://v2.tauri.app/develop/calling-rust/].
- [Serde enum representations](https://serde.rs/enum-representations.html) and [Serde attributes](https://serde.rs/attributes.html) — typed tagged enum patterns and validation attributes [CITED: URLs].
- [MDN CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D), [ellipse](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse), [fillText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText), [measureText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText), and [Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — Canvas 2D rendering/DPR/performance [CITED: URLs].
- [MDN setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture), [KeyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key), [shiftKey](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/shiftKey), and [CompositionEvent](https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent) — pointer and text-input behavior [CITED: URLs].
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) and [ASVS input validation](https://cornucopia.owasp.org/taxonomy/asvs-5.0/02-validation-and-business-logic/02-input-validation) — trusted-layer validation and current chapter/version caveat [CITED: URLs].

### Secondary (MEDIUM confidence)

- `.planning/debug/stroke-not-realtime.md` — prior investigation, fix, and regression guard for realtime preview [VERIFIED: .planning/debug/stroke-not-realtime.md:25-50].
- `.planning/phases/03-core-annotation-tools/03-CONTEXT.md` — locked product behavior and phase fence [VERIFIED: path and line ranges cited inline].
- `.planning/phases/02-display-topology-platform-parity/02-05-PLAN.md` — parity vocabulary and no-capture/no-drawing contract analog [VERIFIED: .planning/phases/02-display-topology-platform-parity/02-05-PLAN.md:89-135].

### Tertiary (LOW confidence)

- Chưa dùng nguồn tertiary cho recommendation chính; numeric defaults, exact new module names và Windows runner availability được đánh dấu `[ASSUMED]` thay vì trình bày như fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions và test commands đã đọc từ source-of-truth, Canvas/Tauri/Serde claims có official docs [VERIFIED/CITED: citations inline].
- Architecture: MEDIUM — existing boundaries rõ, nhưng typed scene schema và exact new command là design choices [VERIFIED/ASSUMED: citations inline].
- Pitfalls: MEDIUM — coordinate/preview risks có regression evidence; eraser/text/toolbar edge cases cần phase tests trên native hosts [VERIFIED/ASSUMED: citations inline].
- Security: MEDIUM — Rust boundary và OWASP validation guidance rõ, nhưng ASVS 5.0 chapter numbering cần planner re-check [CITED: https://owasp.org/www-project-application-security-verification-standard/].

**Research date:** 2026-09-11  
**Valid until:** 2026-10-11 for stable architecture; re-check package/runtime versions before implementation because registry versions are fast-moving [ASSUMED validity window].

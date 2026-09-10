---
phase: "02"
slug: "display-topology-platform-parity"
status: approved
shadcn_initialized: false
preset: none
created: "2026-09-10"
reviewed_at: "2026-09-10"
---

# Phase 02 — UI Design Contract

> Visual and interaction contract for the display topology and platform parity phase. The
> contract extends the existing manual React/CSS surface and preserves the Phase 1 mode/error
> behavior while adding per-display viewport state.

## Design System

| Property | Value |
|----------|-------|
| Tool | none (user chose the existing manual CSS system) |
| Preset | not applicable |
| Component library | none |
| Icon library | none; use text labels and native controls already present |
| Font | system-ui, sans-serif (existing `src/styles.css`) |

Source: `package.json`, `src/styles.css`, and the shadcn gate check on 2026-09-10 found no
`components.json`, Tailwind config, or component-library dependency. Do not add a component
library or new frontend dependency in this phase.

## Existing Component Baseline

The phase must extend these existing manual components instead of creating a parallel design
system:

Could not enumerate: no installed design-system package or component export map exists because
`components.json` is absent and `package.json` has no component-library dependency. The local
manual baseline below was enumerated by `find src/components -maxdepth 1 -type f -name '*.tsx' -print | sort` — 4 components — local source@working-tree — 2026-09-10.

| Component | Path | Phase 2 contract |
|-----------|------|------------------|
| `OverlaySurface` | `src/components/OverlaySurface.tsx` | Render one viewport-local canvas per native display, using the shared canonical scene and the display descriptor `{ origin, logicalSize, scaleFactor, rotation }`. Keep the current DPR-scaled backing canvas behavior. |
| `ModeBadge` | `src/components/ModeBadge.tsx` | Render the same mode feedback on every display. Keep it excluded from scene/export composition and visible briefly after a mode transition. |
| `ErrorBadge` | `src/components/ErrorBadge.tsx` | Render recoverable topology, permission, and compositor errors without clearing the scene. Keep `Retry` and platform-specific settings actions conditional on the typed error payload. |
| `SettingsPanel` | `src/components/SettingsPanel.tsx` | No new display-management screen is required. If a permission action opens system settings, preserve the existing retryable settings pattern. |

## Phase Scope and Locked Decisions

The UI represents one shared annotation scene viewed through one native overlay viewport per
active display. It must reflect D2-01 through D2-16 from `02-CONTEXT.md`:

- `Show` activates every active display viewport; no display is silently omitted.
- All viewports render the same scene in canonical OS logical desktop coordinates. A viewport is
  a window onto the scene, never an independent drawing document.
- Click-through and drawing mode are global. Every display changes mode in the same transition.
- Every visible display shows the current mode badge.
- Negative desktop origins, per-display scale factors, rotation, and logical placement remain
  visible in the resulting geometry; do not normalize the desktop to positive-only coordinates.
- Add/remove/resize/DPI/rotation events reconcile in place after a short coalescing window. The UI
  must not flicker through intermediate display sets or require a restart.
- Removing a display removes only its viewport. Scene items stay in memory and render again if the
  display returns.
- Borderless and other OS-supported native full-screen modes are supported where the compositor
  allows them. Exclusive full-screen remains Limited or Unsupported according to the documented
  matrix.
- A blocked, protected, or permission-denied surface leaves the app and scene alive and presents a
  clear recovery action.
- Live pointer-path preview is out of scope for this phase; Phase 3 owns that interaction.

## Visual and Interaction Contract

Primary visual anchor: the user’s underlying display content with the shared annotation scene
aligned over it. The hierarchy is underlying content and annotation marks first, the per-display
mode badge second, and a scoped topology or permission error badge third. Error red communicates
urgency but stays in the bottom-left utility area; neither badge may cover the center of the scene
or change native viewport geometry.

| Surface or state | Contract |
|-----------------|----------|
| Per-display overlay viewport | A transparent, full-viewport canvas fills the native window with `position: fixed; inset: 0`. It receives a viewport descriptor and converts canonical scene points into local logical coordinates. Its backing canvas is `logicalWidth × DPR` by `logicalHeight × DPR`; it is redrawn after geometry, scale, or rotation updates. |
| Shared scene | All viewports render the same scene identity and item set. A display registry update must never clear or duplicate scene items. A viewport that returns after removal displays the retained marks at their canonical positions. |
| Drawing mode | Every registered viewport captures pointer input. Show `Đang vẽ` in the per-display mode badge, use the accent blue, and keep the badge outside the canvas scene. Pointer samples are committed only on pointer-up in this phase. |
| Click-through mode | Every registered viewport passes pointer input to the underlying application while annotations remain visible. Show `Xuyên qua` in the per-display mode badge with the neutral secondary color. CSS pointer-events alone is insufficient; the native adapter remains the hit-testing authority. |
| Hidden mode | All viewports are hidden together. Do not render a mode badge or an error badge over an intentionally hidden surface. The retained scene remains available for the next show action. |
| Topology reconciliation | During an add/remove/resize/DPI/rotation burst, preserve the last stable overlay frame until the final snapshot is applied. Update unchanged windows in place, create only new display viewports, and remove only missing viewport entries. Never show an intermediate “one display” state to the user. |
| Mode badge | Place at the bottom-right of each display viewport with a 16px inset. Use a 999px radius, 8px × 12px padding, 14px semibold text, and `role="status"`. Show for 2 seconds after a mode change, matching the existing `BADGE_TIMEOUT_MS`; the badge is `data-scene-excluded="true"` and has `pointer-events: none`. |
| Recoverable error badge | Place at the bottom-left of the affected viewport with a 16px inset. Use a compact red surface with readable white text, `role="alert"`, and keyboard-focusable actions. It must remain outside exported/composed scene data. Use `Thử lại lớp phủ` for retry and expose `Mở Cài đặt hệ thống` only when the typed error includes the permission action. |
| Full-screen limitation | If the compositor cannot present a viewport, keep all available overlays and the scene alive. The error badge names the affected condition and gives the recovery path; do not replace the overlay with a modal or blank settings page. |
| Display count | A single active display and many active displays use the same viewport contract. The app must not add a special primary-display-only layout. Badge placement and copy stay identical on every display. |
| Platform parity | macOS and Windows use the same mode labels, badge placement, error hierarchy, shortcut concepts, tool order, and export exclusion behavior. Only the permission destination/detail differs by platform. |

## State and Behavior Matrix

| State | Visible result | Interaction |
|-------|----------------|-------------|
| `Hidden` | No overlay viewport or badge is visible. | Global show shortcut/tray action activates all current display viewports. |
| `VisibleInteractive` | Transparent viewport on every active display; `Đang vẽ` badge briefly visible on each. | Pointer input is captured consistently across all displays. |
| `VisibleClickThrough` | Same viewport and scene; `Xuyên qua` badge briefly visible on each. | Pointer input passes through consistently across all displays. |
| `Reconciling` | Keep the last stable scene frame; no spinner or window churn is shown. | User may continue the current mode once the final snapshot is applied. |
| `TopologyError` | Affected viewport shows an actionable error badge; other viewports stay usable. | `Thử lại lớp phủ` requests a fresh topology snapshot without clearing the scene. |
| `PermissionError` | Error badge includes platform-specific permission guidance. | `Mở Cài đặt hệ thống` is shown only when supported; retry remains available when typed by native state. |
| `FullScreenLimited` | Overlay remains visible when allowed; a concise limitation error appears when blocked. | User can retry after changing the full-screen mode or return to the documented supported mode. |

## Spacing Scale

Declared values (multiples of 4; based on the existing `rem` spacing and normalized to 4px
increments):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Badge text-to-edge padding, compact icon/text gaps if introduced later |
| sm | 8px | Badge internal gap, action-button gap, compact error spacing |
| md | 16px | Viewport badge inset, default control padding, settings row gap |
| lg | 24px | Settings panel section padding |
| xl | 32px | Settings panel outer spacing and larger grouped controls |
| 2xl | 48px | Major settings group breaks |
| 3xl | 64px | Page-level breathing room when a non-overlay settings surface needs it |

Exceptions: interactive error and settings controls have a minimum 44px height or hit area for
keyboard and pointer access; the full-screen canvas and native display geometry use the OS-provided
logical dimensions rather than spacing tokens.

## Typography

Use exactly these four sizes and two weights across phase UI. Values are defaults because upstream
artifacts define behavior but do not lock typography; the family follows `src/styles.css`.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.2 |
| Heading | 20px | 600 | 1.2 |
| Display | 28px | 600 | 1.2 |

Mode badges and error badges use the Label role. Error copy wraps within the affected viewport and
must not force the canvas or native window to resize.

## Color

The canvas itself stays transparent so the underlying presentation remains visible. The split below
describes the UI chrome that sits above that canvas; values are defaults grounded in the existing
badge and settings colors in `src/styles.css`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `transparent` / underlying display content | Overlay canvas and viewport surface; no opaque wash over the user’s app or presentation |
| Secondary (30%) | `#ffffff` at 96% opacity | Settings panel and neutral control surfaces; use `#475569` for click-through badge text/surface state |
| Accent (10%) | `#2563eb` | Drawing-mode badge, active display synchronization confirmation, and the primary retry focus state |
| Destructive | `#b91c1c` | Permission, compositor, and topology error badge only; no destructive action is introduced in this phase |

Accent reserved for: the `Đang vẽ` mode badge, the focused/pressed state of `Thử lại lớp phủ`, and
the single active display-status indicator when such an indicator is needed. Do not apply accent to
all controls, every viewport border, or neutral click-through feedback.

## Copywriting Contract

User-facing copy is Vietnamese. Keep the same concepts and action order on macOS and Windows; add
only the platform-specific permission destination/detail.

| Element | Copy |
|---------|------|
| Primary CTA | `Thử lại lớp phủ` |
| Empty state heading | `Không tìm thấy màn hình` |
| Empty state body | `Kết nối hoặc bật lại một màn hình rồi chọn “Thử lại lớp phủ”. Chú thích hiện có vẫn được giữ.` |
| Error state | `Không thể hiển thị lớp phủ trên màn hình này. Kiểm tra chế độ toàn màn hình hoặc quyền hiển thị, rồi chọn “Thử lại lớp phủ”.` |
| Permission detail — macOS | `Cho phép nABrush trong Cài đặt hệ thống > Quyền riêng tư & Bảo mật, rồi thử lại.` |
| Permission detail — Windows | `Kiểm tra quyền hiển thị cửa sổ phủ và chế độ toàn màn hình của ứng dụng, rồi thử lại.` |
| Full-screen limited detail | `Chế độ toàn màn hình này không cho phép lớp phủ. Hãy chuyển sang toàn màn hình không độc quyền hoặc cửa sổ không viền rồi thử lại.` |
| Destructive confirmation | `Không có thao tác phá hủy trong Phase 2. Tháo màn hình chỉ gỡ viewport; không xóa chú thích.` |

Error messages must identify the recovery action in the same visible region as the problem. Do not
surface raw native error strings as the only copy; platform details may be attached as secondary
diagnostic text for logs or support.

## UI Considerations

Applicable state considerations resolved: 8 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | display viewport registry | ✅ covered | When the display snapshot is empty, show `Không tìm thấy màn hình` and the documented `Thử lại lớp phủ` next step; retain the shared scene in memory. |
| loading | topology reconciliation | ✅ covered | Coalesced display events keep the last stable frame and suppress intermediate windows; no spinner or flicker is shown during the short reconciliation interval. |
| error | topology/full-screen/permission badge | ✅ covered | Show the documented problem plus `Thử lại lớp phủ`; include the platform settings action only when native state provides it. |
| populated | active display viewport | ✅ covered | One viewport per active display renders the shared canonical scene with its own logical size, origin, scale factor, and rotation. |
| partial | mixed display availability | ✅ covered | If one viewport fails, keep healthy displays and their mode badges active while the affected display shows a scoped error. |
| overflow | error and support copy | ✅ covered | Long error text wraps inside a bounded badge; it never changes the viewport or native display geometry. |
| zero-one-many | display registry and mode badges | ✅ covered | Zero displays uses the empty state, one display uses the same standard viewport, and many displays repeat the same badge contract without primary-display special casing. |
| long-text | localized/platform-specific error copy | ✅ covered | Copy wraps at normal word boundaries; action controls remain visible and reachable at the minimum 44px target. |

Open interaction concerns outside this finite state table remain governed by the phase decisions:
native accessibility behavior, reduced-motion preferences, and platform-specific full-screen support
must be verified in the macOS/Windows hardware matrix. Live stroke preview is explicitly deferred
to Phase 3.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Manual CSS | none | not applicable; user declined shadcn initialization and no third-party registry is used |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS (design system intentionally absent; Component Inventory omitted per template rule)

**Approval:** pending

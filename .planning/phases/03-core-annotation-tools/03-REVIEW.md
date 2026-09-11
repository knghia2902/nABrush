---
phase: 03-core-annotation-tools
reviewed: 2026-09-11T02:14:45Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src-tauri/src/main.rs
  - src-tauri/src/overlay_registry.rs
  - src/App.tsx
  - src/components/AnnotationToolbar.tsx
  - src/components/OverlaySurface.tsx
  - src/components/annotation-toolbar.test.tsx
  - src/components/overlay-surface.test.tsx
  - src/state/annotation.test.ts
  - src/state/annotation.ts
  - src/state/overlay.test.ts
  - src/styles.css
  - src/types/overlay.ts
  - tests/e2e/core-annotation-tools.e2e.ts
  - wdio.conf.ts
findings:
  critical: 7
  warning: 3
  info: 0
  total: 10
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-09-11T02:14:45Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

The implementation passes the TypeScript build, Vitest suite, and Rust unit tests, but those checks do not exercise the multi-display native lifecycle. The submitted code has release-blocking defects in viewport routing, shared-scene identity, coordinate rendering, rotated-window geometry, asynchronous native reconciliation, and topology observation. It also has several failure paths that silently discard user actions.

## Critical Issues

### CR-01: Every overlay adopts the last display viewport

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src/App.tsx:46-50`; `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/overlay_registry.rs:829-833`
**Issue:** `App` applies every `overlay-viewport-changed` event without checking which native window it belongs to. Native emits one global event for each display, so on a multi-monitor setup every webview ends with the final descriptor's viewport. Canvases are then sized, rendered, and pointer-mapped as if they were on the wrong monitor.
**Fix:** Route the event to the target `WebviewWindow` (or include a target label and filter against the current window label) instead of broadcasting all descriptors to every webview. Keep the bootstrap lookup as an initial-state fallback only.

### CR-02: Rendering clamps annotations to the current monitor edge

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src/components/OverlaySurface.tsx:105-110`
**Issue:** `canonicalToViewport` clamps canonical coordinates to the viewport before converting them. The same helper is used for drawing the shared scene, so an annotation that belongs to another display is collapsed onto this display's nearest edge rather than being clipped outside it. With a shared desktop scene, every monitor can show distorted copies of strokes, shapes, and text at its borders.
**Fix:** Use an unclamped canonical-to-viewport transform for rendering and let the canvas clip outside pixels. Keep clamping only in the pointer-input normalization path, or explicitly reject/clip whole primitives without moving their coordinates.

### CR-03: Per-webview item IDs silently drop concurrent annotations

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src/components/OverlaySurface.tsx:514-515,665-677,709-712`; `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/overlay_registry.rs:220-234`
**Issue:** Each overlay WebView starts `nextItemIdRef` at zero and generates IDs such as `stroke-1`, `rectangle-1`, and `text-1`. Since all displays commit to one `SceneStore`, the first display to use an ID wins and the same gesture on another display is treated as an idempotent replay and discarded without an error.
**Fix:** Allocate IDs from one shared native source or use collision-resistant IDs (`crypto.randomUUID()` plus native validation). Retain native deduplication for actual retries, but do not derive identity from a per-WebView counter.

### CR-04: Rotated displays receive the wrong native window size

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/overlay_registry.rs:795-812`
**Issue:** The renderer swaps width and height for `degrees90`/`degrees270` in `viewportSize`, but native creation and resize always use `descriptor.logical_size` unchanged. A rotated descriptor therefore gets a window whose dimensions disagree with the canvas CSS/backing dimensions, producing clipped or offset overlays and incorrect pointer coordinates.
**Fix:** Compute the oriented viewport size once and use it for `inner_size` and `set_size` (and adjust the native origin if the platform's rotated frame requires it). Add an integration assertion that native and renderer viewport dimensions match for both quarter-turns.

### CR-05: Overlapping async reconciliations can resurrect a hidden overlay

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/overlay_registry.rs:734-755,767-835`
**Issue:** Every show, hide, click-through change, and topology update spawns an independent native reconciliation task. There is no serialization, cancellation, or generation check. A stale `Show` task can complete after a later `Hide` task and call `show()` using its captured mode, leaving a native window visible while the controller and React state say `Hidden`; topology tasks can similarly apply obsolete geometry.
**Fix:** Serialize native reconciliation or attach a monotonically increasing generation to each task and discard stale plans before applying each window operation. The final native state must be checked against the latest registry mode/snapshot before showing, hiding, or destroying windows.

### CR-06: Display-change observers are installed as no-ops

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/main.rs:32-34`; called implementations `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/platform/macos.rs:41-46` and `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/platform/windows.rs:49-53`
**Issue:** Startup calls `platform::install_observers`, but both target implementations return `Ok(())` without registering an observer or message hook. Consequently, adding/removing/resizing/rotating a display after startup never schedules `reconcile_native_async`; the overlay remains on stale monitors and geometry despite the surrounding code claiming to support topology refresh.
**Fix:** Register the AppKit notification observer and the Windows display/DPI hook against the actual native overlay windows, or fail initialization with a typed unsupported-platform error. Add a real macOS and Windows smoke check that changes topology and observes a reconciliation.

### CR-07: The configured `overlay` WebView is never made into an active viewport

**Severity:** BLOCKER
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/overlay_registry.rs:678-682,780-800`; `/Users/khacnghia/Desktop/Tools/nABrush/tests/e2e/core-annotation-tools.e2e.ts:205-212`
**Issue:** Reconciliation creates and shows only hash-labelled windows (`overlay-display-*`) for every descriptor. The configured `overlay` window used by the runner is not registered, positioned, or shown. The phase E2E suite switches to that fixed label and drives pointer actions there, so it exercises a hidden bootstrap WebView rather than a visible native overlay; the DOM may look active while native pointer input cannot reach it.
**Fix:** Either reuse the configured `overlay` window for one authoritative display and create generated labels only for additional displays, or make the E2E runner discover and select the active generated window. The production bootstrap window and registry ownership must use one consistent label contract.

## Warnings

### WR-01: Native commit and erase failures are silently unhandled

**Severity:** WARNING
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src/App.tsx:68-97`
**Issue:** Both `invoke` calls attach only a success handler. Validation failures, a destroyed native window, or an event-emission failure become rejected promises with no user-visible error and no state resynchronization. Text drafts are already cleared before commit, so a rejected commit can make the user's input disappear.
**Fix:** Add rejection handlers that surface a typed error and refresh `get_scene_snapshot`; only clear a draft after the native commit succeeds, or preserve it for retry.

### WR-02: Malformed viewport payloads can throw instead of being rejected

**Severity:** WARNING
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src/types/overlay.ts:169-187`
**Issue:** `isDisplayViewport` checks only `origin !== undefined` and `logicalSize !== undefined` before reading `.x`, `.y`, `.width`, and `.height`. `null` values therefore throw a `TypeError` inside event/bootstrap handling rather than returning `false`; IDs and nested object shape are also not fully validated.
**Fix:** Verify each value is a non-null record before property access, then validate finite positive dimensions, scale bounds, orientation, and non-empty bounded IDs. Add tests for `null`, arrays, and primitive nested values.

### WR-03: The native validator retains one-point strokes that the renderer cannot draw

**Severity:** WARNING
**File:** `/Users/khacnghia/Desktop/Tools/nABrush/src-tauri/src/overlay_registry.rs:505-520`; renderer `/Users/khacnghia/Desktop/Tools/nABrush/src/components/OverlaySurface.tsx:222-224`
**Issue:** Native validation accepts a stroke with one point (`points.is_empty()` is the only cardinality check), while `drawStroke` returns for fewer than two points. A caller at the IPC boundary can therefore retain an invisible scene item that still affects scene counts and hit-testing/erase behavior.
**Fix:** Require at least two points in the native schema, matching the renderer's commit contract, or explicitly render and hit-test a single-point dot consistently.

---

_Reviewed: 2026-09-11T02:14:45Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

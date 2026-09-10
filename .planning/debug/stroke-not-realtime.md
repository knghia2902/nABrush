---
status: resolved
trigger: "Nét vẽ vẫn chưa realtime, vẽ xong mới hiện nét"
created: "2026-09-10"
updated: "2026-09-10"
---

# Debug Session: stroke-not-realtime

## Symptoms

- Expected behavior: A stroke is visible continuously while the pointer is dragged across the overlay.
- Actual behavior: The stroke becomes visible only after pointer-up; during the drag there is no visible preview.
- Error messages: None reported.
- Timeline: Drawing input and final commit now work, but realtime rendering is missing.
- Reproduction: On macOS, launch `./src-tauri/target/debug/nabrush`, enter drawing mode, and drag the pointer.

## Current Focus

- hypothesis: `OverlaySurface` stores pointer samples in a ref and only adds a scene item in `endStroke`, so the retained scene redraw has no transient stroke to render during pointer movement.
- test: Trace pointer-down/move/up, identify the smallest transient preview state, and verify it does not alter persisted scene data before pointer-up.
- expecting: Pointer movement renders the in-progress path immediately; pointer-up commits one final stroke and clears the preview.
- next_action: none

## Evidence

- timestamp: 2026-09-10
  observation: User reports that a completed stroke appears only after drawing ends.
- timestamp: 2026-09-10
  observation: `OverlaySurface` stores `samplesRef` during pointer movement and calls `onCommitStroke` only from `endStroke`.
- timestamp: 2026-09-10
  observation: `redraw` receives only the committed `scene` prop, so the in-progress pointer path cannot be rendered.
- timestamp: 2026-09-10
  observation: `moveStroke` only appends to `samplesRef`; because refs do not trigger React renders, no redraw occurs until pointer-up updates the retained scene through the parent.
- timestamp: 2026-09-10
  observation: A transient `StrokeSceneItem` can be derived from the samples and passed separately to `drawScene`, allowing the canvas to repaint without adding anything to the retained scene or native commit path.

## Eliminated

## Resolution

- root_cause: `OverlaySurface` kept in-progress samples only in a ref and redrew only the committed `scene`; pointer movement therefore changed no render-triggering state and produced no visible preview.
- fix: Added React transient-preview state, derived it from pointer samples on move, rendered it alongside committed scene items, and cleared it before the existing pointer-up commit. Added regression coverage for preview derivation, retained-scene isolation, and transient drawing.
- verification: `pnpm test` (30 tests passed); `pnpm typecheck` passed; `pnpm build` passed.
- files_changed: `src/components/OverlaySurface.tsx`, `src/components/overlay-surface.test.tsx`

## Postmortem

- why_not_caught: The existing tests covered coordinate normalization and final scene commits, but not the render lifecycle between pointer-move and pointer-up.
- guard: Regression tests assert transient preview construction is separate from the retained scene and that `drawScene` paints the transient item in the same frame.

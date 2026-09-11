# Quick Task Plan: Move committed text and compact the text editor

## Scope

- Keep the existing Text tool workflow and toolbar unchanged.
- Allow dragging a committed text annotation to a new anchor.
- Persist and broadcast moved text through the native scene store.
- Reduce the default text draft editor dimensions and verify both behaviors.

## Tasks

1. Add text hit detection, drag preview, commit handling, and native move command.
2. Make the draft editor compact, add regression coverage, and run focused tests plus build.

## Verification

- Frontend unit tests for annotation/overlay behavior.
- Rust scene-store tests for moving text.
- Native text E2E for compact draft sizing and drag movement.
- Production frontend build.

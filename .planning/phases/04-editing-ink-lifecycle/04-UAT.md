---
status: testing
phase: 04-editing-ink-lifecycle
source: [04-VERIFICATION.md]
started: 2026-09-12T14:02:13Z
updated: 2026-09-12T14:02:13Z
---

## Current Test

number: 1
name: Vanishing expiry while click-through
expected: |
  Draw a Vanishing mark with a 3-second duration, switch the overlay to click-through before it expires, and restore interaction after the deadline. The mark fades and is absent from every overlay.
awaiting: user response

## Tests

### 1. Vanishing expiry while click-through
expected: A mark created with Vanishing mode fades and expires on schedule while the overlay is click-through, and does not reappear when interaction is restored.
result: [pending]

### 2. Windows native parity
expected: On Windows, drawing, text commit/move, lifecycle controls, Undo/Redo buttons, and Ctrl+Z/Ctrl+Y work; shortcuts do not affect the underlying app.
result: [pending]

### 3. Per-tool controls after Undo/Redo
expected: Distinct color, width, opacity, fill, and text-size settings remain associated with their tools after switching tools and restoring scene history.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->

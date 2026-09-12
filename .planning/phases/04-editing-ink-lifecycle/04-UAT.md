---
status: testing
phase: 04-editing-ink-lifecycle
source: [04-VERIFICATION.md]
started: 2026-09-12T14:02:13Z
updated: 2026-09-12T14:36:02Z
---

## Current Test

number: 2
name: Windows native parity
expected: |
  On Windows, drawing, text commit/move, lifecycle controls, Undo/Redo buttons, and Ctrl+Z/Ctrl+Y work; shortcuts do not affect the underlying app.
awaiting: user response

## Tests

### 1. Vanishing expiry while click-through
expected: A mark created with Vanishing mode fades and expires on schedule while the overlay is click-through, and does not reappear when interaction is restored.
result: issue
reported: "Nó không mất từ từ mà mất luôn với nó nhảy nét lung tung khi mà bật Vanishing, thành toolbar mình chỉ cần hiện icon thôi"
severity: major

### 2. Windows native parity
expected: On Windows, drawing, text commit/move, lifecycle controls, Undo/Redo buttons, and Ctrl+Z/Ctrl+Y work; shortcuts do not affect the underlying app.
result: [pending]

### 3. Per-tool controls after Undo/Redo
expected: Distinct color, width, opacity, fill, and text-size settings remain associated with their tools after switching tools and restoring scene history.
result: [pending]

## Summary

total: 3
passed: 0
issues: 1
pending: 2
skipped: 0
blocked: 0

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->
- gap_id: G-04-1
  truth: "A Vanishing annotation fades and expires on schedule while the overlay is click-through, then stays absent when interaction is restored."
  status: failed
  reason: "User reported that Vanishing marks disappear immediately instead of fading and that the stroke jumps unpredictably when Vanishing is enabled."
  severity: major
  test: 1
  artifacts: []
  missing: []

## Additional User Requests

- Toolbar: show icons only; hide text labels.

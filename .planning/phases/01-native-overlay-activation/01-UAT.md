---
status: testing
phase: 01-native-overlay-activation
source: [01-VERIFICATION.md]
started: 2026-09-10
updated: 2026-09-10
---

## Current Test

number: 1
name: Verify tray launch and global activation on macOS and Windows
expected: |
  nABrush stays in the menu bar/system tray without a normal document window, and Cmd/Ctrl+Shift+A activates the overlay while another app is focused.
awaiting: user response

## Tests

### 1. Tray launch and cross-app activation
expected: Tray/menu-bar entry remains available and the configured global shortcut activates the overlay from TextEdit or Notepad.
result: [pending]

### 2. Drawing, click-through, Escape, and scene restoration
expected: Drawing captures a mark, Click-through sends a click to the underlying text target, Escape hides, and the same scene returns after Show.
result: [pending]

### 3. Settings close-to-hide and recovery actions
expected: Closing settings hides that window without quitting; shortcut conflict rolls back; initialization failure exposes Retry.
result: [pending]

### 4. Full-screen and permission limitations
expected: Spaces/Stage Manager/native full-screen and Windows borderless/exclusive full-screen observations are recorded with limitations for protected or denied surfaces.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

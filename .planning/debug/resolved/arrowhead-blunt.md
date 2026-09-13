---
status: resolved
trigger: "Arrowhead becomes blunt rather than pointed when the arrow is made thicker; user attached screenshot showing oversized thick arrows with flat-looking tips."
created: 2026-09-13T00:00:00Z
updated: 2026-09-13T11:36:13Z
---

## Current Focus

hypothesis: Confirmed. The head half-width grows with stroke width while its length is capped relative to arrow distance, widening the tip; a round-capped shaft drawn all the way to the tip further blunts it.
test: Added acute-angle and shaft-endpoint regression tests, then ran the focused OverlaySurface suite and TypeScript typecheck.
expecting: Thick heads remain acute, and the shaft stops at the head base.
next_action: Resolved; regression tests and typecheck pass.

## Symptoms

expected: Thickening an arrow should make its shaft/head bolder while the arrowhead endpoint remains visibly sharp and pointed.
actual: The arrow becomes very thick and its tip looks blunt/not pointed, as shown in the attached screenshot.
errors: None reported.
started: Reported in the latest user message; whether it previously worked or is newly introduced is unknown.
reproduction: Draw an arrow annotation, increase its stroke width, and inspect the arrowhead, especially at the larger width shown in the screenshot.

## Eliminated

## Evidence

- timestamp: 2026-09-13T11:36:13Z
  observation: Baseline formula on a 60px arrow with 20px stroke produced a 118.1-degree tip: length=min(27,80)=27 and half-width=45. The shaft stroke also ended at the tip (x=60) using a round cap. Both new regressions failed before the fix (30 passed, 2 failed).
- timestamp: 2026-09-13T11:36:13Z
  observation: After the fix, the focused OverlaySurface suite passed 32/32 tests and `pnpm typecheck` passed.

## Resolution

root_cause: The head width scaled as 2.25× stroke width while head length stopped at 45% of the arrow distance, allowing obtuse tips; the rounded shaft cap was painted at the vertex.
fix: Allow the head length to use up to 60% of a short arrow, cap head half-width at 55% of its length (tip angle about 58 degrees maximum), and draw the shaft only to the head base with a butt cap.
cycles: 1 investigation + 1 fix
tdd: no (regression tests were added before applying the implementation fix)
specialist_review: none (specialist dispatch was unavailable in this session)

## Prevention

why_not_caught: Existing arrow geometry coverage only checked triangle orientation at a thin stroke; it did not constrain tip angle or assert where the shaft ended.
guard: Thick-arrow acute-angle and shaft-at-base regression tests in `src/components/overlay-surface.test.tsx`.

## Files Changed

- `src/components/OverlaySurface.tsx` — bounded arrowhead angle and rendered shaft endpoint/cap.
- `src/components/overlay-surface.test.tsx` — thick-arrow geometry/render regressions.
- `.planning/debug/resolved/arrowhead-blunt.md` — investigation evidence and resolution.

---
phase: "03"
slug: "core-annotation-tools"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-11"
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Webview input → React scene state | Pointer, keyboard, toolbar, and WebDriver input is untrusted. | Coordinates, text drafts, tool/style values |
| React invoke → Rust SceneStore | Scene mutations cross the Tauri IPC boundary and are revalidated natively. | Typed scene items, IDs, erase requests |
| Native SceneStore → overlay webviews | One retained scene is delivered to multiple display viewports. | Scene snapshots and viewport descriptors |
| Host platform → native overlay/evidence | macOS and Windows windowing/input behavior is platform-specific. | Window geometry, click-through state, test evidence |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01-01 | Tampering/DoS | commit_scene_item | high | mitigate | Typed payload validation, finite/range/length limits, reject-before-mutate; Plans 03-01/03-02 | closed |
| T-03-01-02 | Tampering | Scene item IDs and snapshot mutation | medium | mitigate | Bounded IDs and native replay deduplication; Plan 03-01 | closed |
| T-03-01-03 | Tampering | Canvas text/scene rendering boundary | medium | mitigate | Scene strings remain data and are rendered through Canvas APIs; Plans 03-01/03-03 | closed |
| T-03-01-04 | Tampering | Toolbar/popover/click-through | high | mitigate | Scene-excluded chrome plus native click-through authority; Plans 03-01/03-03/03-05 | closed |
| T-03-01-05 | Tampering | Realtime preview and retained scene | medium | mitigate | Transient candidate is separate and commits once after valid pointer-up; Plans 03-01/03-06 | closed |
| T-03-02-01 | Tampering/DoS | Line, arrow, and shape payloads | high | mitigate | Typed discriminator, bounds, point/item limits, reject-before-mutate; Plan 03-02 | closed |
| T-03-02-02 | Tampering | Replayed geometry IDs | medium | mitigate | Stable bounded IDs and SceneStore deduplication; Plans 03-01/03-02 | closed |
| T-03-02-03 | Tampering | Canvas text data path | medium | mitigate | Text stays in SceneItem data and is not interpreted as markup; Plan 03-02 | closed |
| T-03-02-04 | Tampering/DoS | Eraser/geometry pointer interception | high | mitigate | Captured-pointer scoping and native click-through authority; Plan 03-02 | closed |
| T-03-02-05 | Tampering | Short drags and transient state | medium | mitigate | 4px logical threshold, abort cleanup, no mutation during pointer move; Plan 03-02 | closed |
| T-03-03-01 | Tampering/DoS | Text payload and draft commit | high | mitigate | Rust text bounds, Canvas data rendering, composing-Enter guard, reject-before-mutate; Plan 03-03 | closed |
| T-03-03-02 | Tampering | Replayed text/erase IDs | medium | mitigate | Bounded commit IDs and validated erase IDs; Plan 03-03 | closed |
| T-03-03-03 | Tampering | Committed text renderer | medium | mitigate | Canvas fillText/measured lines; transient DOM editor is scene-excluded; Plan 03-03 | closed |
| T-03-03-04 | Tampering | Eraser targeting | high | mitigate | Reverse-order type-specific hit testing and at-most-one native removal; Plan 03-03 | closed |
| T-03-03-05 | DoS/Tampering | Toolbar, draft, and click-through surfaces | high | mitigate | Explicit chrome pointer events, scene markers, no eraser capture, native authority; Plan 03-03 | closed |
| T-03-04-01 | Tampering/DoS | E2E scene payload path | high | mitigate | Smoke assertions for typed commit/erase, bounded counts, and no transient/chrome leakage; Plan 03-04 | closed |
| T-03-04-02 | Tampering | Duplicate/replayed IDs | medium | mitigate | Stable-ID/count assertions plus native dedupe tests; Plan 03-04 | closed |
| T-03-04-03 | Tampering | Text rendered as UI markup | medium | mitigate | Editor lifecycle and scene-exclusion checks plus Canvas rendering tests; Plan 03-04 | closed |
| T-03-04-04 | Tampering | Eraser one-item targeting | high | mitigate | One-target smoke check and native exactly-one tests; Plan 03-04 | closed |
| T-03-04-05 | DoS/Tampering | Toolbar/click-through interception | high | mitigate | Toolbar exclusion/computed pointer-events checks and native-mode matrix; Plan 03-04 | closed |
| T-03-05-01 | Tampering | fillColor/fillOpacity controls | medium | mitigate | Controlled, bounded HTML inputs and active-tool-scoped style updates; Plan 03-05 | closed |
| T-03-05-02 | Tampering | Per-tool style map | medium | mitigate | Immutable rectangle/ellipse isolation and gesture-style snapshot tests; Plan 03-05 | closed |
| T-03-05-03 | DoS | Toolbar/property popover layering | high | mitigate | Scene-excluded markers, explicit interactive descendants, native click-through authority; Plan 03-05 | closed |
| T-03-06-01 | Tampering/DoS | Captured pointer terminal events | high | mitigate | Single pointer identity, phase markers, pre-commit cleanup, mismatch/duplicate rejection; Plan 03-06 | closed |
| T-03-06-02 | Tampering | Native smoke scene assertions | high | mitigate | Real UI/invoke bridge, unchanged preview count, exact post-release count/ID/style checks; Plan 03-06 | closed |
| T-03-06-03 | Tampering | Cross-platform evidence labeling | high | mitigate | Host/platform diagnostics and separate macOS/Windows ledger rows; Plan 03-06 | closed |
| T-03-06-04 | DoS | Click-through and scene-excluded chrome | high | mitigate | Native click-through authority and preserved mode/chrome assertions; Plan 03-06 | closed |
| T-03-07-01 | Tampering | MVP goal contract | medium | mitigate | Canonical story on validator-visible roadmap line and user-story validation; Plan 03-07 | closed |
| T-03-07-02 | Tampering | Automated-result ledger | high | mitigate | Commands, timestamps, exit status, output, and failure signals are retained; Plan 03-07 | closed |
| T-03-07-03 | Tampering | macOS/Windows evidence boundary | high | mitigate | Separate platform rows and Windows evidence requirement; Plan 03-07 | closed |
| T-03-07-04 | DoS | Incomplete native/manual verification | medium | mitigate | `gaps_found`, `PENDING`, and `NOT RUN` remain until evidence exists; Plan 03-07 | closed |
| T-03-08-01 | Tampering | Four-source coverage audit | high | mitigate | Concrete plan references for goal, DRAW-01..06, R-01..09, and D-01..17; Plan 03-08 | closed |
| T-03-08-02 | Tampering | Validation status/sign-off | high | mitigate | Status is derived from recorded evidence and incomplete fields are preserved; Plan 03-08 | closed |
| T-03-08-03 | Information Disclosure | Platform evidence ledger | medium | mitigate | Host-labeled macOS/Windows rows prohibit cross-platform inference; Plan 03-08 | closed |
| T-03-SC | Tampering | Package-manager install surface | low | accept | No new package or crate installation occurs in this phase; existing locked dependencies are reused. | closed |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|------------|------|
| AR-03-SC | T-03-SC | The phase adds no dependency install surface; the existing lockfile/toolchain remains in use. | Project owner | 2026-09-11 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-11 | 34 | 34 | 0 | GSD phase security gate |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-11

---
phase: "01"
slug: "native-overlay-activation"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-10"
---

# Phase 01 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Frontend ↔ Tauri IPC | React settings/recovery UI invokes allowlisted typed commands | Shortcut strings, booleans, typed error actions |
| Tauri ↔ OS window manager | Controller applies visibility, focus, geometry, and hit-testing state | Mode enum and primary-display geometry |
| npm/Cargo registry ↔ build | Reviewed dependencies enter the local/CI toolchain | Pinned package and crate metadata |
| WebDriver/CI ↔ debug app | Native smoke runner drives only the debug executable | Test actions and local sentinel; no screen pixels |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering | package installation | high | mitigate | Reviewed npm/Cargo identities and pinned lockfiles | closed |
| T-01-02 | Elevation of privilege | frontend scaffold | medium | mitigate | Explicit Tauri capabilities and no unrestricted shell/filesystem access | closed |
| T-01-03 | Elevation of privilege | Tauri capabilities | high | mitigate | Overlay/settings windows and built-in permissions only | closed |
| T-01-04 | Spoofing | global toggle | medium | mitigate | Native controller owns transitions and emits typed mode state | closed |
| T-01-05 | Tampering | macOS private transparency | medium | mitigate | Private API and signed/notarized direct-distribution constraint documented | closed |
| T-01-06 | Tampering | mode IPC | high | mitigate | Explicit deserialized enums and idempotent reducer | closed |
| T-01-07 | Denial of service | emergency hide | high | mitigate | Reuse surface, preserve scene reference, fixed Escape action | closed |
| T-01-08 | Information disclosure | scene fixture | low | accept | Local sentinel only; no pixels or remote state | closed — accepted risk |
| T-01-09 | Tampering | shortcut IPC | high | mitigate | Constrained accelerator grammar and transactional registry | closed |
| T-01-10 | Denial of service | conflict rollback | high | mitigate | Last working set is preserved and replacement suggested | closed |
| T-01-11 | Elevation of privilege | startup adapter | medium | mitigate | Explicit typed boolean opt-in only | closed |
| T-01-12 | Denial of service | click-through transition | high | mitigate | Serialized/idempotent transition and fixed Escape | closed |
| T-01-13 | Tampering | platform flags | medium | mitigate | Target-gated `PlatformWindowAdapter` policy seam | closed |
| T-01-14 | Spoofing | mode badge | low | accept | Informational, scene-excluded UI with no native authority | closed — accepted risk |
| T-01-15 | Denial of service | initialization retry | high | mitigate | Fail closed to Hidden and preserve controller/scene | closed |
| T-01-16 | Tampering | error action IPC | medium | mitigate | Typed recovery actions constrained by current error state | closed |
| T-01-17 | Information disclosure | error detail | low | accept | No pixels, credentials, or unrestricted paths in error detail | closed — accepted risk |
| T-01-18 | Tampering | WebDriver dependencies | high | mitigate | Human package legitimacy checkpoint and pinned lockfile | closed |
| T-01-19 | Denial of service | smoke harness | medium | mitigate | Deterministic debug fixtures and fail-closed native state | closed |
| T-01-20 | Information disclosure | support matrix | low | accept | Only OS versions/error codes; no user content | closed — accepted risk |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01 | T-01-08, T-01-14, T-01-17, T-01-20 | Low-sensitivity local fixtures, informational UI, and sanitized platform evidence are required for validation and contain no screen content. | Project execution review | 2026-09-10 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-10 | 20 | 20 | 0 | Phase execution review |

## Sign-Off

- [x] All threats have a disposition.
- [x] Accepted risks documented in Accepted Risks Log.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-09-10.

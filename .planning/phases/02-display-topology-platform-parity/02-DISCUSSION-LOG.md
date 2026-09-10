# Phase 2 Discussion Log

This log records the decisions gathered before planning Phase 2. The context file is the source of truth for implementation.

## Area 1 — Multi-display overlay model

| Question | Options considered | Selected |
| --- | --- | --- |
| What happens on Show? | Primary display only; selected display; all active displays | All active displays receive an overlay. |
| How is scene state organized? | Separate scene per display; one shared desktop scene | One shared scene in canonical desktop coordinates. |
| How does click-through work? | Per-display; one global mode | All display overlays switch together. |
| Where is the mode badge shown? | One control surface; every display | Every display overlay shows the badge. |

## Area 2 — Coordinate and scene anchoring

| Question | Options considered | Selected |
| Canonical coordinate space | Physical pixels; OS logical desktop coordinates; normalized coordinates | OS logical desktop coordinates with a per-display scale factor. |
| DPI/display size change | Preserve physical pixels; preserve logical desktop placement; rescale scene | Preserve logical desktop position; pixel backing size follows DPI. |
| Negative display origins | Translate to positive space; retain native coordinates | Retain native negative origins. |
| Canvas sizing | Fixed pixel canvas; logical CSS viewport with DPR backing; per-monitor scene | Logical CSS dimensions with a devicePixelRatio-scaled backing canvas. |

## Area 3 — Topology changes

| Question | Options considered | Selected |
| Add/remove display | Restart; manual refresh; live reconcile | Create/destroy the corresponding overlay immediately. |
| Annotations on removed display | Delete; move to another display; retain and restore | Retain them in the shared scene and restore when the display returns. |
| Resize/DPI/rotation | Recreate window; update in place; ignore until restart | Reuse the native window and update geometry/transforms in place. |
| Event bursts | Apply each event; fixed long delay; brief coalescing | Coalesce briefly and apply the final display snapshot. |

## Area 4 — Full-screen support boundary

| Question | Options considered | Selected |
| Supported full-screen modes | Support all; borderless/native only; disable overlay | Keep overlay active for borderless/native OS-supported full-screen; document exclusive full-screen as limited. |
| Z-order behavior | Always force topmost; hide in full-screen; reconcile when allowed | Reconcile z-order and geometry when the platform permits it. |
| Protected or blocked surfaces | Exit; silently continue; keep state and report error | Keep app and scene alive with a clear actionable error. |
| Documentation | Single broad claim; OS-specific matrix | Separate Supported, Limited, and Unsupported rows by OS and full-screen type. |

## Deferred during discussion

The user requested that a stroke become visible only after it is finished. This was clarified as a live stroke preview during pointer movement with commit on pointer-up. It is deferred to Phase 3 because Phase 2 is limited to display topology and platform parity.

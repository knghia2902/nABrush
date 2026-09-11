# API Coverage — Tauri native annotation surface

> Phase 03 uses the existing Tauri 2 runtime and native bridge rather than a
> third-party cloud service. Coverage is explicit for every native capability
> touched by the annotation workflow; opt-outs are intentionally out of scope.

| capability | decision | reason |
|---|---|---|
| scene snapshot query (`get_scene_snapshot`) | INTEGRATE | Required to hydrate every overlay webview with the retained scene. |
| scene item commit (`commit_scene_item`) | INTEGRATE | Required to persist one valid annotation at gesture end. |
| scene item erase (`erase_scene_item`) | INTEGRATE | Required for click-only, one-item eraser behavior. |
| bootstrap mode and viewport query (`get_overlay_bootstrap_state`) | INTEGRATE | Required to initialize newly created display overlays. |
| scene change event (`scene-changed`) | INTEGRATE | Required to synchronize the retained scene across overlay webviews. |
| overlay mode event (`overlay-mode-changed`) | INTEGRATE | Required to keep interactive and click-through rendering state aligned. |
| overlay viewport event (`overlay-viewport-changed`) | INTEGRATE | Required to align canonical annotation coordinates with display viewports. |
| native display topology reconciliation | INTEGRATE | Required to create, resize, position, and remove per-display overlays. |
| native window geometry and input policy | INTEGRATE | Required for transparent, topmost, focusable, and click-through overlays. |
| error state query/event and recovery commands | INTEGRATE | Required to surface overlay failures and expose retry/system-settings actions. |
| global shortcut plugin registration | INTEGRATE | Existing native lifecycle integration remains the activation boundary. |
| embedded WebDriver plugin | INTEGRATE | Debug-only native smoke coverage is part of Phase 03 verification. |
| screen capture or image export API | OPT-OUT | Export/capture is outside the Phase 03 annotation-tools scope. |
| cloud, network, account, or remote-sync API | OPT-OUT | Phase 03 is local-only and introduces no service or account workflow. |
| persistent session/database API | OPT-OUT | Annotation sessions remain in-memory until persistence is explicitly scoped. |
| updater, billing, or telemetry API | OPT-OUT | Release operations and telemetry are outside the MVP annotation loop. |

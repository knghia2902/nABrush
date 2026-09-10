#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod controller;
mod display;
mod errors;
mod mode_schema;
mod overlay_registry;
mod parity_schema;
mod platform;
mod shortcut;
mod startup;
mod tracer;
mod tray;

use controller::AppController;
use display::{DisplayDescriptor, DisplayId, DisplayOrientation, DisplayPoint, DisplaySize, DisplaySnapshot};
use overlay_registry::{OverlayRegistry, SceneSnapshot, SceneStore};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::Mutex;
use tauri::{Manager, Runtime};

fn setup<R: Runtime>(app: &mut tauri::App<R>) -> tauri::Result<()> {
    app.manage(AppController::default());
    app.manage(Mutex::new(OverlayRegistry::default()));
    app.manage(Mutex::new(SceneStore::default()));
    app.manage(errors::ErrorStore::default());
    app.manage(shortcut::ShortcutRegistry::default());
    app.manage(startup::StartupAdapter::default());
    app.manage(platform::TopologyRefreshState::default());
    tray::install(app.handle())?;
    shortcut::register_runtime(app.handle())?;
    platform::install_observers(app.handle())?;
    Ok(())
}

#[tauri::command]
fn test_dispatch_action(
    action: controller::ShortcutAction,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppController>,
) -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = (action, app, state);
        return Err("Phase 1 smoke actions are available only in debug builds".into());
    }

    #[cfg(debug_assertions)]
    {
        state
            .dispatch_action(&app, action)
            .map_err(|error| error.to_string())?;
        let mode = match state.snapshot().mode {
            controller::OverlayMode::Hidden => "Hidden",
            controller::OverlayMode::VisibleInteractive => "VisibleInteractive",
            controller::OverlayMode::VisibleClickThrough => "VisibleClickThrough",
        };
        Ok(mode.into())
    }
}

#[tauri::command]
fn test_show_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppController>,
) -> Result<String, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = (app, state);
        return Err("Phase 1 smoke actions are available only in debug builds".into());
    }

    #[cfg(debug_assertions)]
    {
        state
            .show_settings(&app)
            .map_err(|error| error.to_string())?;
        Ok("settings".into())
    }
}

#[tauri::command]
fn test_request_close_settings(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = app;
        return Err("Phase 1 smoke actions are available only in debug builds".into());
    }

    #[cfg(debug_assertions)]
    {
        let window = app
            .get_webview_window(controller::SETTINGS_LABEL)
            .ok_or_else(|| "Settings window is unavailable".to_owned())?;
        window.close().map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn test_inject_overlay_error(
    app: tauri::AppHandle,
    state: tauri::State<'_, errors::ErrorStore>,
) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = (app, state);
        return Err("Phase 1 smoke actions are available only in debug builds".into());
    }

    #[cfg(debug_assertions)]
    {
        state
            .publish(&app, Some(errors::overlay_initialization_error()))
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn get_scene_snapshot(state: tauri::State<'_, Mutex<SceneStore>>) -> SceneSnapshot {
    state.lock().expect("scene mutex poisoned").snapshot()
}

#[tauri::command]
fn commit_scene_item(
    item: Value,
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<SceneStore>>,
    registry: tauri::State<'_, Mutex<OverlayRegistry>>,
) -> Result<SceneSnapshot, String> {
    let snapshot = state
        .lock()
        .expect("scene mutex poisoned")
        .commit_scene_item(item)
        .map_err(|error| error.to_string())?;
    registry
        .lock()
        .expect("registry mutex poisoned")
        .broadcast_scene(&app, &snapshot)
        .map_err(|error| error.to_string())?;
    Ok(snapshot)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TopologyFixtureResult {
    stage: String,
    added: Vec<String>,
    removed: Vec<String>,
    updated: Vec<String>,
    viewport_labels: Vec<String>,
    scene_id: String,
}

fn topology_fixture_snapshot(stage: &str) -> Result<DisplaySnapshot, String> {
    let descriptor = |id: &str, x: f64, y: f64, scale: f64, orientation| -> Result<DisplayDescriptor, String> {
        let id = DisplayId::new(id).map_err(|error| error.to_string())?;
        Ok(DisplayDescriptor {
            id,
            origin: DisplayPoint { x, y },
            logical_size: DisplaySize { width: 1920.0, height: 1080.0 },
            scale_factor: scale,
            orientation,
        })
    };
    let mut displays = BTreeMap::new();
    if stage != "removed" {
        let main = descriptor("fixture-main", 0.0, 0.0, 1.0, DisplayOrientation::Degrees0)?;
        displays.insert(main.id.clone(), main);
    }
    if stage != "removed" && stage != "readded" {
        let left = descriptor(
            "fixture-left",
            -1920.0,
            -120.0,
            if stage == "updated" { 1.5 } else { 2.0 },
            if stage == "updated" { DisplayOrientation::Degrees90 } else { DisplayOrientation::Degrees0 },
        )?;
        displays.insert(left.id.clone(), left);
    } else if stage == "readded" {
        let left = descriptor("fixture-left", -1920.0, -120.0, 2.0, DisplayOrientation::Degrees0)?;
        displays.insert(left.id.clone(), left);
    }
    Ok(DisplaySnapshot { displays })
}

#[tauri::command]
fn test_reconcile_topology_fixture(
    stage: String,
    state: tauri::State<'_, Mutex<OverlayRegistry>>,
    scene: tauri::State<'_, Mutex<SceneStore>>,
) -> Result<TopologyFixtureResult, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = (stage, state, scene);
        return Err("Phase 2 topology fixtures are available only in debug builds".into());
    }

    #[cfg(debug_assertions)]
    {
        let snapshot = topology_fixture_snapshot(&stage)?;
        let mut registry = state.lock().map_err(|_| "registry mutex poisoned".to_owned())?;
        let previous = registry.last_snapshot().clone();
        let changes = registry.reconcile(snapshot).map_err(|error| error.to_string())?;
        let _ = previous;
        let scene_id = scene.lock().map_err(|_| "scene mutex poisoned".to_owned())?.scene_id().to_owned();
        Ok(TopologyFixtureResult {
            stage,
            added: changes.added.into_iter().map(|id| id.as_str().to_owned()).collect(),
            removed: changes.removed.into_iter().map(|id| id.as_str().to_owned()).collect(),
            updated: changes.updated.into_iter().map(|id| id.as_str().to_owned()).collect(),
            viewport_labels: registry.viewports().values().map(|viewport| viewport.label.clone()).collect(),
            scene_id,
        })
    }
}

#[tauri::command]
fn test_display_topology_state(
    state: tauri::State<'_, Mutex<OverlayRegistry>>,
    scene: tauri::State<'_, Mutex<SceneStore>>,
) -> Result<TopologyFixtureResult, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = (state, scene);
        return Err("Phase 2 topology fixtures are available only in debug builds".into());
    }

    #[cfg(debug_assertions)]
    {
        let registry = state.lock().map_err(|_| "registry mutex poisoned".to_owned())?;
        let scene_id = scene.lock().map_err(|_| "scene mutex poisoned".to_owned())?.scene_id().to_owned();
        Ok(TopologyFixtureResult {
            stage: "native".into(),
            added: Vec::new(),
            removed: Vec::new(),
            updated: Vec::new(),
            viewport_labels: registry.viewports().values().map(|viewport| viewport.label.clone()).collect(),
            scene_id,
        })
    }
}

fn main() {
    let builder = tauri::Builder::default();

    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());

    builder
        .invoke_handler(tauri::generate_handler![
            shortcut::get_shortcut_bindings,
            shortcut::set_shortcut_binding,
            startup::get_launch_at_login,
            startup::set_launch_at_login,
            errors::get_error_state,
            errors::set_error_state,
            errors::retry_overlay,
            errors::open_system_settings,
            parity_schema::platform_parity_contract,
            get_scene_snapshot,
            commit_scene_item,
            test_dispatch_action,
            test_show_settings,
            test_request_close_settings,
            test_inject_overlay_error,
            test_reconcile_topology_fixture,
            test_display_topology_state,
        ])
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| Ok(setup(app)?))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Err(error) = window.hide() {
                    errors::report_controller_failure(&window.app_handle(), "close", &error);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running nABrush");
}

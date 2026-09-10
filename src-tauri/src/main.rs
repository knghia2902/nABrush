#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod controller;
mod errors;
mod mode_schema;
mod platform;
mod shortcut;
mod startup;
mod tracer;
mod tray;

use controller::AppController;
use tauri::{Manager, Runtime};

fn setup<R: Runtime>(app: &mut tauri::App<R>) -> tauri::Result<()> {
    app.manage(AppController::default());
    app.manage(errors::ErrorStore::default());
    app.manage(shortcut::ShortcutRegistry::default());
    app.manage(startup::StartupAdapter::default());
    tray::install(app.handle())?;
    shortcut::register_runtime(app.handle())?;
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
        state.dispatch_action(&app, action).map_err(|error| error.to_string())?;
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
        state.show_settings(&app).map_err(|error| error.to_string())?;
        Ok("settings".into())
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
            test_dispatch_action,
            test_show_settings,
        ])
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .build(),
        )
        .setup(|app| Ok(setup(app)?))
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running nABrush");
}

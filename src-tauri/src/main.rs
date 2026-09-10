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
use std::sync::OnceLock;
use tauri::{Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

static TOGGLE_SHORTCUT: OnceLock<Shortcut> = OnceLock::new();

fn toggle_shortcut() -> Shortcut {
    *TOGGLE_SHORTCUT.get_or_init(|| {
        let command_or_control = if cfg!(target_os = "macos") { Modifiers::SUPER } else { Modifiers::CONTROL };
        Shortcut::new(Some(command_or_control | Modifiers::SHIFT), Code::KeyA)
    })
}

fn setup<R: Runtime>(app: &mut tauri::App<R>) -> tauri::Result<()> {
    app.manage(AppController::default());
    app.manage(errors::ErrorStore::default());
    app.manage(shortcut::ShortcutRegistry::default());
    app.manage(startup::StartupAdapter::default());
    tray::install(app.handle())?;
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
        ])
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts([toggle_shortcut()])
                .expect("default toggle shortcut is valid")
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = app.state::<AppController>().toggle(app);
                    }
                })
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

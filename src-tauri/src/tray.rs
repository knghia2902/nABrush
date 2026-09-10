use crate::controller::{AppController, ShortcutAction};
use crate::errors::report_controller_failure;
use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, AppHandle, Manager, Runtime};

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;
    let menu = MenuBuilder::new(app)
        .text("show", "Show")
        .text("hide", "Hide")
        .text("click-through", "Toggle Click-through")
        .text("settings", "Settings")
        .text("quit", "Quit")
        .build()?;
    TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(cfg!(target_os = "macos"))
        .menu(&menu)
        .tooltip("nABrush")
        .on_menu_event(|app, event| {
            let controller = app.state::<AppController>();
            match event.id().0.as_str() {
                "show" => {
                    if let Err(error) = controller.show(app) {
                        report_controller_failure(app, "show", &error);
                    }
                }
                "hide" => {
                    if let Err(error) = controller.hide(app) {
                        report_controller_failure(app, "hide", &error);
                    }
                }
                "click-through" => {
                    if let Err(error) = controller.dispatch_action(app, ShortcutAction::ToggleClickThrough) {
                        report_controller_failure(app, "click-through", &error);
                    }
                }
                "settings" => {
                    if let Err(error) = controller.show_settings(app) {
                        report_controller_failure(app, "settings", &error);
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;
    Ok(())
}

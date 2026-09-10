use crate::controller::AppController;
pub use crate::errors::{get_error_state, set_error_state};
use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, AppHandle, Manager, Runtime};

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;
    let menu = MenuBuilder::new(app)
        .text("show", "Show")
        .text("hide", "Hide")
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
                    let _ = controller.show(app);
                }
                "hide" => {
                    let _ = controller.hide(app);
                }
                "settings" => {
                    let _ = controller.show_settings(app);
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;
    Ok(())
}

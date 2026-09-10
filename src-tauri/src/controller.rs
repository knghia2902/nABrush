use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Position, Runtime, Size};

use crate::platform::PlatformWindowAdapter;

pub const OVERLAY_LABEL: &str = "overlay";
pub const SETTINGS_LABEL: &str = "settings";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum OverlayMode {
    Hidden,
    VisibleInteractive,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct DisplayGeometry {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub scale_factor: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LifecycleSnapshot {
    pub mode: OverlayMode,
    pub surface_id: u64,
    pub geometry: Option<DisplayGeometry>,
}

struct ControllerState {
    snapshot: LifecycleSnapshot,
    next_surface_id: u64,
}

pub struct AppController {
    state: Mutex<ControllerState>,
}

impl Default for AppController {
    fn default() -> Self {
        Self {
            state: Mutex::new(ControllerState {
                snapshot: LifecycleSnapshot { mode: OverlayMode::Hidden, surface_id: 1, geometry: None },
                next_surface_id: 1,
            }),
        }
    }
}

impl AppController {
    pub fn snapshot(&self) -> LifecycleSnapshot {
        self.state.lock().expect("controller mutex poisoned").snapshot.clone()
    }

    pub fn show<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        let window = app.get_webview_window(OVERLAY_LABEL).ok_or_else(|| tauri::Error::WindowNotFound)?;
        let monitor = window.primary_monitor()?.ok_or_else(|| tauri::Error::WindowNotFound)?;
        let scale = monitor.scale_factor();
        let position = monitor.position().to_logical::<f64>(scale);
        let size = monitor.size().to_logical::<f64>(scale);
        window.set_position(Position::Logical(position))?;
        window.set_size(Size::Logical(size))?;
        window.set_focusable(true)?;
        window.set_ignore_cursor_events(false)?;
        window.show()?;
        window.set_focus()?;
        let geometry = DisplayGeometry { x: position.x, y: position.y, width: size.width, height: size.height, scale_factor: scale };
        self.transition(app, OverlayMode::VisibleInteractive, Some(geometry))
    }

    pub fn hide<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            window.hide()?;
        }
        self.transition(app, OverlayMode::Hidden, None)
    }

    pub fn show_settings<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        if let Some(window) = app.get_webview_window(SETTINGS_LABEL) {
            window.show()?;
            window.set_focus()?;
        }
        Ok(())
    }

    pub fn toggle<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        match self.snapshot().mode {
            OverlayMode::Hidden => self.show(app),
            OverlayMode::VisibleInteractive => self.hide(app),
        }
    }

    fn transition<R: Runtime>(&self, app: &AppHandle<R>, mode: OverlayMode, geometry: Option<DisplayGeometry>) -> tauri::Result<()> {
        let mut state = self.state.lock().expect("controller mutex poisoned");
        state.snapshot.mode = mode;
        state.snapshot.geometry = geometry;
        app.emit("overlay-mode-changed", mode)?;
        Ok(())
    }

    pub fn apply_to_adapter<A: PlatformWindowAdapter>(&self, adapter: &mut A, mode: OverlayMode) {
        match mode {
            OverlayMode::Hidden => adapter.hide(),
            OverlayMode::VisibleInteractive => adapter.show_interactive(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn starts_hidden_with_one_reusable_surface() {
        let controller = AppController::default();
        let first = controller.snapshot();
        assert_eq!(first.mode, OverlayMode::Hidden);
        assert_eq!(first.surface_id, controller.snapshot().surface_id);
    }
}

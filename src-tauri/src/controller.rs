use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Position, Runtime, Size};

use crate::platform::PlatformWindowAdapter;

pub const OVERLAY_LABEL: &str = "overlay";
pub const SETTINGS_LABEL: &str = "settings";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum OverlayMode {
    Hidden,
    VisibleInteractive,
    VisibleClickThrough,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ShortcutAction {
    Show,
    Hide,
    ToggleVisibility,
    ToggleClickThrough,
    Esc,
    Retry,
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
    pub scene_ref: String,
    pub click_through: bool,
}

struct ControllerState {
    snapshot: LifecycleSnapshot,
}

pub struct AppController {
    state: Mutex<ControllerState>,
}

impl Default for AppController {
    fn default() -> Self {
        Self {
            state: Mutex::new(ControllerState {
                snapshot: LifecycleSnapshot { mode: OverlayMode::Hidden, surface_id: 1, geometry: None, scene_ref: "webview-scene".into(), click_through: false },
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

    pub fn set_click_through<R: Runtime>(&self, app: &AppHandle<R>, enabled: bool) -> tauri::Result<()> {
        if self.snapshot().mode == OverlayMode::Hidden {
            return Ok(());
        }
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            window.set_ignore_cursor_events(enabled)?;
            window.set_focusable(!enabled)?;
        }
        let mode = if enabled { OverlayMode::VisibleClickThrough } else { OverlayMode::VisibleInteractive };
        let mut state = self.state.lock().expect("controller mutex poisoned");
        state.snapshot.mode = mode;
        state.snapshot.click_through = enabled;
        app.emit("overlay-mode-changed", mode)?;
        Ok(())
    }

    pub fn show_settings<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        let window = app.get_webview_window(SETTINGS_LABEL).ok_or(tauri::Error::WindowNotFound)?;
        window.show()?;
        window.set_focus()?;
        Ok(())
    }

    pub fn toggle<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        match self.snapshot().mode {
            OverlayMode::Hidden => self.show(app),
            OverlayMode::VisibleInteractive | OverlayMode::VisibleClickThrough => self.hide(app),
        }
    }

    pub fn dispatch_action<R: Runtime>(&self, app: &AppHandle<R>, action: ShortcutAction) -> tauri::Result<()> {
        match action {
            ShortcutAction::Show => self.show(app),
            ShortcutAction::Hide | ShortcutAction::Esc => self.hide(app),
            ShortcutAction::ToggleVisibility => self.toggle(app),
            ShortcutAction::ToggleClickThrough => {
                if self.snapshot().mode == OverlayMode::Hidden {
                    return Ok(());
                }
                let enabled = !self.snapshot().click_through;
                self.set_click_through(app, enabled)
            }
            ShortcutAction::Retry => Ok(()),
        }
    }

    pub fn reduce_snapshot(snapshot: &mut LifecycleSnapshot, action: ShortcutAction) {
        match action {
            ShortcutAction::Show | ShortcutAction::ToggleVisibility if snapshot.mode == OverlayMode::Hidden => {
                snapshot.mode = OverlayMode::VisibleInteractive;
                snapshot.click_through = false;
            }
            ShortcutAction::Hide | ShortcutAction::Esc => {
                snapshot.mode = OverlayMode::Hidden;
                snapshot.click_through = false;
            }
            ShortcutAction::ToggleClickThrough if snapshot.mode == OverlayMode::VisibleInteractive => {
                snapshot.mode = OverlayMode::VisibleClickThrough;
                snapshot.click_through = true;
            }
            ShortcutAction::ToggleClickThrough if snapshot.mode == OverlayMode::VisibleClickThrough => {
                snapshot.mode = OverlayMode::VisibleInteractive;
                snapshot.click_through = false;
            }
            ShortcutAction::Retry | ShortcutAction::Show | ShortcutAction::ToggleVisibility | ShortcutAction::ToggleClickThrough => {}
        }
    }

    fn transition<R: Runtime>(&self, app: &AppHandle<R>, mode: OverlayMode, geometry: Option<DisplayGeometry>) -> tauri::Result<()> {
        let mut state = self.state.lock().expect("controller mutex poisoned");
        state.snapshot.mode = mode;
        state.snapshot.geometry = geometry;
        state.snapshot.click_through = false;
        app.emit("overlay-mode-changed", mode)?;
        Ok(())
    }

    pub fn apply_to_adapter<A: PlatformWindowAdapter>(&self, adapter: &mut A, mode: OverlayMode) {
        match mode {
            OverlayMode::Hidden => adapter.hide(),
            OverlayMode::VisibleInteractive => adapter.show_interactive(),
            OverlayMode::VisibleClickThrough => {
                adapter.show_interactive();
                adapter.set_click_through(true);
            }
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
        assert_eq!(first.scene_ref, "webview-scene");
    }

    #[test]
    fn action_reducer_preserves_scene_reference_and_rejects_no_invalid_states() {
        let mut state = AppController::default().snapshot();
        AppController::reduce_snapshot(&mut state, ShortcutAction::Show);
        AppController::reduce_snapshot(&mut state, ShortcutAction::ToggleClickThrough);
        AppController::reduce_snapshot(&mut state, ShortcutAction::Esc);
        assert_eq!(state.mode, OverlayMode::Hidden);
        assert_eq!(state.scene_ref, "webview-scene");
    }

    #[test]
    fn action_reducer_does_not_enter_click_through_from_hidden() {
        let mut state = AppController::default().snapshot();
        AppController::reduce_snapshot(&mut state, ShortcutAction::ToggleClickThrough);
        assert_eq!(state.mode, OverlayMode::Hidden);
        assert!(!state.click_through);
    }
}

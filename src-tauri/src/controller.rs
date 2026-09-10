use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::display::{
    DisplayDescriptor, DisplayId, DisplayOrientation, DisplayPoint, DisplaySize, DisplaySnapshot,
    DisplayViewport,
};
use crate::platform::PlatformWindowAdapter;
use crate::errors::ErrorStore;
use crate::overlay_registry::{OverlayRegistry, RegistryError};

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

#[derive(Debug, Clone, PartialEq)]
pub struct LifecycleSnapshot {
    pub mode: OverlayMode,
    pub surface_id: u64,
    pub display_snapshot: Option<DisplaySnapshot>,
    pub viewport: Option<DisplayViewport>,
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
                snapshot: LifecycleSnapshot {
                    mode: OverlayMode::Hidden,
                    surface_id: 1,
                    display_snapshot: None,
                    viewport: None,
                    scene_ref: "webview-scene".into(),
                    click_through: false,
                },
            }),
        }
    }
}

impl AppController {
    /// Apply a lifecycle mode to the registry in one in-memory transaction.
    /// The caller emits the corresponding app event only after this returns.
    pub fn apply_registry_mode(
        &self,
        registry: &mut OverlayRegistry,
        mode: OverlayMode,
    ) -> Result<(), RegistryError> {
        registry.apply_mode(mode);
        Ok(())
    }

    pub fn snapshot(&self) -> LifecycleSnapshot {
        self.state
            .lock()
            .expect("controller mutex poisoned")
            .snapshot
            .clone()
    }

    pub fn show<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        let snapshot = display_snapshot(app)?;
        let registry_state = app.state::<Mutex<OverlayRegistry>>();
        let mut registry = registry_state.lock().expect("registry mutex poisoned");
        registry.apply_mode(OverlayMode::VisibleInteractive);
        registry.reconcile_native_async(app, snapshot.clone()).map_err(registry_error)?;
        drop(registry);
        self.transition(app, OverlayMode::VisibleInteractive, Some(snapshot))
    }

    pub fn hide<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        let registry_state = app.state::<Mutex<OverlayRegistry>>();
        let mut registry = registry_state.lock().expect("registry mutex poisoned");
        registry.apply_mode(OverlayMode::Hidden);
        let snapshot = registry.last_snapshot().clone();
        if !snapshot.displays.is_empty() {
            registry.reconcile_native_async(app, snapshot).map_err(registry_error)?;
        }
        drop(registry);
        self.transition(app, OverlayMode::Hidden, None)
    }

    pub fn set_click_through<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        enabled: bool,
    ) -> tauri::Result<()> {
        if self.snapshot().mode == OverlayMode::Hidden {
            return Ok(());
        }
        let mode = if enabled {
            OverlayMode::VisibleClickThrough
        } else {
            OverlayMode::VisibleInteractive
        };
        let registry_state = app.state::<Mutex<OverlayRegistry>>();
        let mut registry = registry_state.lock().expect("registry mutex poisoned");
        registry.apply_mode(mode);
        let snapshot = registry.last_snapshot().clone();
        if !snapshot.displays.is_empty() {
            registry.reconcile_native_async(app, snapshot).map_err(registry_error)?;
        }
        drop(registry);
        self.transition(app, mode, self.snapshot().display_snapshot)
    }

    pub fn show_settings<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        let window = app
            .get_webview_window(SETTINGS_LABEL)
            .ok_or(tauri::Error::WindowNotFound)?;
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

    pub fn dispatch_action<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        action: ShortcutAction,
    ) -> tauri::Result<()> {
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
            ShortcutAction::Retry => self.retry(app),
        }
    }

    fn retry<R: Runtime>(&self, app: &AppHandle<R>) -> tauri::Result<()> {
        let mode = self.snapshot().mode;
        if mode == OverlayMode::Hidden { return Ok(()); }
        let registry_state = app.state::<Mutex<OverlayRegistry>>();
        let mut registry = registry_state.lock().expect("registry mutex poisoned");
        let snapshot = registry.last_snapshot().clone();
        registry.apply_mode(mode);
        if !snapshot.displays.is_empty() {
            registry.reconcile_native_async(app, snapshot).map_err(registry_error)?;
        }
        drop(registry);
        if let Err(error) = app.state::<ErrorStore>().publish(app, None) {
            eprintln!("nABrush could not clear recovered error: {error}");
        }
        Ok(())
    }

    pub fn reduce_snapshot(snapshot: &mut LifecycleSnapshot, action: ShortcutAction) {
        match action {
            ShortcutAction::Show | ShortcutAction::ToggleVisibility
                if snapshot.mode == OverlayMode::Hidden =>
            {
                snapshot.mode = OverlayMode::VisibleInteractive;
                snapshot.click_through = false;
            }
            ShortcutAction::Hide | ShortcutAction::Esc => {
                snapshot.mode = OverlayMode::Hidden;
                snapshot.click_through = false;
            }
            ShortcutAction::ToggleClickThrough
                if snapshot.mode == OverlayMode::VisibleInteractive =>
            {
                snapshot.mode = OverlayMode::VisibleClickThrough;
                snapshot.click_through = true;
            }
            ShortcutAction::ToggleClickThrough
                if snapshot.mode == OverlayMode::VisibleClickThrough =>
            {
                snapshot.mode = OverlayMode::VisibleInteractive;
                snapshot.click_through = false;
            }
            ShortcutAction::Retry
            | ShortcutAction::Show
            | ShortcutAction::ToggleVisibility
            | ShortcutAction::ToggleClickThrough => {}
        }
    }

    fn transition<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        mode: OverlayMode,
        display_snapshot: Option<DisplaySnapshot>,
    ) -> tauri::Result<()> {
        let mut state = self.state.lock().expect("controller mutex poisoned");
        state.snapshot.mode = mode;
        state.snapshot.viewport = display_snapshot
            .as_ref()
            .and_then(|snapshot| snapshot.displays.values().next())
            .map(DisplayViewport::from);
        state.snapshot.display_snapshot = display_snapshot;
        state.snapshot.click_through = mode == OverlayMode::VisibleClickThrough;
        app.emit("overlay-mode-changed", mode)?;
        if let Some(snapshot) = state.snapshot.display_snapshot.as_ref() {
            for descriptor in snapshot.displays.values() {
                app.emit("overlay-viewport-changed", DisplayViewport::from(descriptor))?;
            }
        }
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

fn registry_error(error: RegistryError) -> tauri::Error {
    tauri::Error::Anyhow(error.into())
}

fn display_snapshot<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<DisplaySnapshot> {
    let monitors = app.available_monitors()?;
    if monitors.is_empty() {
        return Err(tauri::Error::WindowNotFound);
    }
    let mut displays = BTreeMap::new();
    for (index, monitor) in monitors.into_iter().enumerate() {
        let scale = monitor.scale_factor();
        let position = monitor.position().to_logical::<f64>(scale);
        let size = monitor.size().to_logical::<f64>(scale);
        let name = monitor.name().filter(|name| !name.trim().is_empty()).cloned().unwrap_or_else(|| format!("display-{index}"));
        let id = DisplayId::new(name).map_err(|error| tauri::Error::Anyhow(error.into()))?;
        let descriptor = DisplayDescriptor {
            id: id.clone(),
            origin: DisplayPoint { x: position.x, y: position.y },
            logical_size: DisplaySize { width: size.width, height: size.height },
            scale_factor: scale,
            orientation: DisplayOrientation::Degrees0,
        };
        descriptor.validate().map_err(|error| tauri::Error::Anyhow(error.into()))?;
        if displays.insert(id, descriptor).is_some() {
            return Err(tauri::Error::Anyhow(std::io::Error::new(std::io::ErrorKind::InvalidData, "duplicate monitor identity").into()));
        }
    }
    let snapshot = DisplaySnapshot { displays };
    snapshot.validate().map_err(|error| tauri::Error::Anyhow(error.into()))?;
    Ok(snapshot)
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
        assert!(first.display_snapshot.is_none());
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

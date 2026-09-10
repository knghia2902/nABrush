use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode {
    ShortcutPermission,
    ShortcutConflict,
    OverlayInitialization,
    SettingsWindowUnavailable,
    NativeController,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RecoveryAction { Retry, OpenSystemSettings }

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ErrorState {
    pub code: ErrorCode,
    pub message: String,
    pub platform_detail: Option<String>,
    pub persistent: bool,
    pub actions: Vec<RecoveryAction>,
}

#[derive(Default)]
pub struct ErrorStore { state: Mutex<Option<ErrorState>> }

impl ErrorStore {
    pub fn get(&self) -> Option<ErrorState> { self.state.lock().expect("error mutex poisoned").clone() }
    pub fn set(&self, state: Option<ErrorState>) { *self.state.lock().expect("error mutex poisoned") = state; }
    pub fn retry(&self) -> bool { let had_error = self.get().is_some(); self.set(None); had_error }

    pub fn publish<R: Runtime>(&self, app: &AppHandle<R>, state: Option<ErrorState>) -> tauri::Result<()> {
        self.set(state.clone());
        app.emit("error-state-changed", state)?;
        Ok(())
    }
}

pub fn settings_window_unavailable() -> ErrorState {
    ErrorState {
        code: ErrorCode::SettingsWindowUnavailable,
        message: "Settings is unavailable. Try opening it again from the tray.".into(),
        platform_detail: None,
        persistent: true,
        actions: vec![RecoveryAction::Retry],
    }
}

pub fn overlay_initialization_error() -> ErrorState {
    ErrorState {
        code: ErrorCode::OverlayInitialization,
        message: "The overlay could not initialize. Retry to restore it.".into(),
        platform_detail: None,
        persistent: true,
        actions: vec![RecoveryAction::Retry, RecoveryAction::OpenSystemSettings],
    }
}

pub fn report_controller_failure<R: Runtime>(app: &AppHandle<R>, action: &str, error: &tauri::Error) {
    let state = if action == "settings" {
        settings_window_unavailable()
    } else {
        ErrorState {
            code: ErrorCode::NativeController,
            message: "nABrush could not complete that tray action. Try again.".into(),
            platform_detail: None,
            persistent: true,
            actions: vec![RecoveryAction::Retry],
        }
    };
    eprintln!("nABrush controller action `{action}` failed: {error}");
    if let Err(report_error) = app.state::<ErrorStore>().publish(app, Some(state)) {
        eprintln!("nABrush could not publish controller error: {report_error}");
    }
}

#[tauri::command]
pub fn get_error_state(state: State<'_, ErrorStore>) -> Option<ErrorState> { state.get() }

#[tauri::command]
pub fn set_error_state(error: Option<ErrorState>, app: AppHandle, state: State<'_, ErrorStore>) -> Result<Option<ErrorState>, String> {
    state.publish(&app, error).map_err(|value| value.to_string())?;
    Ok(state.get())
}

#[tauri::command]
pub fn retry_overlay(app: AppHandle, state: State<'_, ErrorStore>) -> Result<bool, String> {
    let Some(error) = state.get() else { return Ok(false); };
    if error.code != ErrorCode::OverlayInitialization {
        return Err("Retry is not available for this native error".into());
    }
    state.publish(&app, None).map_err(|value| value.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn open_system_settings(state: State<'_, ErrorStore>) -> Result<bool, String> {
    let allowed = state.get().map(|error| error.actions.contains(&RecoveryAction::OpenSystemSettings)).unwrap_or(false);
    if allowed { Ok(true) } else { Err("System Settings is not a valid action for this error".into()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn overlay_error() -> ErrorState { overlay_initialization_error() }

    #[test]
    fn fail_closed_error_is_actionable_and_retryable() {
        let store = ErrorStore::default();
        store.set(Some(overlay_error()));
        assert_eq!(store.get().unwrap().code, ErrorCode::OverlayInitialization);
        assert!(store.get().unwrap().actions.contains(&RecoveryAction::Retry));
        assert!(store.retry());
        assert!(store.get().is_none());
    }
    #[test]
    fn shortcut_conflict_can_expose_suggestion_without_destroying_state() {
        let state = ErrorState { code: ErrorCode::ShortcutConflict, message: "Shortcut already in use; try commandOrControl+shift+P".into(), platform_detail: None, persistent: true, actions: vec![RecoveryAction::Retry] };
        assert!(state.message.contains("try"));
        assert_eq!(state.actions, vec![RecoveryAction::Retry]);
    }

    #[test]
    fn missing_settings_window_is_typed_and_retryable() {
        let state = settings_window_unavailable();
        assert_eq!(state.code, ErrorCode::SettingsWindowUnavailable);
        assert!(state.actions.contains(&RecoveryAction::Retry));
        assert!(state.persistent);
    }
}

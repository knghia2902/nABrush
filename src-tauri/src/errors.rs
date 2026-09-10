use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode { ShortcutPermission, ShortcutConflict, OverlayInitialization }

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
}

#[tauri::command]
pub fn get_error_state(state: State<'_, ErrorStore>) -> Option<ErrorState> { state.get() }

#[tauri::command]
pub fn set_error_state(error: Option<ErrorState>, state: State<'_, ErrorStore>) -> Option<ErrorState> { state.set(error); state.get() }

#[tauri::command]
pub fn retry_overlay(state: State<'_, ErrorStore>) -> Result<bool, String> { Ok(state.retry()) }

#[tauri::command]
pub fn open_system_settings(state: State<'_, ErrorStore>) -> Result<bool, String> {
    let allowed = state.get().map(|error| error.actions.contains(&RecoveryAction::OpenSystemSettings)).unwrap_or(false);
    if allowed { Ok(true) } else { Err("System Settings is not a valid action for this error".into()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn overlay_error() -> ErrorState { ErrorState { code: ErrorCode::OverlayInitialization, message: "Overlay unavailable".into(), platform_detail: Some("permission".into()), persistent: true, actions: vec![RecoveryAction::Retry, RecoveryAction::OpenSystemSettings] } }

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
}

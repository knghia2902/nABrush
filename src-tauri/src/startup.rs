use std::sync::Mutex;
use tauri::State;

#[derive(Default)]
pub struct StartupAdapter { enabled: Mutex<bool> }

impl StartupAdapter {
    pub fn enabled(&self) -> bool { *self.enabled.lock().expect("startup mutex poisoned") }
    pub fn set_enabled(&self, enabled: bool) { *self.enabled.lock().expect("startup mutex poisoned") = enabled; }
}

#[tauri::command]
pub fn get_launch_at_login(state: State<'_, StartupAdapter>) -> bool { state.enabled() }

#[tauri::command]
pub fn set_launch_at_login(enabled: bool, state: State<'_, StartupAdapter>) -> Result<bool, String> {
    state.set_enabled(enabled);
    Ok(state.enabled())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn launch_at_login_is_opt_in_and_removable() {
        let adapter = StartupAdapter::default();
        assert!(!adapter.enabled());
        adapter.set_enabled(true); assert!(adapter.enabled());
        adapter.set_enabled(false); assert!(!adapter.enabled());
    }
}

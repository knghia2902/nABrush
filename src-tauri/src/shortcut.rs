use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, sync::Mutex};
use tauri::State;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Ord, PartialOrd, Serialize, Deserialize)]
pub enum BindingAction {
    Visibility,
    ClickThrough,
    AlternateEmergency,
    Escape,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ShortcutConflict {
    pub action: BindingAction,
    pub message: String,
    pub suggestion: String,
}

pub struct ShortcutRegistry {
    bindings: Mutex<BTreeMap<BindingAction, String>>,
}

impl Default for ShortcutRegistry {
    fn default() -> Self {
        let mut bindings = BTreeMap::new();
        bindings.insert(BindingAction::Visibility, "commandOrControl+shift+KeyA".into());
        bindings.insert(BindingAction::ClickThrough, "commandOrControl+shift+KeyT".into());
        bindings.insert(BindingAction::AlternateEmergency, "commandOrControl+shift+KeyH".into());
        bindings.insert(BindingAction::Escape, "Escape".into());
        Self { bindings: Mutex::new(bindings) }
    }
}

impl ShortcutRegistry {
    pub fn bindings(&self) -> BTreeMap<BindingAction, String> {
        self.bindings.lock().expect("shortcut mutex poisoned").clone()
    }

    pub fn set(&self, action: BindingAction, accelerator: &str) -> Result<BTreeMap<BindingAction, String>, ShortcutConflict> {
        if action == BindingAction::Escape {
            return Err(ShortcutConflict { action, message: "Escape is the fixed emergency shortcut".into(), suggestion: "Use commandOrControl+shift+H".into() });
        }
        validate_accelerator(accelerator).map_err(|message| ShortcutConflict { action, message, suggestion: "Try commandOrControl+shift+P".into() })?;
        let mut candidate = self.bindings();
        if candidate.iter().any(|(existing, value)| *existing != action && value.eq_ignore_ascii_case(accelerator)) {
            return Err(ShortcutConflict { action, message: "That shortcut is already assigned".into(), suggestion: "Try commandOrControl+shift+P".into() });
        }
        candidate.insert(action, accelerator.to_owned());
        *self.bindings.lock().expect("shortcut mutex poisoned") = candidate.clone();
        Ok(candidate)
    }
}

pub fn validate_accelerator(value: &str) -> Result<(), String> {
    let parts: Vec<_> = value.split('+').collect();
    if parts.len() < 2 || parts.iter().any(|part| part.trim().is_empty()) {
        return Err("Accelerator must contain a modifier and a key".into());
    }
    let key = parts.last().unwrap();
    let valid_modifier = parts[..parts.len() - 1].iter().all(|modifier| matches!(*modifier, "commandOrControl" | "control" | "super" | "shift" | "alt"));
    if !valid_modifier || !(key.starts_with("Key") || key.starts_with("Digit") || *key == "Escape") {
        return Err("Unsupported accelerator format".into());
    }
    Ok(())
}

#[tauri::command]
pub fn get_shortcut_bindings(state: State<'_, ShortcutRegistry>) -> BTreeMap<BindingAction, String> { state.bindings() }

#[tauri::command]
pub fn set_shortcut_binding(action: BindingAction, accelerator: String, state: State<'_, ShortcutRegistry>) -> Result<BTreeMap<BindingAction, String>, ShortcutConflict> {
    state.set(action, &accelerator)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn defaults_are_documented_and_escape_is_fixed() {
        let registry = ShortcutRegistry::default();
        let values = registry.bindings();
        assert_eq!(values[&BindingAction::Visibility], "commandOrControl+shift+KeyA");
        assert_eq!(values[&BindingAction::ClickThrough], "commandOrControl+shift+KeyT");
        assert_eq!(values[&BindingAction::AlternateEmergency], "commandOrControl+shift+KeyH");
        assert_eq!(values[&BindingAction::Escape], "Escape");
        assert!(registry.set(BindingAction::Escape, "commandOrControl+KeyE").is_err());
    }
    #[test]
    fn rebind_is_transactional_and_preserves_other_bindings() {
        let registry = ShortcutRegistry::default();
        let before = registry.bindings();
        registry.set(BindingAction::Visibility, "commandOrControl+shift+KeyP").unwrap();
        assert_eq!(registry.bindings()[&BindingAction::Visibility], "commandOrControl+shift+KeyP");
        assert_eq!(registry.bindings()[&BindingAction::ClickThrough], before[&BindingAction::ClickThrough]);
    }
    #[test]
    fn conflicts_and_invalid_values_leave_last_working_set_intact() {
        let registry = ShortcutRegistry::default();
        let before = registry.bindings();
        assert!(registry.set(BindingAction::Visibility, "commandOrControl+shift+KeyT").is_err());
        assert!(registry.set(BindingAction::Visibility, "not-a-shortcut").is_err());
        assert_eq!(registry.bindings(), before);
    }
}

use crate::controller::{OverlayMode, ShortcutAction};

pub const MODES: &[&str] = &["Hidden", "VisibleInteractive", "VisibleClickThrough"];
pub const ACTIONS: &[&str] = &["Show", "Hide", "ToggleVisibility", "ToggleClickThrough", "Esc", "Retry"];

pub fn mode_name(mode: OverlayMode) -> &'static str {
    match mode {
        OverlayMode::Hidden => "Hidden",
        OverlayMode::VisibleInteractive => "VisibleInteractive",
        OverlayMode::VisibleClickThrough => "VisibleClickThrough",
    }
}

pub fn action_name(action: ShortcutAction) -> &'static str {
    match action {
        ShortcutAction::Show => "Show",
        ShortcutAction::Hide => "Hide",
        ShortcutAction::ToggleVisibility => "ToggleVisibility",
        ShortcutAction::ToggleClickThrough => "ToggleClickThrough",
        ShortcutAction::Esc => "Esc",
        ShortcutAction::Retry => "Retry",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn vocabulary_matches_typescript_fixture() {
        let fixture: Value = serde_json::from_str(include_str!("../../src/types/mode-schema.json")).unwrap();
        assert_eq!(fixture["modes"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect::<Vec<_>>(), MODES);
        assert_eq!(fixture["actions"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect::<Vec<_>>(), ACTIONS);
        assert_eq!(serde_json::to_string(&OverlayMode::VisibleClickThrough).unwrap(), "\"VisibleClickThrough\"");
        assert_eq!(serde_json::to_string(&ShortcutAction::ToggleClickThrough).unwrap(), "\"ToggleClickThrough\"");
    }
}

use serde::{Deserialize, Serialize};

const PARITY_SCHEMA: &str = include_str!("../../src/types/platform-parity-schema.json");
const SCHEMA_VERSION: u8 = 1;
const SHORTCUT_CONCEPTS: [&str; 4] = ["Show", "ToggleVisibility", "ToggleClickThrough", "Esc"];
const TOOL_ORDER: [&str; 8] = [
    "pen",
    "highlighter",
    "line",
    "arrow",
    "rectangle",
    "ellipse",
    "text",
    "eraser",
];
const INCLUDED: [&str; 2] = ["background", "annotations"];
const EXCLUDED: [&str; 3] = ["toolbar", "mode-badge", "error-badge"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformParityContract {
    pub version: u8,
    pub shortcut_concepts: Vec<String>,
    pub tool_order: Vec<String>,
    pub mode_feedback: ModeFeedback,
    pub export_semantics: ExportSemantics,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeFeedback {
    pub interactive_label: String,
    pub click_through_label: String,
    pub anchors: FeedbackAnchors,
    pub scene_excluded: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackAnchors {
    pub mode_badge: String,
    pub error_badge: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSemantics {
    pub composition: String,
    pub composition_passes: u8,
    pub pixel_density: String,
    pub included: Vec<String>,
    pub excluded: Vec<String>,
}

pub fn load_contract() -> Result<PlatformParityContract, String> {
    let contract: PlatformParityContract = serde_json::from_str(PARITY_SCHEMA)
        .map_err(|error| format!("invalid platform parity fixture: {error}"))?;
    validate_contract(&contract)?;
    Ok(contract)
}

pub fn validate_contract(contract: &PlatformParityContract) -> Result<(), String> {
    if contract.version != SCHEMA_VERSION {
        return Err(format!("unsupported platform parity schema version {}", contract.version));
    }
    validate_ordered("shortcut concepts", &contract.shortcut_concepts, &SHORTCUT_CONCEPTS)?;
    validate_ordered("tool order", &contract.tool_order, &TOOL_ORDER)?;

    if contract.mode_feedback.interactive_label != "Đang vẽ"
        || contract.mode_feedback.click_through_label != "Xuyên qua"
        || !contract.mode_feedback.scene_excluded
        || contract.mode_feedback.anchors.mode_badge != "mode-badge"
        || contract.mode_feedback.anchors.error_badge != "error-badge"
    {
        return Err("mode feedback labels, anchors, or scene exclusion are invalid".into());
    }

    if contract.export_semantics.composition != "canonical-logical-desktop"
        || contract.export_semantics.composition_passes != 1
        || contract.export_semantics.pixel_density != "display"
    {
        return Err("export composition must be one display-density logical-desktop pass".into());
    }
    validate_ordered("export inclusion", &contract.export_semantics.included, &INCLUDED)?;
    validate_ordered("export exclusion", &contract.export_semantics.excluded, &EXCLUDED)?;
    if contract
        .export_semantics
        .excluded
        .iter()
        .any(|item| contract.export_semantics.included.iter().any(|included| included == item))
    {
        return Err("export inclusion and exclusion sets overlap".into());
    }
    Ok(())
}

fn validate_ordered<const N: usize>(name: &str, actual: &[String], expected: &[&str; N]) -> Result<(), String> {
    if actual.len() != N || actual.iter().zip(expected.iter()).any(|(actual, expected)| actual != expected) {
        return Err(format!("{name} must match the checked-in ordered vocabulary"));
    }
    Ok(())
}

/// Return only the checked-in parity fixture. This command accepts no caller data
/// and has no access to scene, viewport, shortcut, or permission state.
#[tauri::command]
pub fn platform_parity_contract() -> Result<PlatformParityContract, String> {
    load_contract()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixture_is_valid_and_serializes_back_identically() {
        let contract = load_contract().expect("fixture should validate");
        let serialized = serde_json::to_value(contract).expect("contract should serialize");
        let fixture: serde_json::Value = serde_json::from_str(PARITY_SCHEMA).expect("fixture JSON");
        assert_eq!(serialized, fixture);
    }

    #[test]
    fn native_payload_is_read_only_and_caller_independent() {
        let first = platform_parity_contract().expect("native payload should load");
        let second = platform_parity_contract().expect("native payload should reload");
        assert_eq!(first, second);
        assert_eq!(first.tool_order, TOOL_ORDER.iter().map(|value| (*value).to_owned()).collect::<Vec<_>>());
    }
}

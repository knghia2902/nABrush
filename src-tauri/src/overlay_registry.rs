use crate::controller::OverlayMode;
use crate::display::{DisplayDescriptor, DisplayId, DisplaySnapshot, DisplayViewport};
use crate::errors::{display_topology_error, ErrorStore};
use crate::platform::PlatformWindowAdapter;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use std::fmt;
use tauri::{AppHandle, Emitter, Manager, Position, Runtime, Size, WebviewUrl, WebviewWindowBuilder};

/// The fixed bootstrap label remains configured in `tauri.conf.json`; every
/// additional viewport receives a Rust-generated label derived from its
/// validated opaque display identity.
pub const OVERLAY_LABEL_PREFIX: &str = "overlay-display-";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RegistryError {
    InvalidDisplayIdentity,
    DuplicateNativeLabel,
    InvalidSceneItem(String),
    NativeOperation { display_id: DisplayId, detail: String },
}

impl fmt::Display for RegistryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidDisplayIdentity => f.write_str("display identity is invalid"),
            Self::DuplicateNativeLabel => f.write_str("display identities produced a duplicate native label"),
            Self::InvalidSceneItem(reason) => write!(f, "scene item is invalid: {reason}"),
            Self::NativeOperation { display_id, detail } => {
                write!(f, "native viewport {} failed: {detail}", display_id.as_str())
            }
        }
    }
}

impl std::error::Error for RegistryError {}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneSnapshot {
    pub scene_id: String,
    pub items: Vec<Value>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SceneStore {
    scene_id: String,
    items: Vec<Value>,
}

impl Default for SceneStore {
    fn default() -> Self { Self::new() }
}

impl SceneStore {
    pub fn new() -> Self {
        Self {
            // The value is opaque to the renderer and intentionally stable for
            // the lifetime of the app, including when a display is removed.
            scene_id: "webview-scene".into(),
            items: Vec::new(),
        }
    }

    pub fn with_id(scene_id: impl Into<String>) -> Result<Self, RegistryError> {
        let scene_id = scene_id.into();
        if scene_id.trim().is_empty() || scene_id.len() > 256 {
            return Err(RegistryError::InvalidSceneItem("scene id is empty or too long".into()));
        }
        Ok(Self { scene_id, items: Vec::new() })
    }

    pub fn scene_id(&self) -> &str { &self.scene_id }

    pub fn snapshot(&self) -> SceneSnapshot {
        SceneSnapshot { scene_id: self.scene_id.clone(), items: self.items.clone() }
    }

    pub fn commit_scene_item(&mut self, item: Value) -> Result<SceneSnapshot, RegistryError> {
        validate_scene_item(&item)?;
        let id = item.get("id").and_then(Value::as_str).expect("validated scene item id");
        if self.items.iter().any(|existing| existing.get("id").and_then(Value::as_str) == Some(id)) {
            return Ok(self.snapshot());
        }
        self.items.push(item);
        Ok(self.snapshot())
    }

    pub fn clear(&mut self) { self.items.clear(); }
}

fn validate_scene_item(item: &Value) -> Result<(), RegistryError> {
    let object = item.as_object().ok_or_else(|| RegistryError::InvalidSceneItem("item must be an object".into()))?;
    let id = object.get("id").and_then(Value::as_str).ok_or_else(|| RegistryError::InvalidSceneItem("item id must be a string".into()))?;
    if id.trim().is_empty() || id.len() > 256 {
        return Err(RegistryError::InvalidSceneItem("item id is empty or too long".into()));
    }
    let kind = object.get("kind").and_then(Value::as_str).ok_or_else(|| RegistryError::InvalidSceneItem("item kind must be a string".into()))?;
    if !matches!(kind, "stroke" | "shape" | "text") {
        return Err(RegistryError::InvalidSceneItem("item kind is unsupported".into()));
    }
    validate_finite_json(item)
}

fn validate_finite_json(value: &Value) -> Result<(), RegistryError> {
    match value {
        Value::Array(values) => values.iter().try_for_each(validate_finite_json),
        Value::Object(values) => values.values().try_for_each(validate_finite_json),
        Value::Number(number) if number.as_f64().is_none() => Err(RegistryError::InvalidSceneItem("numeric payload is not finite".into())),
        _ => Ok(()),
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct OverlayViewport {
    pub id: DisplayId,
    pub descriptor: DisplayDescriptor,
    pub label: String,
    pub scene_ref: String,
    pub mode: OverlayMode,
    pub click_through: bool,
    pub visible: bool,
    pub geometry_revision: u64,
}

impl OverlayViewport {
    fn new(descriptor: DisplayDescriptor, scene_ref: &str, label: String, mode: OverlayMode) -> Self {
        let click_through = mode == OverlayMode::VisibleClickThrough;
        Self {
            id: descriptor.id.clone(),
            descriptor,
            label,
            scene_ref: scene_ref.into(),
            mode,
            click_through,
            visible: mode != OverlayMode::Hidden,
            geometry_revision: 0,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RegistryChanges {
    pub added: Vec<DisplayId>,
    pub removed: Vec<DisplayId>,
    pub updated: Vec<DisplayId>,
}

#[derive(Debug)]
pub struct OverlayRegistry {
    viewports: BTreeMap<DisplayId, OverlayViewport>,
    scene_ref: String,
    mode: OverlayMode,
    click_through: bool,
    last_snapshot: DisplaySnapshot,
}

impl Default for OverlayRegistry {
    fn default() -> Self { Self::new("webview-scene").expect("default scene id is valid") }
}

impl OverlayRegistry {
    pub fn new(scene_ref: impl Into<String>) -> Result<Self, RegistryError> {
        let scene_ref = scene_ref.into();
        if scene_ref.trim().is_empty() || scene_ref.len() > 256 {
            return Err(RegistryError::InvalidSceneItem("scene id is empty or too long".into()));
        }
        Ok(Self {
            viewports: BTreeMap::new(),
            scene_ref,
            mode: OverlayMode::Hidden,
            click_through: false,
            last_snapshot: DisplaySnapshot::empty(),
        })
    }

    pub fn scene_ref(&self) -> &str { &self.scene_ref }
    pub fn mode(&self) -> OverlayMode { self.mode }
    pub fn click_through(&self) -> bool { self.click_through }
    pub fn viewports(&self) -> &BTreeMap<DisplayId, OverlayViewport> { &self.viewports }
    pub fn viewport(&self, id: &DisplayId) -> Option<&OverlayViewport> { self.viewports.get(id) }
    pub fn last_snapshot(&self) -> &DisplaySnapshot { &self.last_snapshot }

    pub fn reconcile(&mut self, snapshot: DisplaySnapshot) -> Result<RegistryChanges, RegistryError> {
        snapshot.validate().map_err(|_| RegistryError::InvalidDisplayIdentity)?;
        let mut labels = BTreeSet::new();
        for id in snapshot.displays.keys() {
            if !labels.insert(generated_overlay_label(id)) {
                return Err(RegistryError::DuplicateNativeLabel);
            }
        }
        let mut changes = RegistryChanges::default();
        for id in self.viewports.keys().filter(|id| !snapshot.displays.contains_key(*id)).cloned().collect::<Vec<_>>() {
            self.viewports.remove(&id);
            changes.removed.push(id);
        }
        for (id, descriptor) in &snapshot.displays {
            match self.viewports.get_mut(id) {
                Some(viewport) if viewport.descriptor != *descriptor => {
                    viewport.descriptor = descriptor.clone();
                    viewport.geometry_revision = viewport.geometry_revision.saturating_add(1);
                    changes.updated.push(id.clone());
                }
                Some(_) => {}
                None => {
                    let label = generated_overlay_label(id);
                    self.viewports.insert(id.clone(), OverlayViewport::new(descriptor.clone(), &self.scene_ref, label, self.mode));
                    changes.added.push(id.clone());
                }
            }
        }
        self.last_snapshot = snapshot;
        Ok(changes)
    }

    /// Apply one global mode transaction to every registered viewport.
    /// Event emission is deliberately performed by the controller only after
    /// this complete in-memory update succeeds.
    pub fn apply_mode(&mut self, mode: OverlayMode) {
        self.mode = mode;
        self.click_through = mode == OverlayMode::VisibleClickThrough;
        for viewport in self.viewports.values_mut() {
            viewport.mode = mode;
            viewport.click_through = self.click_through;
            viewport.visible = mode != OverlayMode::Hidden;
        }
    }

    pub fn apply_mode_to_adapter<A: PlatformWindowAdapter + Default>(
        &mut self,
        mode: OverlayMode,
        adapters: &mut BTreeMap<DisplayId, A>,
    ) -> Result<(), RegistryError> {
        self.apply_mode(mode);
        for (id, viewport) in &self.viewports {
            let adapter = adapters.entry(id.clone()).or_default();
            adapter.update_geometry(&viewport.descriptor).map_err(|detail| RegistryError::NativeOperation { display_id: id.clone(), detail })?;
            match mode {
                OverlayMode::Hidden => adapter.hide(),
                OverlayMode::VisibleInteractive => adapter.show_interactive(),
                OverlayMode::VisibleClickThrough => {
                    adapter.show_interactive();
                    adapter.set_click_through(true);
                }
            }
        }
        adapters.retain(|id, _| self.viewports.contains_key(id));
        Ok(())
    }

    /// Plan registry state synchronously, then perform native WebView work on
    /// Tauri's runtime boundary. In particular, this function is safe to call
    /// from a display notification handler because no window is built inline.
    pub fn reconcile_native_async<R: Runtime>(
        &mut self,
        app: &AppHandle<R>,
        snapshot: DisplaySnapshot,
    ) -> Result<RegistryChanges, RegistryError> {
        let changes = self.reconcile(snapshot)?;
        let viewports = self.viewports.values().cloned().collect::<Vec<_>>();
        let removed = changes.removed.clone();
        let mode = self.mode;
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            if let Err((display_id, detail)) = apply_native_viewports(&app, viewports, removed, mode).await {
                let state = app.state::<ErrorStore>();
                let error = display_topology_error(display_id.as_str(), &detail);
                if let Err(publish_error) = state.publish(&app, Some(error)) {
                    eprintln!("nABrush could not publish display error: {publish_error}");
                }
            }
        });
        Ok(changes)
    }

    pub fn broadcast_scene<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        snapshot: &SceneSnapshot,
    ) -> tauri::Result<()> {
        app.emit("scene-changed", snapshot)
    }
}

async fn apply_native_viewports<R: Runtime>(
    app: &AppHandle<R>,
    viewports: Vec<OverlayViewport>,
    removed: Vec<DisplayId>,
    mode: OverlayMode,
) -> Result<(), (DisplayId, String)> {
    for id in removed {
        if let Some(window) = app.get_webview_window(&generated_overlay_label(&id)) {
            window.destroy().map_err(|error| (id.clone(), error.to_string()))?;
        }
    }
    for viewport in viewports {
        let label = viewport.label.clone();
        let window = if let Some(window) = app.get_webview_window(&label) {
            window
        } else {
            WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
                .title("nABrush Overlay")
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .focusable(!viewport.click_through)
                .visible(false)
                .position(viewport.descriptor.origin.x, viewport.descriptor.origin.y)
                .inner_size(viewport.descriptor.logical_size.width, viewport.descriptor.logical_size.height)
                .build()
                .map_err(|error| (viewport.id.clone(), error.to_string()))?
        };
        window
            .set_position(Position::Logical(tauri::LogicalPosition::new(
                viewport.descriptor.origin.x,
                viewport.descriptor.origin.y,
            )))
            .map_err(|error| (viewport.id.clone(), error.to_string()))?;
        window
            .set_size(Size::Logical(tauri::LogicalSize::new(
                viewport.descriptor.logical_size.width,
                viewport.descriptor.logical_size.height,
            )))
            .map_err(|error| (viewport.id.clone(), error.to_string()))?;
        window
            .set_focusable(!viewport.click_through)
            .map_err(|error| (viewport.id.clone(), error.to_string()))?;
        window
            .set_ignore_cursor_events(viewport.click_through)
            .map_err(|error| (viewport.id.clone(), error.to_string()))?;
        if mode == OverlayMode::Hidden {
            window.hide().map_err(|error| (viewport.id.clone(), error.to_string()))?;
        } else {
            window.show().map_err(|error| (viewport.id.clone(), error.to_string()))?;
        }
        app.emit("overlay-viewport-changed", DisplayViewport::from(&viewport.descriptor))
            .map_err(|error| (viewport.id.clone(), error.to_string()))?;
    }
    Ok(())
}

pub fn generated_overlay_label(id: &DisplayId) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in id.as_str().as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{OVERLAY_LABEL_PREFIX}{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::display::{DisplayOrientation, DisplayPoint, DisplaySize};
    use crate::platform::TauriWindowAdapter;

    fn descriptor(id: &str, x: f64, scale: f64) -> DisplayDescriptor {
        DisplayDescriptor {
            id: DisplayId::new(id).unwrap(),
            origin: DisplayPoint { x, y: 0.0 },
            logical_size: DisplaySize { width: 1920.0, height: 1080.0 },
            scale_factor: scale,
            orientation: DisplayOrientation::Degrees0,
        }
    }

    fn snapshot(values: Vec<DisplayDescriptor>) -> DisplaySnapshot {
        DisplaySnapshot { displays: values.into_iter().map(|value| (value.id.clone(), value)).collect() }
    }

    #[test]
    fn registry_reconciles_add_remove_readd_and_updates_in_place() {
        let left = descriptor("left", -1920.0, 2.0);
        let main = descriptor("main", 0.0, 1.0);
        let mut registry = OverlayRegistry::new("webview-scene").unwrap();
        let changes = registry.reconcile(snapshot(vec![left.clone(), main.clone()])).unwrap();
        assert_eq!(changes.added.len(), 2);
        assert_eq!(registry.viewports().len(), 2);
        let scene_refs = registry.viewports().values().map(|v| v.scene_ref.clone()).collect::<BTreeSet<_>>();
        assert_eq!(scene_refs, BTreeSet::from(["webview-scene".into()]));
        let mut rotated = main.clone();
        rotated.scale_factor = 1.5;
        let changes = registry.reconcile(snapshot(vec![left.clone(), rotated])).unwrap();
        assert_eq!(changes.updated, vec![main.id.clone()]);
        assert_eq!(changes.added.len(), 0);
        let left_label = registry.viewport(&left.id).unwrap().label.clone();
        registry.reconcile(snapshot(vec![main.clone()])).unwrap();
        assert!(registry.viewport(&left.id).is_none());
        registry.reconcile(snapshot(vec![left])).unwrap();
        assert_eq!(registry.viewport(&DisplayId::new("left").unwrap()).unwrap().label, left_label);
        assert_eq!(registry.scene_ref(), "webview-scene");
    }

    #[test]
    fn registry_applies_global_mode_and_pointer_state_to_every_viewport() {
        let mut registry = OverlayRegistry::new("webview-scene").unwrap();
        registry.reconcile(snapshot(vec![descriptor("left", -1920.0, 2.0), descriptor("main", 0.0, 1.0)])).unwrap();
        let mut adapters = BTreeMap::<DisplayId, TauriWindowAdapter>::new();
        registry.apply_mode_to_adapter(OverlayMode::VisibleClickThrough, &mut adapters).unwrap();
        assert!(registry.viewports().values().all(|viewport| viewport.click_through && viewport.visible));
        assert!(adapters.values().all(|adapter| adapter.click_through));
        registry.apply_mode_to_adapter(OverlayMode::Hidden, &mut adapters).unwrap();
        assert!(registry.viewports().values().all(|viewport| !viewport.visible));
        assert!(adapters.values().all(|adapter| !adapter.visible));
    }

    #[test]
    fn scene_store_validates_and_retains_items_when_viewports_change() {
        let mut scene = SceneStore::default();
        scene.commit_scene_item(serde_json::json!({"id":"stroke-1","kind":"stroke","points":[{"x":1.0,"y":2.0}]})).unwrap();
        let before = scene.snapshot();
        assert!(scene.commit_scene_item(serde_json::json!({"id":"","kind":"stroke"})).is_err());
        assert_eq!(scene.snapshot(), before);
        assert_eq!(scene.commit_scene_item(serde_json::json!({"id":"stroke-1","kind":"stroke"})).unwrap(), before);
    }
}

use crate::controller::OverlayMode;
use crate::display::{DisplayDescriptor, DisplayId, DisplaySnapshot, DisplayViewport};
use crate::errors::{display_topology_error, ErrorStore};
use crate::platform::PlatformWindowAdapter;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use std::fmt;
use tauri::{
    AppHandle, Emitter, Manager, Position, Runtime, Size, WebviewUrl, WebviewWindowBuilder,
};

/// The fixed bootstrap label remains configured in `tauri.conf.json`; every
/// additional viewport receives a Rust-generated label derived from its
/// validated opaque display identity.
pub const OVERLAY_LABEL_PREFIX: &str = "overlay-display-";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RegistryError {
    InvalidDisplayIdentity,
    DuplicateNativeLabel,
    InvalidSceneItem(String),
    NativeOperation {
        display_id: DisplayId,
        detail: String,
    },
}

impl fmt::Display for RegistryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidDisplayIdentity => f.write_str("display identity is invalid"),
            Self::DuplicateNativeLabel => {
                f.write_str("display identities produced a duplicate native label")
            }
            Self::InvalidSceneItem(reason) => write!(f, "scene item is invalid: {reason}"),
            Self::NativeOperation { display_id, detail } => {
                write!(
                    f,
                    "native viewport {} failed: {detail}",
                    display_id.as_str()
                )
            }
        }
    }
}

impl std::error::Error for RegistryError {}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnnotationFill {
    None,
    Solid,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StrokeTool {
    Pen,
    Highlighter,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShapeTool {
    Line,
    Arrow,
    Rectangle,
    Ellipse,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextTool {
    Text,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenePoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum SceneGeometry {
    Line {
        start: ScenePoint,
        end: ScenePoint,
    },
    Rectangle {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    },
    Ellipse {
        center: ScenePoint,
        #[serde(rename = "radiusX")]
        radius_x: f64,
        #[serde(rename = "radiusY")]
        radius_y: f64,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationStyle {
    pub color: String,
    pub opacity: f64,
    pub width: f64,
    pub fill: AnnotationFill,
    pub fill_color: String,
    pub fill_opacity: f64,
    pub text_size: f64,
}

fn default_pen_style() -> AnnotationStyle {
    AnnotationStyle {
        color: "#ef4444".into(),
        opacity: 0.92,
        width: 2.0,
        fill: AnnotationFill::None,
        fill_color: "#ef4444".into(),
        fill_opacity: 0.18,
        text_size: 24.0,
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum SceneItem {
    #[serde(rename = "stroke")]
    Stroke {
        id: String,
        tool: StrokeTool,
        points: Vec<ScenePoint>,
        style: AnnotationStyle,
    },
    #[serde(rename = "shape")]
    Shape {
        id: String,
        tool: ShapeTool,
        geometry: SceneGeometry,
        style: AnnotationStyle,
    },
    #[serde(rename = "text")]
    Text {
        id: String,
        tool: TextTool,
        anchor: ScenePoint,
        text: String,
        style: AnnotationStyle,
    },
}

impl SceneItem {
    fn id(&self) -> &str {
        match self {
            Self::Stroke { id, .. } | Self::Shape { id, .. } | Self::Text { id, .. } => id,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneSnapshot {
    pub scene_id: String,
    pub items: Vec<SceneItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SceneStore {
    scene_id: String,
    items: Vec<SceneItem>,
}

impl Default for SceneStore {
    fn default() -> Self {
        Self::new()
    }
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
            return Err(RegistryError::InvalidSceneItem(
                "scene id is empty or too long".into(),
            ));
        }
        Ok(Self {
            scene_id,
            items: Vec::new(),
        })
    }

    pub fn scene_id(&self) -> &str {
        &self.scene_id
    }

    pub fn snapshot(&self) -> SceneSnapshot {
        SceneSnapshot {
            scene_id: self.scene_id.clone(),
            items: self.items.clone(),
        }
    }

    pub fn commit_scene_item(&mut self, item: Value) -> Result<SceneSnapshot, RegistryError> {
        // Replayed IDs are idempotent even when an old client resends a legacy
        // or otherwise incomplete copy of an item already retained.
        if let Some(id) = item.get("id").and_then(Value::as_str) {
            if self.items.iter().any(|existing| existing.id() == id) {
                return Ok(self.snapshot());
            }
        }
        let item = normalize_scene_item(item)?;
        let id = item.id();
        if self.items.iter().any(|existing| existing.id() == id) {
            return Ok(self.snapshot());
        }
        self.items.push(item);
        Ok(self.snapshot())
    }

    pub fn erase_scene_item(&mut self, id: &str) -> Result<SceneSnapshot, RegistryError> {
        validate_id(id)?;
        if let Some(position) = self.items.iter().position(|item| item.id() == id) {
            self.items.remove(position);
        }
        Ok(self.snapshot())
    }

    pub fn clear(&mut self) {
        self.items.clear();
    }
}

fn normalize_scene_item(mut item: Value) -> Result<SceneItem, RegistryError> {
    let object = item
        .as_object_mut()
        .ok_or_else(|| RegistryError::InvalidSceneItem("item must be an object".into()))?;
    let kind = object
        .get("kind")
        .and_then(Value::as_str)
        .ok_or_else(|| RegistryError::InvalidSceneItem("item kind must be a string".into()))?
        .to_owned();
    if kind == "stroke" {
        object
            .entry("tool")
            .or_insert_with(|| Value::String("pen".into()));
        object.entry("style").or_insert_with(|| {
            serde_json::to_value(default_pen_style()).expect("default style serializes")
        });
    }
    validate_scene_keys(object, &kind)?;
    let parsed = serde_json::from_value::<SceneItem>(item).map_err(|error| {
        RegistryError::InvalidSceneItem(format!("typed payload is invalid: {error}"))
    })?;
    validate_typed_scene_item(&parsed)?;
    Ok(parsed)
}

fn validate_scene_keys(
    object: &serde_json::Map<String, Value>,
    kind: &str,
) -> Result<(), RegistryError> {
    let allowed = match kind {
        "stroke" => ["id", "kind", "tool", "points", "style"].as_slice(),
        "shape" => ["id", "kind", "tool", "geometry", "style"].as_slice(),
        "text" => ["id", "kind", "tool", "anchor", "text", "style"].as_slice(),
        _ => {
            return Err(RegistryError::InvalidSceneItem(
                "item kind is unsupported".into(),
            ))
        }
    };
    if let Some(key) = object.keys().find(|key| !allowed.contains(&key.as_str())) {
        return Err(RegistryError::InvalidSceneItem(format!(
            "unknown field: {key}"
        )));
    }
    validate_style_object(object.get("style"))?;
    match kind {
        "stroke" => {
            let points = object
                .get("points")
                .and_then(Value::as_array)
                .ok_or_else(|| RegistryError::InvalidSceneItem("points must be an array".into()))?;
            for point in points {
                validate_point_object(point)?;
            }
        }
        "shape" => validate_geometry_object(object.get("geometry"))?,
        "text" => validate_point_object(
            object
                .get("anchor")
                .ok_or_else(|| RegistryError::InvalidSceneItem("text anchor is missing".into()))?,
        )?,
        _ => {}
    }
    Ok(())
}

fn validate_object_keys(
    object: &serde_json::Map<String, Value>,
    allowed: &[&str],
) -> Result<(), RegistryError> {
    if let Some(key) = object.keys().find(|key| !allowed.contains(&key.as_str())) {
        return Err(RegistryError::InvalidSceneItem(format!(
            "unknown nested field: {key}"
        )));
    }
    Ok(())
}

fn validate_style_object(value: Option<&Value>) -> Result<(), RegistryError> {
    let object = value
        .and_then(Value::as_object)
        .ok_or_else(|| RegistryError::InvalidSceneItem("style must be an object".into()))?;
    validate_object_keys(
        object,
        &[
            "color",
            "opacity",
            "width",
            "fill",
            "fillColor",
            "fillOpacity",
            "textSize",
        ],
    )
}

fn validate_point_object(value: &Value) -> Result<(), RegistryError> {
    let object = value
        .as_object()
        .ok_or_else(|| RegistryError::InvalidSceneItem("point must be an object".into()))?;
    validate_object_keys(object, &["x", "y"])
}

fn validate_geometry_object(value: Option<&Value>) -> Result<(), RegistryError> {
    let object = value
        .and_then(Value::as_object)
        .ok_or_else(|| RegistryError::InvalidSceneItem("geometry must be an object".into()))?;
    match object.get("type").and_then(Value::as_str) {
        Some("line") => {
            validate_object_keys(object, &["type", "start", "end"])?;
            validate_point_object(
                object.get("start").ok_or_else(|| {
                    RegistryError::InvalidSceneItem("line start is missing".into())
                })?,
            )?;
            validate_point_object(
                object
                    .get("end")
                    .ok_or_else(|| RegistryError::InvalidSceneItem("line end is missing".into()))?,
            )?;
        }
        Some("rectangle") => validate_object_keys(object, &["type", "x", "y", "width", "height"])?,
        Some("ellipse") => {
            validate_object_keys(object, &["type", "center", "radiusX", "radiusY"])?;
            validate_point_object(object.get("center").ok_or_else(|| {
                RegistryError::InvalidSceneItem("ellipse center is missing".into())
            })?)?;
        }
        _ => {
            return Err(RegistryError::InvalidSceneItem(
                "geometry type is unsupported".into(),
            ))
        }
    }
    Ok(())
}

fn validate_id(id: &str) -> Result<(), RegistryError> {
    if id.trim().is_empty() || id.len() > 256 {
        return Err(RegistryError::InvalidSceneItem(
            "item id is empty or too long".into(),
        ));
    }
    Ok(())
}

fn validate_coordinate(value: f64, field: &str) -> Result<(), RegistryError> {
    if !value.is_finite() || !(-1_000_000.0..=1_000_000.0).contains(&value) {
        return Err(RegistryError::InvalidSceneItem(format!(
            "{field} is outside the finite canonical range"
        )));
    }
    Ok(())
}

fn validate_point(point: &ScenePoint, field: &str) -> Result<(), RegistryError> {
    validate_coordinate(point.x, &format!("{field}.x"))?;
    validate_coordinate(point.y, &format!("{field}.y"))
}

fn validate_style(style: &AnnotationStyle) -> Result<(), RegistryError> {
    if style.color.trim().is_empty()
        || style.color.len() > 64
        || style.fill_color.trim().is_empty()
        || style.fill_color.len() > 64
    {
        return Err(RegistryError::InvalidSceneItem(
            "style color is empty or too long".into(),
        ));
    }
    if !style.opacity.is_finite() || !(0.0..=1.0).contains(&style.opacity) {
        return Err(RegistryError::InvalidSceneItem(
            "style opacity is outside [0, 1]".into(),
        ));
    }
    if !style.width.is_finite() || !(0.5..=128.0).contains(&style.width) {
        return Err(RegistryError::InvalidSceneItem(
            "style width is outside [0.5, 128]".into(),
        ));
    }
    if !style.fill_opacity.is_finite() || !(0.0..=1.0).contains(&style.fill_opacity) {
        return Err(RegistryError::InvalidSceneItem(
            "style fill opacity is outside [0, 1]".into(),
        ));
    }
    if !style.text_size.is_finite() || !(8.0..=256.0).contains(&style.text_size) {
        return Err(RegistryError::InvalidSceneItem(
            "style text size is outside [8, 256]".into(),
        ));
    }
    Ok(())
}

fn validate_geometry(tool: &ShapeTool, geometry: &SceneGeometry) -> Result<(), RegistryError> {
    match (tool, geometry) {
        (ShapeTool::Line | ShapeTool::Arrow, SceneGeometry::Line { start, end }) => {
            validate_point(start, "geometry.start")?;
            validate_point(end, "geometry.end")?;
            if start.x == end.x && start.y == end.y {
                return Err(RegistryError::InvalidSceneItem(
                    "line geometry has no length".into(),
                ));
            }
        }
        (
            ShapeTool::Rectangle,
            SceneGeometry::Rectangle {
                x,
                y,
                width,
                height,
            },
        ) => {
            validate_coordinate(*x, "geometry.x")?;
            validate_coordinate(*y, "geometry.y")?;
            if !width.is_finite() || !height.is_finite() || *width <= 0.0 || *height <= 0.0 {
                return Err(RegistryError::InvalidSceneItem(
                    "rectangle dimensions are invalid".into(),
                ));
            }
            validate_coordinate(*x + *width, "geometry.right")?;
            validate_coordinate(*y + *height, "geometry.bottom")?;
        }
        (
            ShapeTool::Ellipse,
            SceneGeometry::Ellipse {
                center,
                radius_x,
                radius_y,
            },
        ) => {
            validate_point(center, "geometry.center")?;
            if !radius_x.is_finite() || !radius_y.is_finite() || *radius_x <= 0.0 || *radius_y <= 0.0
            {
                return Err(RegistryError::InvalidSceneItem(
                    "ellipse radii are invalid".into(),
                ));
            }
            validate_coordinate(center.x - *radius_x, "geometry.left")?;
            validate_coordinate(center.x + *radius_x, "geometry.right")?;
            validate_coordinate(center.y - *radius_y, "geometry.top")?;
            validate_coordinate(center.y + *radius_y, "geometry.bottom")?;
        }
        _ => {
            return Err(RegistryError::InvalidSceneItem(
                "geometry does not match tool".into(),
            ))
        }
    }
    Ok(())
}

fn validate_typed_scene_item(item: &SceneItem) -> Result<(), RegistryError> {
    validate_id(item.id())?;
    match item {
        SceneItem::Stroke {
            tool,
            points,
            style,
            ..
        } => {
            if points.is_empty() || points.len() > 4_096 {
                return Err(RegistryError::InvalidSceneItem(
                    "stroke points are empty or too long".into(),
                ));
            }
            for point in points {
                validate_point(point, "points")?;
            }
            let _ = tool;
            validate_style(style)
        }
        SceneItem::Shape {
            tool,
            geometry,
            style,
            ..
        } => {
            validate_geometry(tool, geometry)?;
            validate_style(style)
        }
        SceneItem::Text {
            tool,
            anchor,
            text,
            style,
            ..
        } => {
            if !matches!(tool, TextTool::Text) {
                return Err(RegistryError::InvalidSceneItem(
                    "text tool is unsupported".into(),
                ));
            }
            validate_point(anchor, "anchor")?;
            if text.is_empty() || text.len() > 4_096 || text.split('\n').count() > 256 {
                return Err(RegistryError::InvalidSceneItem(
                    "text is empty, too long, or has too many lines".into(),
                ));
            }
            validate_style(style)
        }
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
    fn new(
        descriptor: DisplayDescriptor,
        scene_ref: &str,
        label: String,
        mode: OverlayMode,
    ) -> Self {
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
    fn default() -> Self {
        Self::new("webview-scene").expect("default scene id is valid")
    }
}

impl OverlayRegistry {
    pub fn new(scene_ref: impl Into<String>) -> Result<Self, RegistryError> {
        let scene_ref = scene_ref.into();
        if scene_ref.trim().is_empty() || scene_ref.len() > 256 {
            return Err(RegistryError::InvalidSceneItem(
                "scene id is empty or too long".into(),
            ));
        }
        Ok(Self {
            viewports: BTreeMap::new(),
            scene_ref,
            mode: OverlayMode::Hidden,
            click_through: false,
            last_snapshot: DisplaySnapshot::empty(),
        })
    }

    pub fn scene_ref(&self) -> &str {
        &self.scene_ref
    }
    pub fn mode(&self) -> OverlayMode {
        self.mode
    }
    pub fn click_through(&self) -> bool {
        self.click_through
    }
    pub fn viewports(&self) -> &BTreeMap<DisplayId, OverlayViewport> {
        &self.viewports
    }
    pub fn viewport(&self, id: &DisplayId) -> Option<&OverlayViewport> {
        self.viewports.get(id)
    }
    pub fn last_snapshot(&self) -> &DisplaySnapshot {
        &self.last_snapshot
    }

    pub fn reconcile(
        &mut self,
        snapshot: DisplaySnapshot,
    ) -> Result<RegistryChanges, RegistryError> {
        snapshot
            .validate()
            .map_err(|_| RegistryError::InvalidDisplayIdentity)?;
        let mut labels = BTreeSet::new();
        for id in snapshot.displays.keys() {
            if !labels.insert(generated_overlay_label(id)) {
                return Err(RegistryError::DuplicateNativeLabel);
            }
        }
        let mut changes = RegistryChanges::default();
        for id in self
            .viewports
            .keys()
            .filter(|id| !snapshot.displays.contains_key(*id))
            .cloned()
            .collect::<Vec<_>>()
        {
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
                    self.viewports.insert(
                        id.clone(),
                        OverlayViewport::new(descriptor.clone(), &self.scene_ref, label, self.mode),
                    );
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
            adapter
                .update_geometry(&viewport.descriptor)
                .map_err(|detail| RegistryError::NativeOperation {
                    display_id: id.clone(),
                    detail,
                })?;
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
            if let Err((display_id, detail)) =
                apply_native_viewports(&app, viewports, removed, mode).await
            {
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
            window
                .destroy()
                .map_err(|error| (id.clone(), error.to_string()))?;
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
                .inner_size(
                    viewport.descriptor.logical_size.width,
                    viewport.descriptor.logical_size.height,
                )
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
            window
                .hide()
                .map_err(|error| (viewport.id.clone(), error.to_string()))?;
        } else {
            window
                .show()
                .map_err(|error| (viewport.id.clone(), error.to_string()))?;
        }
        app.emit(
            "overlay-viewport-changed",
            DisplayViewport::from(&viewport.descriptor),
        )
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
            logical_size: DisplaySize {
                width: 1920.0,
                height: 1080.0,
            },
            scale_factor: scale,
            orientation: DisplayOrientation::Degrees0,
        }
    }

    fn snapshot(values: Vec<DisplayDescriptor>) -> DisplaySnapshot {
        DisplaySnapshot {
            displays: values
                .into_iter()
                .map(|value| (value.id.clone(), value))
                .collect(),
        }
    }

    #[test]
    fn registry_reconciles_add_remove_readd_and_updates_in_place() {
        let left = descriptor("left", -1920.0, 2.0);
        let main = descriptor("main", 0.0, 1.0);
        let mut registry = OverlayRegistry::new("webview-scene").unwrap();
        let changes = registry
            .reconcile(snapshot(vec![left.clone(), main.clone()]))
            .unwrap();
        assert_eq!(changes.added.len(), 2);
        assert_eq!(registry.viewports().len(), 2);
        let scene_refs = registry
            .viewports()
            .values()
            .map(|v| v.scene_ref.clone())
            .collect::<BTreeSet<_>>();
        assert_eq!(scene_refs, BTreeSet::from(["webview-scene".into()]));
        let mut rotated = main.clone();
        rotated.scale_factor = 1.5;
        let changes = registry
            .reconcile(snapshot(vec![left.clone(), rotated]))
            .unwrap();
        assert_eq!(changes.updated, vec![main.id.clone()]);
        assert_eq!(changes.added.len(), 0);
        let left_label = registry.viewport(&left.id).unwrap().label.clone();
        registry.reconcile(snapshot(vec![main.clone()])).unwrap();
        assert!(registry.viewport(&left.id).is_none());
        registry.reconcile(snapshot(vec![left])).unwrap();
        assert_eq!(
            registry
                .viewport(&DisplayId::new("left").unwrap())
                .unwrap()
                .label,
            left_label
        );
        assert_eq!(registry.scene_ref(), "webview-scene");
    }

    #[test]
    fn registry_applies_global_mode_and_pointer_state_to_every_viewport() {
        let mut registry = OverlayRegistry::new("webview-scene").unwrap();
        registry
            .reconcile(snapshot(vec![
                descriptor("left", -1920.0, 2.0),
                descriptor("main", 0.0, 1.0),
            ]))
            .unwrap();
        let mut adapters = BTreeMap::<DisplayId, TauriWindowAdapter>::new();
        registry
            .apply_mode_to_adapter(OverlayMode::VisibleClickThrough, &mut adapters)
            .unwrap();
        assert!(registry
            .viewports()
            .values()
            .all(|viewport| viewport.click_through && viewport.visible));
        assert!(adapters.values().all(|adapter| adapter.click_through));
        registry
            .apply_mode_to_adapter(OverlayMode::Hidden, &mut adapters)
            .unwrap();
        assert!(registry
            .viewports()
            .values()
            .all(|viewport| !viewport.visible));
        assert!(adapters.values().all(|adapter| !adapter.visible));
    }

    #[test]
    fn viewport_added_after_show_inherits_interactive_mode_for_bootstrap() {
        let mut registry = OverlayRegistry::new("webview-scene").unwrap();
        registry.apply_mode(OverlayMode::VisibleInteractive);
        registry
            .reconcile(snapshot(vec![descriptor("main", 0.0, 1.0)]))
            .unwrap();

        let viewport = registry.viewport(&DisplayId::new("main").unwrap()).unwrap();
        assert_eq!(viewport.mode, OverlayMode::VisibleInteractive);
        assert!(viewport.visible);
        assert!(!viewport.click_through);
    }

    #[test]
    fn scene_store_validates_and_retains_items_when_viewports_change() {
        let mut scene = SceneStore::default();
        scene
            .commit_scene_item(
                serde_json::json!({"id":"stroke-1","kind":"stroke","points":[{"x":1.0,"y":2.0}]}),
            )
            .unwrap();
        let before = scene.snapshot();
        assert!(scene
            .commit_scene_item(serde_json::json!({"id":"","kind":"stroke"}))
            .is_err());
        assert_eq!(scene.snapshot(), before);
        assert_eq!(
            scene
                .commit_scene_item(serde_json::json!({"id":"stroke-1","kind":"stroke"}))
                .unwrap(),
            before
        );
    }

    #[test]
    fn scene_store_accepts_typed_pen_and_highlighter_items_with_style_snapshots() {
        let mut scene = SceneStore::default();
        let pen = serde_json::json!({
            "id": "pen-1",
            "kind": "stroke",
            "tool": "pen",
            "points": [{"x": -10.0, "y": 20.0}, {"x": 30.0, "y": 40.0}],
            "style": {"color":"#ef4444","opacity":0.92,"width":2.0,"fill":"none","fillColor":"#ef4444","fillOpacity":0.18,"textSize":24.0}
        });
        let highlighter = serde_json::json!({
            "id": "highlighter-1",
            "kind": "stroke",
            "tool": "highlighter",
            "points": [{"x": -10.0, "y": 20.0}, {"x": 30.0, "y": 40.0}],
            "style": {"color":"#facc15","opacity":0.35,"width":12.0,"fill":"none","fillColor":"#facc15","fillOpacity":0.18,"textSize":24.0}
        });

        scene.commit_scene_item(pen).unwrap();
        let snapshot = scene.commit_scene_item(highlighter).unwrap();
        assert_eq!(snapshot.items.len(), 2);
        assert!(matches!(
            snapshot.items[0],
            SceneItem::Stroke {
                tool: StrokeTool::Pen,
                ..
            }
        ));
        assert!(matches!(
            snapshot.items[1],
            SceneItem::Stroke {
                tool: StrokeTool::Highlighter,
                ..
            }
        ));
    }

    #[test]
    fn scene_store_rejects_unknown_or_malformed_payload_without_mutation() {
        let mut scene = SceneStore::default();
        scene
            .commit_scene_item(
                serde_json::json!({"id":"stable","kind":"stroke","points":[{"x":1.0,"y":2.0}]}),
            )
            .unwrap();
        let before = scene.snapshot();

        for invalid in [
            serde_json::json!({"id":"bad","kind":"stroke","points":[{"x":1.0,"y":2.0}],"unexpected":true}),
            serde_json::json!({"id":"bad","kind":"stroke","points":[{"x":1.0,"y":2.0,"z":3.0}]}),
            serde_json::json!({"id":"bad","kind":"stroke","points":[{"x":1.0,"y":2.0}],"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0,"extra":true}}),
            serde_json::json!({"id":"bad","kind":"stroke","points":[{"x":1_000_001.0,"y":2.0}]}),
            serde_json::json!({"id":"bad","kind":"stroke","points":[{"x":1.0,"y":2.0},{"x":3.0,"y":4.0}],"style":{"color":"#fff","opacity":2.0,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
            serde_json::json!({"id":"bad","kind":"shape","tool":"line","geometry":{"type":"rectangle","x":0.0,"y":0.0,"width":2.0,"height":2.0},"style": {"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
        ] {
            assert!(scene.commit_scene_item(invalid).is_err());
            assert_eq!(scene.snapshot(), before);
        }
    }

    #[test]
    fn scene_store_accepts_line_and_arrow_geometry_with_style_snapshots() {
        let mut scene = SceneStore::default();
        let line = serde_json::json!({
            "id": "line-1",
            "kind": "shape",
            "tool": "line",
            "geometry": {"type":"line","start":{"x":-100.0,"y":20.0},"end":{"x":300.0,"y":40.0}},
            "style": {"color":"#2563eb","opacity":0.8,"width":2.0,"fill":"none","fillColor":"#2563eb","fillOpacity":0.18,"textSize":24.0}
        });
        let arrow = serde_json::json!({
            "id": "arrow-1",
            "kind": "shape",
            "tool": "arrow",
            "geometry": {"type":"line","start":{"x":300.0,"y":40.0},"end":{"x":600.0,"y":80.0}},
            "style": {"color":"#16a34a","opacity":0.75,"width":3.0,"fill":"none","fillColor":"#16a34a","fillOpacity":0.18,"textSize":24.0}
        });

        scene.commit_scene_item(line).unwrap();
        let snapshot = scene.commit_scene_item(arrow).unwrap();
        assert_eq!(snapshot.items.len(), 2);
        assert!(matches!(snapshot.items[0], SceneItem::Shape { tool: ShapeTool::Line, geometry: SceneGeometry::Line { .. }, .. }));
        assert!(matches!(snapshot.items[1], SceneItem::Shape { tool: ShapeTool::Arrow, geometry: SceneGeometry::Line { .. }, .. }));
    }

    #[test]
    fn scene_store_rejects_invalid_line_geometry_without_mutation_and_deduplicates_ids() {
        let mut scene = SceneStore::default();
        let valid = serde_json::json!({
            "id": "line-1",
            "kind": "shape",
            "tool": "line",
            "geometry": {"type":"line","start":{"x":0.0,"y":0.0},"end":{"x":10.0,"y":0.0}},
            "style": {"color":"#2563eb","opacity":0.8,"width":2.0,"fill":"none","fillColor":"#2563eb","fillOpacity":0.18,"textSize":24.0}
        });
        scene.commit_scene_item(valid.clone()).unwrap();
        let before = scene.snapshot();
        for invalid in [
            serde_json::json!({"id":"bad","kind":"shape","tool":"arrow","geometry":{"type":"line","start":{"x":0.0,"y":0.0},"end":{"x":0.0,"y":0.0}},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
            serde_json::json!({"id":"bad","kind":"shape","tool":"line","geometry":{"type":"rectangle","x":0.0,"y":0.0,"width":2.0,"height":2.0},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
            serde_json::json!({"id":"bad","kind":"shape","tool":"arrow","geometry":{"type":"line","start":{"x":0.0,"y":0.0},"end":{"x":1000001.0,"y":0.0}},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
        ] {
            assert!(scene.commit_scene_item(invalid).is_err());
            assert_eq!(scene.snapshot(), before);
        }
        assert_eq!(scene.commit_scene_item(valid).unwrap(), before);
    }

    #[test]
    fn scene_store_accepts_independent_rectangle_and_ellipse_styles() {
        let mut scene = SceneStore::default();
        let rectangle = serde_json::json!({
            "id": "rectangle-1",
            "kind": "shape",
            "tool": "rectangle",
            "geometry": {"type":"rectangle","x":-200.0,"y":40.0,"width":500.0,"height":300.0},
            "style": {"color":"#1d4ed8","opacity":0.8,"width":2.0,"fill":"solid","fillColor":"#bfdbfe","fillOpacity":0.4,"textSize":24.0}
        });
        let ellipse = serde_json::json!({
            "id": "ellipse-1",
            "kind": "shape",
            "tool": "ellipse",
            "geometry": {"type":"ellipse","center":{"x":600.0,"y":300.0},"radiusX":120.0,"radiusY":80.0},
            "style": {"color":"#15803d","opacity":0.6,"width":3.0,"fill":"solid","fillColor":"#bbf7d0","fillOpacity":0.15,"textSize":24.0}
        });

        scene.commit_scene_item(rectangle).unwrap();
        let snapshot = scene.commit_scene_item(ellipse).unwrap();
        assert_eq!(snapshot.items.len(), 2);
        assert!(matches!(snapshot.items[0], SceneItem::Shape { tool: ShapeTool::Rectangle, geometry: SceneGeometry::Rectangle { width: 500.0, height: 300.0, .. }, .. }));
        assert!(matches!(snapshot.items[1], SceneItem::Shape { tool: ShapeTool::Ellipse, geometry: SceneGeometry::Ellipse { radius_x: 120.0, radius_y: 80.0, .. }, .. }));
        if let SceneItem::Shape { style: first, .. } = &snapshot.items[0] {
            if let SceneItem::Shape { style: second, .. } = &snapshot.items[1] {
                assert_ne!(first.fill_color, second.fill_color);
                assert_ne!(first.fill_opacity, second.fill_opacity);
            }
        }
    }

    #[test]
    fn scene_store_rejects_invalid_shape_bounds_or_style_without_mutation() {
        let mut scene = SceneStore::default();
        scene
            .commit_scene_item(serde_json::json!({
                "id":"stable-shape","kind":"shape","tool":"rectangle",
                "geometry":{"type":"rectangle","x":0.0,"y":0.0,"width":20.0,"height":20.0},
                "style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}
            }))
            .unwrap();
        let before = scene.snapshot();
        for invalid in [
            serde_json::json!({"id":"bad","kind":"shape","tool":"rectangle","geometry":{"type":"rectangle","x":0.0,"y":0.0,"width":0.0,"height":20.0},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
            serde_json::json!({"id":"bad","kind":"shape","tool":"ellipse","geometry":{"type":"ellipse","center":{"x":0.0,"y":0.0},"radiusX":10.0,"radiusY":0.0},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
            serde_json::json!({"id":"bad","kind":"shape","tool":"rectangle","geometry":{"type":"rectangle","x":0.0,"y":0.0,"width":20.0,"height":20.0},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"solid","fillColor":"#fff","fillOpacity":1.5,"textSize":24.0}}),
            serde_json::json!({"id":"bad","kind":"shape","tool":"ellipse","geometry":{"type":"ellipse","center":{"x":0.0,"y":0.0},"radiusX":10.0,"radiusY":10.0,"extra":true},"style":{"color":"#fff","opacity":0.9,"width":2.0,"fill":"none","fillColor":"#fff","fillOpacity":0.18,"textSize":24.0}}),
        ] {
            assert!(scene.commit_scene_item(invalid).is_err());
            assert_eq!(scene.snapshot(), before);
        }
    }

    #[test]
    fn scene_store_erases_exactly_one_item_and_preserves_unrelated_items() {
        let mut scene = SceneStore::with_id("stable-scene").unwrap();
        let style = serde_json::json!({"color":"#334155","opacity":0.92,"width":2.0,"fill":"none","fillColor":"#334155","fillOpacity":0.18,"textSize":24.0});
        scene
            .commit_scene_item(serde_json::json!({
                "id":"stroke-1","kind":"stroke","tool":"pen",
                "points":[{"x":10.0,"y":10.0},{"x":50.0,"y":10.0}],"style":style.clone()
            }))
            .unwrap();
        scene
            .commit_scene_item(serde_json::json!({
                "id":"text-1","kind":"text","tool":"text",
                "anchor":{"x":100.0,"y":100.0},"text":"label","style":style.clone()
            }))
            .unwrap();

        let before_invalid = scene.snapshot();
        assert!(scene
            .commit_scene_item(serde_json::json!({
                "id":"too-many-lines","kind":"text","tool":"text",
                "anchor":{"x":100.0,"y":100.0},"text":format!("{}x", "\n".repeat(256)),"style":style
            }))
            .is_err());
        assert_eq!(scene.snapshot(), before_invalid);

        let erased = scene.erase_scene_item("stroke-1").unwrap();
        assert_eq!(erased.scene_id, "stable-scene");
        assert_eq!(erased.items.len(), 1);
        assert!(matches!(erased.items[0], SceneItem::Text { ref id, ref text, .. } if id == "text-1" && text == "label"));

        let no_op = scene.erase_scene_item("missing").unwrap();
        assert_eq!(no_op, erased);
        assert!(scene.erase_scene_item("").is_err());
        assert!(scene.erase_scene_item(&"x".repeat(257)).is_err());
    }
}

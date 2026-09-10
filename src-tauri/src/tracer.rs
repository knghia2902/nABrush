use crate::controller::{DisplayGeometry, LifecycleSnapshot, OverlayMode};

#[derive(Debug)]
pub struct LifecycleTracer {
    snapshot: LifecycleSnapshot,
}

impl LifecycleTracer {
    pub fn new() -> Self {
        Self { snapshot: LifecycleSnapshot { mode: OverlayMode::Hidden, surface_id: 1, geometry: None, scene_ref: "webview-scene".into(), click_through: false } }
    }
    pub fn show(&mut self, geometry: DisplayGeometry) {
        self.snapshot.mode = OverlayMode::VisibleInteractive;
        self.snapshot.geometry = Some(geometry);
    }
    pub fn hide(&mut self) {
        self.snapshot.mode = OverlayMode::Hidden;
    }
    pub fn snapshot(&self) -> &LifecycleSnapshot { &self.snapshot }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn geometry() -> DisplayGeometry { DisplayGeometry { x: -1280.0, y: 0.0, width: 1920.0, height: 1080.0, scale_factor: 2.0 } }

    #[test]
    fn initial_state_is_hidden() { assert_eq!(LifecycleTracer::new().snapshot().mode, OverlayMode::Hidden); }
    #[test]
    fn show_reuses_one_surface_and_enters_interactive_mode() {
        let mut tracer = LifecycleTracer::new();
        tracer.show(geometry());
        assert_eq!(tracer.snapshot().mode, OverlayMode::VisibleInteractive);
        assert_eq!(tracer.snapshot().surface_id, 1);
    }
    #[test]
    fn hide_is_idempotent_and_preserves_surface() {
        let mut tracer = LifecycleTracer::new(); tracer.show(geometry()); tracer.hide(); tracer.hide();
        assert_eq!(tracer.snapshot().mode, OverlayMode::Hidden); assert_eq!(tracer.snapshot().surface_id, 1);
    }
    #[test]
    fn geometry_carries_scale_converted_primary_bounds() {
        let mut tracer = LifecycleTracer::new(); tracer.show(geometry());
        let value = tracer.snapshot().geometry.unwrap();
        assert_eq!(value.x, -1280.0); assert_eq!(value.width, 1920.0); assert_eq!(value.scale_factor, 2.0);
    }
}

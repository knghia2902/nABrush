use crate::controller::{LifecycleSnapshot, OverlayMode};
use crate::display::{
    DisplayDescriptor, DisplayId, DisplayOrientation, DisplayPoint, DisplaySize, DisplaySnapshot,
    DisplayViewport,
};

#[derive(Debug)]
pub struct LifecycleTracer {
    snapshot: LifecycleSnapshot,
}

impl LifecycleTracer {
    pub fn new() -> Self {
        Self {
            snapshot: LifecycleSnapshot {
                mode: OverlayMode::Hidden,
                surface_id: 1,
                display_snapshot: None,
                viewport: None,
                scene_ref: "webview-scene".into(),
                click_through: false,
            },
        }
    }
    pub fn show(&mut self, descriptor: DisplayDescriptor) {
        self.snapshot.mode = OverlayMode::VisibleInteractive;
        let snapshot =
            DisplaySnapshot::one(descriptor).expect("test display descriptor must validate");
        self.snapshot.viewport = snapshot.displays.values().next().map(DisplayViewport::from);
        self.snapshot.display_snapshot = Some(snapshot);
    }

    pub fn show_snapshot(&mut self, snapshot: DisplaySnapshot) {
        self.snapshot.mode = OverlayMode::VisibleInteractive;
        self.snapshot.viewport = snapshot.displays.values().next().map(DisplayViewport::from);
        self.snapshot.display_snapshot = Some(snapshot);
    }

    pub fn remove_display(&mut self, id: &DisplayId) {
        if let Some(snapshot) = self.snapshot.display_snapshot.as_mut() {
            snapshot.displays.remove(id);
            self.snapshot.viewport = snapshot.displays.values().next().map(DisplayViewport::from);
        }
    }
    pub fn hide(&mut self) {
        self.snapshot.mode = OverlayMode::Hidden;
    }
    pub fn snapshot(&self) -> &LifecycleSnapshot {
        &self.snapshot
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn descriptor(
        id: &str,
        x: f64,
        y: f64,
        scale: f64,
        orientation: DisplayOrientation,
    ) -> DisplayDescriptor {
        DisplayDescriptor {
            id: DisplayId::new(id).unwrap(),
            origin: DisplayPoint { x, y },
            logical_size: DisplaySize {
                width: 1920.0,
                height: 1080.0,
            },
            scale_factor: scale,
            orientation,
        }
    }

    #[test]
    fn initial_state_is_hidden() {
        assert_eq!(LifecycleTracer::new().snapshot().mode, OverlayMode::Hidden);
    }
    #[test]
    fn show_reuses_one_surface_and_enters_interactive_mode() {
        let mut tracer = LifecycleTracer::new();
        tracer.show(descriptor(
            "left",
            -1280.0,
            0.0,
            2.0,
            DisplayOrientation::Degrees0,
        ));
        assert_eq!(tracer.snapshot().mode, OverlayMode::VisibleInteractive);
        assert_eq!(tracer.snapshot().surface_id, 1);
    }
    #[test]
    fn hide_is_idempotent_and_preserves_surface() {
        let mut tracer = LifecycleTracer::new();
        tracer.show(descriptor(
            "left",
            -1280.0,
            0.0,
            2.0,
            DisplayOrientation::Degrees0,
        ));
        tracer.hide();
        tracer.hide();
        assert_eq!(tracer.snapshot().mode, OverlayMode::Hidden);
        assert_eq!(tracer.snapshot().surface_id, 1);
        assert_eq!(tracer.snapshot().scene_ref, "webview-scene");
    }
    #[test]
    fn geometry_carries_scale_converted_primary_bounds() {
        let mut tracer = LifecycleTracer::new();
        tracer.show(descriptor(
            "rotated",
            -1920.0,
            -900.0,
            1.5,
            DisplayOrientation::Degrees90,
        ));
        let value = tracer.snapshot().viewport.as_ref().unwrap();
        assert_eq!(value.origin.x, -1920.0);
        assert_eq!(value.origin.y, -900.0);
        assert_eq!(value.scale_factor, 1.5);
        assert_eq!(value.orientation, DisplayOrientation::Degrees90);
    }

    #[test]
    fn removing_and_readding_display_changes_membership_only() {
        let left = descriptor("left", -1920.0, 0.0, 2.0, DisplayOrientation::Degrees0);
        let main = descriptor("main", 0.0, 0.0, 1.0, DisplayOrientation::Degrees0);
        let mut displays = std::collections::BTreeMap::new();
        displays.insert(left.id.clone(), left.clone());
        displays.insert(main.id.clone(), main.clone());
        let mut tracer = LifecycleTracer::new();
        tracer.show_snapshot(DisplaySnapshot { displays });
        let scene = tracer.snapshot().scene_ref.clone();
        tracer.remove_display(&left.id);
        assert_eq!(tracer.snapshot().scene_ref, scene);
        assert_eq!(
            tracer
                .snapshot()
                .display_snapshot
                .as_ref()
                .unwrap()
                .displays
                .len(),
            1
        );
        tracer.show(left.clone());
        assert_eq!(tracer.snapshot().scene_ref, scene);
        assert_eq!(tracer.snapshot().viewport.as_ref().unwrap().id, left.id);
    }
}

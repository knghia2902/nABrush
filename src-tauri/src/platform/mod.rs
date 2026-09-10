#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "windows")]
pub mod windows;

use crate::display::DisplayDescriptor;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointerIntent { Capture, PassThrough }

pub trait PlatformWindowAdapter {
    fn show_interactive(&mut self);
    fn hide(&mut self);
    fn set_click_through(&mut self, enabled: bool);
    fn pointer_intent(&self) -> PointerIntent;
    fn retry(&mut self);

    /// Apply display geometry without rebuilding the native surface.
    ///
    /// Platform implementations may translate this into a native set-frame
    /// operation. The default keeps the pure lifecycle adapter backwards
    /// compatible while the registry owns the topology decision.
    fn update_geometry(&mut self, _descriptor: &DisplayDescriptor) -> Result<(), String> {
        Ok(())
    }

    /// Mark that a native display notification should be reconciled on the
    /// app runtime boundary rather than synchronously in the OS callback.
    fn schedule_topology_reconcile(&mut self) {}
}

#[derive(Debug, Default)]
pub struct TauriWindowAdapter {
    pub visible: bool,
    pub click_through: bool,
    pub retry_count: u32,
    pub geometry: Option<DisplayDescriptor>,
    pub topology_reconcile_scheduled: bool,
}

impl PlatformWindowAdapter for TauriWindowAdapter {
    fn show_interactive(&mut self) {
        self.visible = true;
        self.click_through = false;
    }
    fn hide(&mut self) {
        self.visible = false;
    }
    fn set_click_through(&mut self, enabled: bool) {
        self.click_through = enabled;
    }
    fn pointer_intent(&self) -> PointerIntent {
        if self.click_through { PointerIntent::PassThrough } else { PointerIntent::Capture }
    }
    fn retry(&mut self) { self.retry_count += 1; }

    fn update_geometry(&mut self, descriptor: &DisplayDescriptor) -> Result<(), String> {
        self.geometry = Some(descriptor.clone());
        Ok(())
    }

    fn schedule_topology_reconcile(&mut self) {
        self.topology_reconcile_scheduled = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn adapter_switches_pointer_intent_without_recreating_surface() {
        let mut adapter = TauriWindowAdapter::default();
        adapter.show_interactive();
        assert_eq!(adapter.pointer_intent(), PointerIntent::Capture);
        adapter.set_click_through(true);
        assert_eq!(adapter.pointer_intent(), PointerIntent::PassThrough);
        adapter.set_click_through(false);
        assert_eq!(adapter.pointer_intent(), PointerIntent::Capture);
        assert_eq!(adapter.retry_count, 0);
    }

    #[test]
    fn adapter_accepts_in_place_geometry_and_defers_topology_work() {
        let mut adapter = TauriWindowAdapter::default();
        let descriptor = DisplayDescriptor {
            id: crate::display::DisplayId::new("display-a").unwrap(),
            origin: crate::display::DisplayPoint { x: -100.0, y: 0.0 },
            logical_size: crate::display::DisplaySize { width: 100.0, height: 100.0 },
            scale_factor: 2.0,
            orientation: crate::display::DisplayOrientation::Degrees90,
        };
        adapter.update_geometry(&descriptor).unwrap();
        adapter.schedule_topology_reconcile();
        assert_eq!(adapter.geometry, Some(descriptor));
        assert!(adapter.topology_reconcile_scheduled);
    }
}

#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "windows")]
pub mod windows;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointerIntent { Capture, PassThrough }

pub trait PlatformWindowAdapter {
    fn show_interactive(&mut self);
    fn hide(&mut self);
    fn set_click_through(&mut self, enabled: bool);
    fn pointer_intent(&self) -> PointerIntent;
    fn retry(&mut self);
}

#[derive(Debug, Default)]
pub struct TauriWindowAdapter {
    pub visible: bool,
    pub click_through: bool,
    pub retry_count: u32,
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
}

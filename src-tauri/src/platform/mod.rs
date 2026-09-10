pub trait PlatformWindowAdapter {
    fn show_interactive(&mut self);
    fn hide(&mut self);
    fn set_click_through(&mut self, enabled: bool);
}

#[derive(Debug, Default)]
pub struct TauriWindowAdapter {
    pub visible: bool,
    pub click_through: bool,
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
}

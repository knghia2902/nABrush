//! Windows hit-testing policy for the existing layered tool window.
//! The native implementation keeps WS_EX_LAYERED, WS_EX_TOOLWINDOW and
//! WS_EX_NOACTIVATE, returning HTTRANSPARENT while click-through is enabled.

use super::{schedule_reconcile, FullScreenCapability, PlatformError, TopologySignal};
use tauri::{AppHandle, Runtime};

/// Win32 display notifications that require a fresh virtual-monitor snapshot.
pub const WM_DISPLAYCHANGE: u32 = 0x007E;
pub const WM_DPICHANGED: u32 = 0x02E0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WindowsWindowPolicy {
    pub layered: bool,
    pub topmost: bool,
    pub transparent_hit_test: bool,
}

pub const fn window_policy() -> WindowsWindowPolicy {
    WindowsWindowPolicy {
        layered: true,
        topmost: true,
        transparent_hit_test: true,
    }
}

pub const fn full_screen_capability() -> FullScreenCapability {
    FullScreenCapability::Limited
}

pub fn message_signal(message: u32) -> Option<TopologySignal> {
    match message {
        WM_DISPLAYCHANGE => Some(TopologySignal::DisplayChanged),
        WM_DPICHANGED => Some(TopologySignal::DpiChanged),
        _ => None,
    }
}

/// Native window-procedure integration calls this after receiving a display
/// or per-monitor-DPI message. No WebView is created or destroyed here.
pub fn on_display_message<R: Runtime>(app: &AppHandle<R>, message: u32) -> bool {
    let Some(signal) = message_signal(message) else {
        return false;
    };
    schedule_reconcile(app, signal);
    true
}

pub fn install_observer<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    // The message hook is attached to each native overlay window by the
    // Windows runner. Trigger the initial snapshot through the same path.
    schedule_reconcile(app, TopologySignal::DisplayChanged);
    Ok(())
}

pub fn classify_full_screen_failure(detail: impl Into<String>) -> PlatformError {
    PlatformError::FullScreenBlocked(detail.into())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowsHitTest { Capture, HtTransparent }

pub fn hit_test_policy(click_through: bool) -> WindowsHitTest {
    if click_through { WindowsHitTest::HtTransparent } else { WindowsHitTest::Capture }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn transparent_hit_test_policy_is_explicit() {
        assert_eq!(hit_test_policy(false), WindowsHitTest::Capture);
        assert_eq!(hit_test_policy(true), WindowsHitTest::HtTransparent);
    }

    #[test]
    fn display_and_dpi_messages_share_one_deferred_refresh_contract() {
        assert_eq!(
            message_signal(WM_DISPLAYCHANGE),
            Some(TopologySignal::DisplayChanged)
        );
        assert_eq!(
            message_signal(WM_DPICHANGED),
            Some(TopologySignal::DpiChanged)
        );
        assert_eq!(message_signal(0), None);
        assert!(window_policy().layered && window_policy().topmost);
        assert_eq!(full_screen_capability(), FullScreenCapability::Limited);
        assert!(matches!(
            classify_full_screen_failure("exclusive"),
            PlatformError::FullScreenBlocked(_)
        ));
    }
}

//! macOS hit-testing policy for the existing transparent NSWindow.
//! The production adapter maps `click_through` to NSWindow.ignoresMouseEvents
//! and keeps fullScreenAuxiliary/canJoinAllApplications collection behavior.

use super::{schedule_reconcile, FullScreenCapability, PlatformError, TopologySignal};
use tauri::{AppHandle, Runtime};

/// AppKit posts this notification after displays are added, removed, resized,
/// rotated, or have their backing scale changed. The notification itself is
/// intentionally payload-free; the callback rereads the current screen set.
pub const SCREEN_PARAMETERS_NOTIFICATION: &str =
    "NSApplication.didChangeScreenParametersNotification";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MacCollectionPolicy {
    pub full_screen_auxiliary: bool,
    pub can_join_all_applications: bool,
}

pub const fn collection_policy() -> MacCollectionPolicy {
    MacCollectionPolicy {
        full_screen_auxiliary: true,
        can_join_all_applications: true,
    }
}

pub const fn full_screen_capability() -> FullScreenCapability {
    FullScreenCapability::Limited
}

pub fn notification_signal(name: &str) -> Option<TopologySignal> {
    (name == SCREEN_PARAMETERS_NOTIFICATION).then_some(TopologySignal::ScreenParametersChanged)
}

/// Native AppKit integration calls this from the notification observer. It
/// schedules work and returns without creating or destroying any WebView.
pub fn on_screen_parameters_changed<R: Runtime>(app: &AppHandle<R>) {
    schedule_reconcile(app, TopologySignal::ScreenParametersChanged);
}

/// The actual observer is target-gated in the native runner. The controller
/// owns the initial snapshot when the overlay is shown, so setup does not
/// create dynamic WebViews before the bootstrap window is ready.
pub fn install_observer<R: Runtime>(_app: &AppHandle<R>) -> tauri::Result<()> {
    Ok(())
}

pub fn classify_full_screen_failure(detail: impl Into<String>) -> PlatformError {
    PlatformError::FullScreenBlocked(detail.into())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MacHitTest { Capture, PassThrough }

pub fn hit_test_policy(click_through: bool) -> MacHitTest {
    // NSWindow.ignoresMouseEvents(true) is the pass-through state.
    if click_through { MacHitTest::PassThrough } else { MacHitTest::Capture }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ignores_mouse_events_policy_is_explicit() {
        assert_eq!(hit_test_policy(false), MacHitTest::Capture);
        assert_eq!(hit_test_policy(true), MacHitTest::PassThrough);
    }

    #[test]
    fn appkit_notification_maps_to_one_deferred_refresh() {
        assert_eq!(
            notification_signal(SCREEN_PARAMETERS_NOTIFICATION),
            Some(TopologySignal::ScreenParametersChanged)
        );
        assert_eq!(notification_signal("other"), None);
        assert!(collection_policy().full_screen_auxiliary);
        assert_eq!(full_screen_capability(), FullScreenCapability::Limited);
        assert!(matches!(
            classify_full_screen_failure("exclusive"),
            PlatformError::FullScreenBlocked(_)
        ));
    }
}

#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "windows")]
pub mod windows;

use crate::display::DisplayDescriptor;
use crate::errors::{display_permission_error, full_screen_blocked_error};
use std::fmt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PointerIntent {
    Capture,
    PassThrough,
}

/// The small, platform-neutral event vocabulary used by native display
/// observers. Native callbacks only publish one of these signals; snapshot
/// enumeration and WebView work happen later on the runtime boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TopologySignal {
    ScreenParametersChanged,
    DisplayChanged,
    DpiChanged,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FullScreenCapability {
    Supported,
    Limited,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlatformError {
    TopologyRefresh(String),
    PermissionDenied(String),
    FullScreenBlocked(String),
}

impl fmt::Display for PlatformError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TopologyRefresh(detail) => write!(f, "topology refresh failed: {detail}"),
            Self::PermissionDenied(detail) => write!(f, "display permission denied: {detail}"),
            Self::FullScreenBlocked(detail) => {
                write!(f, "full-screen compositor blocked overlay: {detail}")
            }
        }
    }
}

impl std::error::Error for PlatformError {}

impl PlatformError {
    pub fn error_state(&self) -> crate::errors::ErrorState {
        match self {
            Self::PermissionDenied(detail) => display_permission_error(Some(detail)),
            Self::FullScreenBlocked(detail) => full_screen_blocked_error(Some(detail)),
            Self::TopologyRefresh(detail) => {
                crate::errors::display_topology_error("unknown", detail)
            }
        }
    }
}

/// One bounded refresh task may be outstanding at a time. This is shared by
/// both native observers so a burst of screen/DPI notifications ends in one
/// authoritative monitor snapshot and one registry reconciliation.
#[derive(Debug, Default)]
pub struct TopologyRefreshState {
    scheduled: AtomicBool,
}

impl TopologyRefreshState {
    fn claim(&self) -> bool {
        self.scheduled
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }

    fn release(&self) {
        self.scheduled.store(false, Ordering::Release);
    }

    #[cfg(test)]
    fn is_scheduled(&self) -> bool {
        self.scheduled.load(Ordering::Acquire)
    }
}

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

    /// Record the native signal without touching windows from the callback.
    fn refresh_topology(&mut self, _signal: TopologySignal) -> Result<(), PlatformError> {
        Ok(())
    }

    /// Mark that a native display notification should be reconciled on the
    /// app runtime boundary rather than synchronously in the OS callback.
    fn schedule_reconcile(&mut self) {}

    /// Report the target-specific full-screen boundary. `always_on_top` is
    /// never treated as proof that exclusive full-screen is supported.
    fn full_screen_capability(&self) -> FullScreenCapability {
        FullScreenCapability::Limited
    }

    #[allow(dead_code)]
    fn schedule_topology_reconcile(&mut self) {
        self.schedule_reconcile();
    }
}

#[derive(Debug, Default)]
pub struct TauriWindowAdapter {
    pub visible: bool,
    pub click_through: bool,
    pub retry_count: u32,
    pub geometry: Option<DisplayDescriptor>,
    pub topology_reconcile_scheduled: bool,
    pub last_topology_signal: Option<TopologySignal>,
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
        if self.click_through {
            PointerIntent::PassThrough
        } else {
            PointerIntent::Capture
        }
    }
    fn retry(&mut self) { self.retry_count += 1; }

    fn update_geometry(&mut self, descriptor: &DisplayDescriptor) -> Result<(), String> {
        self.geometry = Some(descriptor.clone());
        Ok(())
    }

    fn schedule_topology_reconcile(&mut self) {
        self.topology_reconcile_scheduled = true;
    }

    fn refresh_topology(&mut self, signal: TopologySignal) -> Result<(), PlatformError> {
        self.last_topology_signal = Some(signal);
        Ok(())
    }

    fn schedule_reconcile(&mut self) {
        self.topology_reconcile_scheduled = true;
    }

    fn full_screen_capability(&self) -> FullScreenCapability {
        FullScreenCapability::Limited
    }
}

/// Schedule the final display snapshot asynchronously. Native callbacks must
/// call this function and return; `OverlayRegistry::reconcile_native_async`
/// owns dynamic WebView creation and destruction after the debounce interval.
pub fn schedule_reconcile<R: Runtime>(app: &AppHandle<R>, _signal: TopologySignal) {
    let scheduler = app.state::<TopologyRefreshState>();
    if !scheduler.claim() {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(Duration::from_millis(50));
        let scheduler = app.state::<TopologyRefreshState>();
        let result = crate::controller::display_snapshot(&app).and_then(|snapshot| {
            let state = app.state::<std::sync::Mutex<crate::overlay_registry::OverlayRegistry>>();
            let result = state
                .lock()
                .map_err(|_| {
                    tauri::Error::Anyhow(std::io::Error::other("registry mutex poisoned").into())
                })?
                .reconcile_native_async(&app, snapshot)
                .map(|_| ())
                .map_err(|error| tauri::Error::Anyhow(error.into()));
            result
        });
        scheduler.release();
        if let Err(error) = result {
            let typed = PlatformError::TopologyRefresh(error.to_string());
            let store = app.state::<crate::errors::ErrorStore>();
            if let Err(publish_error) = store.publish(&app, Some(typed.error_state())) {
                eprintln!("nABrush could not publish topology refresh error: {publish_error}");
            }
        }
    });
}

/// Install target observer hooks. The first authoritative snapshot is taken by
/// the controller when `Show` is dispatched; later native notifications use
/// the deferred scheduler below. Avoiding a setup-time WebView reconciliation
/// keeps the bootstrap windows alive while Tauri finishes initialization.
pub fn install_observers<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    macos::install_observer(app)?;
    #[cfg(target_os = "windows")]
    windows::install_observer(app)?;
    Ok(())
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

    #[test]
    fn adapter_maps_native_signal_and_reports_limited_exclusive_full_screen() {
        let mut adapter = TauriWindowAdapter::default();
        adapter
            .refresh_topology(TopologySignal::DpiChanged)
            .unwrap();
        adapter.schedule_reconcile();
        assert_eq!(
            adapter.last_topology_signal,
            Some(TopologySignal::DpiChanged)
        );
        assert!(adapter.topology_reconcile_scheduled);
        assert_eq!(
            adapter.full_screen_capability(),
            FullScreenCapability::Limited
        );
    }

    #[test]
    fn refresh_scheduler_claims_once_until_release() {
        let state = TopologyRefreshState::default();
        assert!(state.claim());
        assert!(state.is_scheduled());
        assert!(!state.claim());
        state.release();
        assert!(state.claim());
    }
}

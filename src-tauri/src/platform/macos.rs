//! macOS hit-testing policy for the existing transparent NSWindow.
//! The production adapter maps `click_through` to NSWindow.ignoresMouseEvents
//! and keeps fullScreenAuxiliary/canJoinAllApplications collection behavior.

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
}

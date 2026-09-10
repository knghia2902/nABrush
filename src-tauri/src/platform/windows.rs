//! Windows hit-testing policy for the existing layered tool window.
//! The native implementation keeps WS_EX_LAYERED, WS_EX_TOOLWINDOW and
//! WS_EX_NOACTIVATE, returning HTTRANSPARENT while click-through is enabled.

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
}

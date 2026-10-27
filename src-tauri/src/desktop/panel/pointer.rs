//! The mouse buttons, read globally (not through a window).

/// Whether the left, right or middle button is down anywhere on screen.
#[cfg(windows)]
pub fn buttons_held() -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_LBUTTON, VK_MBUTTON, VK_RBUTTON,
    };
    [VK_LBUTTON, VK_RBUTTON, VK_MBUTTON]
        .iter()
        // SAFETY: a plain query of the key state.
        .any(|key| unsafe { GetAsyncKeyState(i32::from(key.0)) } < 0)
}

#[cfg(not(windows))]
pub fn buttons_held() -> bool {
    false
}

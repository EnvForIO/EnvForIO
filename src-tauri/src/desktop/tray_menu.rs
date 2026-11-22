//! The tray's right-click menu, drawn as a small EnvForIO window so it looks
//! like the app (Windows 11 style, light and dark) instead of the system's
//! plain Win32 popup. The page is `src/windows/tray-menu`.
//!
//! The window is made hidden at startup. A right click on the tray icon
//! remembers where the cursor was and shows the menu with its bottom-right
//! corner there, kept inside the monitor's work area (the rule and its
//! tests are in `domain/menu_position.rs`). The page reports its height through `fit`, which resizes the window and
//! places it again; losing focus hides it, like a native menu.
//!
//! NOTE: Linux keeps the native menu (see tray.rs): its tray sends no click
//! events, so this window could never open there.

use std::sync::Mutex;

use crate::domain::menu_position::{menu_origin, Rect};

use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, Runtime, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};

pub const LABEL: &str = "tray-menu";
/// Sent to the page each time the menu opens, so it refetches its rows.
pub const OPENED_EVENT: &str = "tray-menu-opened";

const WIDTH: f64 = 280.0; // logical px, including the page's shadow margin
const START_HEIGHT: f64 = 240.0; // replaced by the page's own height on first render

/// Where the cursor was at the last right click, in physical px.
static ANCHOR: Mutex<Option<PhysicalPosition<f64>>> = Mutex::new(None);

pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(
        app,
        LABEL,
        WebviewUrl::App("index.html?window=tray-menu".into()),
    )
    .title("EnvForIO")
    .inner_size(WIDTH, START_HEIGHT)
    .decorations(false)
    .transparent(true)
    .shadow(false) // the page draws its own; a native one would outline the transparent margin
    .resizable(false)
    .skip_taskbar(true)
    .always_on_top(true)
    .visible(false)
    .focused(false)
    .build()?;

    let menu = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            let _ = menu.hide();
        }
    });
    Ok(())
}

/// Show the menu at `at`, the cursor's position on the tray icon.
pub fn open<R: Runtime>(app: &AppHandle<R>, at: PhysicalPosition<f64>) {
    *ANCHOR.lock().unwrap() = Some(at);
    let Some(window) = app.get_webview_window(LABEL) else {
        log::warn!("Tray menu window is missing");
        return;
    };
    place(&window);
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit_to(LABEL, OPENED_EVENT, ());
}

/// Resize the menu to the page's height and keep it anchored at the cursor.
pub fn fit<R: Runtime>(window: &WebviewWindow<R>, height: f64) {
    let _ = window.set_size(LogicalSize::new(WIDTH, height.clamp(40.0, 800.0)));
    place(window);
}

fn place<R: Runtime>(window: &WebviewWindow<R>) {
    let Some(at) = *ANCHOR.lock().unwrap() else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };
    let app = window.app_handle();
    let monitor = app
        .monitor_from_point(at.x, at.y)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten());
    let Some(monitor) = monitor else {
        return;
    };
    let area = monitor.work_area();
    let (x, y) = menu_origin(
        (at.x.round() as i32, at.y.round() as i32),
        size.width as i32,
        size.height as i32,
        Rect {
            x: area.position.x,
            y: area.position.y,
            width: area.size.width as i32,
            height: area.size.height as i32,
        },
    );
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

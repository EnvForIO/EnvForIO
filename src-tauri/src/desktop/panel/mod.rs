//! The monitor panel: a borderless window along a screen edge that slides
//! out when the pointer pushes into that edge (`edge.rs`, Windows) or the
//! shortcut is pressed (`shortcut.rs`), and slides back once the pointer
//! has left it. The slide itself is CSS in the panel; Rust places the
//! window, shows it without taking focus, tells the page to slide, and
//! hides the window when the slide out is done.
//!
//! A panel opened by a push closes as soon as the pointer leaves it. One
//! opened by the shortcut waits for the pointer to come in first, or for
//! the shortcut again.

// Used only by the Windows edge watcher.
#[cfg_attr(not(windows), allow(dead_code))]
mod detector;
#[cfg(windows)]
mod edge;
mod geometry;
mod pointer;
mod shortcut;

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::webview::WebviewWindowBuilder;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
};

use crate::types::MonitorPanel;
use geometry::{panel_rect, Rect, LEAVE_TOLERANCE};

pub const LABEL: &str = "monitor-panel";
const OPENING_EVENT: &str = "monitor-panel-opening";
const CLOSING_EVENT: &str = "monitor-panel-closing";
/// The page's slide out (180 ms in Glance) plus a frame.
const CLOSE_DELAY: Duration = Duration::from_millis(200);
const POLL_OPEN: Duration = Duration::from_millis(40);
const POLL_CLOSED: Duration = Duration::from_millis(200);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Opened {
    ByPush,
    ByShortcut,
}

struct Shown {
    rect: Rect,
    scale: f64,
    entered: bool, // the pointer has been on the panel since it opened
}

pub struct Panel {
    settings: Mutex<MonitorPanel>,
    shown: Mutex<Option<Shown>>,
    generation: AtomicU64, // bumped on every open and close, so a stale hide is skipped
}

impl Panel {
    pub fn settings(&self) -> MonitorPanel {
        self.settings.lock().unwrap().clone()
    }

    pub fn is_open(&self) -> bool {
        self.shown.lock().unwrap().is_some()
    }
}

fn panel(app: &AppHandle) -> Arc<Panel> {
    app.state::<Arc<Panel>>().inner().clone()
}

/// Make the (hidden) panel window and start watching the edge and the pointer.
pub fn create(app: &AppHandle, settings: MonitorPanel) -> tauri::Result<()> {
    WebviewWindowBuilder::new(
        app,
        LABEL,
        WebviewUrl::App(format!("index.html?window={LABEL}").into()),
    )
    .title("EnvIO monitor")
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .focused(false)
    .visible(false)
    .build()?;

    let keys = settings.shortcut.clone();
    app.manage(Arc::new(Panel {
        settings: Mutex::new(settings),
        shown: Mutex::new(None),
        generation: AtomicU64::new(0),
    }));
    shortcut::register(app, keys.as_deref());
    let watcher = app.clone();
    thread::Builder::new()
        .name("panel-leave".into())
        .spawn(move || watch_leaving(&watcher))?;
    #[cfg(windows)]
    edge::start(app.clone());
    Ok(())
}

/// New settings from the preferences: re-register the shortcut, close the panel.
pub fn apply(app: &AppHandle, settings: MonitorPanel) {
    let Some(state) = app.try_state::<Arc<Panel>>() else {
        return;
    };
    let changed_key = state.settings().shortcut != settings.shortcut;
    *state.settings.lock().unwrap() = settings.clone();
    if changed_key {
        shortcut::register(app, settings.shortcut.as_deref());
    }
    close(app);
}

/// Open on the screen holding (x, y), physical pixels.
pub fn open_at(app: &AppHandle, x: f64, y: f64, how: Opened) {
    let state = panel(app);
    let Some(window) = app.get_webview_window(LABEL) else {
        return;
    };
    let monitor = app
        .monitor_from_point(x, y)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten());
    let Some(monitor) = monitor else {
        return;
    };
    let area = monitor.work_area();
    let work = Rect {
        x: area.position.x,
        y: area.position.y,
        width: area.size.width,
        height: area.size.height,
    };
    let settings = state.settings();
    let scale = monitor.scale_factor();
    let rect = panel_rect(work, scale, settings.edge, settings.width);

    state.generation.fetch_add(1, Ordering::SeqCst);
    *state.shown.lock().unwrap() = Some(Shown {
        rect,
        scale,
        entered: how == Opened::ByPush,
    });
    let _ = window.set_position(PhysicalPosition::new(rect.x, rect.y));
    let _ = window.set_size(PhysicalSize::new(rect.width, rect.height));
    show_quietly(&window);
    let _ = window.emit_to(LABEL, OPENING_EVENT, settings.edge);
}

/// Slide out, then hide, unless it opened again meanwhile.
pub fn close(app: &AppHandle) {
    let state = panel(app);
    if state.shown.lock().unwrap().take().is_none() {
        return;
    }
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let _ = app.emit_to(LABEL, CLOSING_EVENT, ());
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(CLOSE_DELAY);
        if panel(&app).generation.load(Ordering::SeqCst) == generation {
            if let Some(window) = app.get_webview_window(LABEL) {
                let _ = window.hide();
            }
        }
    });
}

/// The shortcut: open on the screen under the pointer, or close.
pub fn toggle(app: &AppHandle) {
    if panel(app).is_open() {
        close(app);
    } else if let Ok(at) = app.cursor_position() {
        open_at(app, at.x, at.y, Opened::ByShortcut);
    }
}

/// Show without taking focus from the window being worked in.
fn show_quietly(window: &WebviewWindow) {
    #[cfg(windows)]
    if let Ok(hwnd) = window.hwnd() {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_SHOWNOACTIVATE};
        // SAFETY: the handle belongs to this live window.
        let _ = unsafe { ShowWindow(HWND(hwnd.0), SW_SHOWNOACTIVATE) };
        return;
    }
    let _ = window.show();
}

/// Close the panel once the pointer has left it (and no button is held, so
/// a drag that strays off it does not shut it).
fn watch_leaving(app: &AppHandle) {
    loop {
        let open = {
            let state = panel(app);
            let mut shown = state.shown.lock().unwrap();
            match shown.as_mut() {
                None => false,
                Some(s) => {
                    if let Ok(at) = app.cursor_position() {
                        if s.rect.near(at.x, at.y, LEAVE_TOLERANCE * s.scale) {
                            s.entered = true;
                        } else if s.entered && !pointer::buttons_held() {
                            drop(shown);
                            close(app);
                        }
                    }
                    true
                }
            }
        };
        thread::sleep(if open { POLL_OPEN } else { POLL_CLOSED });
    }
}

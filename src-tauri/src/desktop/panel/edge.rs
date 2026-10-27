//! Watching the screen edge for a push (Windows). A thread with a
//! message-only window hears the mouse's raw input wherever the pointer is
//! (`RIDEV_INPUTSINK`): raw counts keep coming while the cursor is pinned
//! against the edge, which is what tells a push from a pass. A timer looks
//! at the pointer ten times a second for pointers that send no raw counts
//! (pens, remote sessions): they open the panel by resting on the edge.
//!
//! The edge is an outer edge of a screen: where screens meet, the pointer
//! crosses into the next one instead. 48 px at each end never trigger, for
//! the title bar buttons and the taskbar. Nothing opens over a fullscreen
//! game. After a push opens the panel, the pointer has to leave the edge
//! before another push counts.

use std::cell::RefCell;
use std::sync::{Arc, OnceLock};
use std::time::Instant;

use tauri::{AppHandle, Manager};
use windows::core::w;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONULL,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
use windows::Win32::UI::Input::{
    GetRawInputData, RegisterRawInputDevices, HRAWINPUT, RAWINPUT, RAWINPUTDEVICE, RAWINPUTHEADER,
    RIDEV_INPUTSINK, RID_INPUT, RIM_TYPEMOUSE,
};
use windows::Win32::UI::Shell::{SHQueryUserNotificationState, QUNS_RUNNING_D3D_FULL_SCREEN};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DispatchMessageW, GetCursorPos, GetMessageW, RegisterClassW,
    SetTimer, HWND_MESSAGE, MSG, WINDOW_EX_STYLE, WINDOW_STYLE, WM_INPUT, WM_TIMER, WNDCLASSW,
};

use super::detector::{Detector, Motion};
use super::{open_at, Opened, Panel};
use crate::types::PanelEdge;

/// The ends of the edge that never trigger (logical px), as in Glance.
const CORNER_EXCLUSION: f64 = 48.0;
const LOOK_MS: u32 = 100;
/// RAWMOUSE flag: the device reports where it is, not how far it moved.
const MOUSE_MOVE_ABSOLUTE: u16 = 1;

static APP: OnceLock<AppHandle> = OnceLock::new();

struct Watch {
    detector: Detector,
    armed: bool,
    heard: bool, // raw input arrived since the last look
    last_cursor: POINT,
}

thread_local! {
    static WATCH: RefCell<Watch> = RefCell::new(Watch {
        detector: Detector::default(),
        armed: true,
        heard: false,
        last_cursor: POINT::default(),
    });
}

pub fn start(app: AppHandle) {
    if APP.set(app).is_err() {
        return;
    }
    let spawned = std::thread::Builder::new()
        .name("panel-edge".into())
        // SAFETY: plain Win32 calls on this thread's own window.
        .spawn(|| {
            if let Err(e) = unsafe { run() } {
                log::warn!("the panel cannot watch the screen edge: {e}");
            }
        });
    if let Err(e) = spawned {
        log::warn!("could not start the edge watcher: {e}");
    }
}

unsafe fn run() -> windows::core::Result<()> {
    let instance = GetModuleHandleW(None)?;
    let class = w!("EnvIOPanelEdge");
    RegisterClassW(&WNDCLASSW {
        lpfnWndProc: Some(window_proc),
        hInstance: instance.into(),
        lpszClassName: class,
        ..Default::default()
    });
    let hwnd = CreateWindowExW(
        WINDOW_EX_STYLE(0),
        class,
        w!(""),
        WINDOW_STYLE(0),
        0,
        0,
        0,
        0,
        Some(HWND_MESSAGE),
        None,
        Some(instance.into()),
        None,
    )?;
    let mouse = RAWINPUTDEVICE {
        usUsagePage: 0x01, // generic desktop
        usUsage: 0x02,     // mouse
        dwFlags: RIDEV_INPUTSINK,
        hwndTarget: hwnd,
    };
    RegisterRawInputDevices(&[mouse], std::mem::size_of::<RAWINPUTDEVICE>() as u32)?;
    SetTimer(Some(hwnd), 1, LOOK_MS, None);
    let mut msg = MSG::default();
    while GetMessageW(&mut msg, None, 0, 0).as_bool() {
        DispatchMessageW(&msg);
    }
    Ok(())
}

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_INPUT => {
            if let Some(motion) = read_mouse(lparam) {
                heard(motion);
            }
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }
        WM_TIMER => {
            looked();
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// One raw mouse report: absolute, or moved by (x, y) counts.
struct Moved {
    absolute: bool,
    x: i32,
    y: i32,
}

unsafe fn read_mouse(lparam: LPARAM) -> Option<Moved> {
    let mut raw = RAWINPUT::default();
    let mut size = std::mem::size_of::<RAWINPUT>() as u32;
    let read = GetRawInputData(
        HRAWINPUT(lparam.0 as _),
        RID_INPUT,
        Some(&mut raw as *mut RAWINPUT as *mut _),
        &mut size,
        std::mem::size_of::<RAWINPUTHEADER>() as u32,
    );
    if read == u32::MAX || raw.header.dwType != RIM_TYPEMOUSE.0 {
        return None;
    }
    let mouse = raw.data.mouse;
    Some(Moved {
        absolute: mouse.usFlags.0 & MOUSE_MOVE_ABSOLUTE != 0,
        x: mouse.lLastX,
        y: mouse.lLastY,
    })
}

fn cursor() -> Option<POINT> {
    let mut point = POINT::default();
    // SAFETY: writes into a local.
    unsafe { GetCursorPos(&mut point) }.ok().map(|_| point)
}

/// Whether `at` is on the chosen outer edge of its screen, away from the corners.
fn on_edge(at: POINT, edge: PanelEdge) -> bool {
    // SAFETY: plain monitor queries.
    unsafe {
        let monitor = MonitorFromPoint(at, MONITOR_DEFAULTTONULL);
        if monitor.is_invalid() {
            return false;
        }
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut info).as_bool() {
            return false;
        }
        let (mut dpi_x, mut dpi_y) = (96, 96);
        let _ = GetDpiForMonitor(monitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
        let corner = (CORNER_EXCLUSION * f64::from(dpi_y) / 96.0) as i32;
        let r = info.rcMonitor;
        if at.y < r.top + corner || at.y >= r.bottom - corner {
            return false;
        }
        let (touching, beyond) = match edge {
            PanelEdge::Right => (
                at.x >= r.right - 1,
                POINT {
                    x: r.right,
                    y: at.y,
                },
            ),
            PanelEdge::Left => (
                at.x <= r.left,
                POINT {
                    x: r.left - 1,
                    y: at.y,
                },
            ),
        };
        touching && MonitorFromPoint(beyond, MONITOR_DEFAULTTONULL).is_invalid()
    }
}

fn fullscreen_game() -> bool {
    // SAFETY: a plain shell query.
    unsafe { SHQueryUserNotificationState() }.is_ok_and(|s| s == QUNS_RUNNING_D3D_FULL_SCREEN)
}

fn open(at: POINT) {
    if let Some(app) = APP.get() {
        open_at(app, f64::from(at.x), f64::from(at.y), Opened::ByPush);
    }
}

/// The panel's settings, or None while pushing should do nothing.
fn listening() -> Option<(PanelEdge, i32)> {
    let panel = APP.get()?.state::<Arc<Panel>>().inner().clone();
    let settings = panel.settings();
    (settings.open_on_push && !panel.is_open()).then(|| (settings.edge, settings.push.pressure()))
}

fn heard(moved: Moved) {
    let opened = WATCH.with(|w| {
        let mut w = w.borrow_mut();
        w.heard = true;
        let (Some((edge, pressure)), Some(at)) = (listening(), cursor()) else {
            w.detector.reset();
            return None;
        };
        if !on_edge(at, edge) {
            w.detector.reset();
            w.armed = true;
            return None;
        }
        if !w.armed || fullscreen_game() {
            return None;
        }
        let motion = if moved.absolute {
            Motion::Absolute
        } else {
            let outward = if edge == PanelEdge::Right {
                moved.x
            } else {
                -moved.x
            };
            Motion::Relative {
                outward,
                along: moved.y,
            }
        };
        if w.detector.motion(motion, Instant::now(), pressure) {
            w.detector.reset();
            w.armed = false;
            return Some(at);
        }
        None
    });
    if let Some(at) = opened {
        open(at);
    }
}

/// The timer's look at the pointer, for pointers that only rest on the edge.
fn looked() {
    let opened = WATCH.with(|w| {
        let mut w = w.borrow_mut();
        let heard = std::mem::replace(&mut w.heard, false);
        let at = cursor()?;
        let moved = at.x != w.last_cursor.x || at.y != w.last_cursor.y;
        w.last_cursor = at;
        let Some((edge, pressure)) = listening() else {
            w.detector.reset();
            return None;
        };
        if !on_edge(at, edge) {
            w.detector.reset();
            w.armed = true;
            return None;
        }
        let now = Instant::now();
        if moved && !heard {
            w.detector.motion(Motion::Absolute, now, pressure);
        }
        if w.armed && w.detector.dwell_elapsed(now) && !fullscreen_game() {
            w.detector.reset();
            w.armed = false;
            return Some(at);
        }
        None
    });
    if let Some(at) = opened {
        open(at);
    }
}

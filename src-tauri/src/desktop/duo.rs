//! Todo Duo: two linked desktop windows, a capsule on top and a todo card below.
//! They are EnvForIO's mini mode: minimizing the main window shrinks it into
//! this sticky, and the capsule's expand button brings the window back.
//!
//! The card always sits just under the capsule. Dragging the capsule moves the
//! card; dragging the card moves the capsule. Each window keeps its own size.
//!
//! Positions are physical pixels. Moving one window fires a Moved event on the
//! other; it is ignored when the other is already where it should be, which is
//! what stops the two from chasing each other.

use tauri::webview::WebviewWindowBuilder;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Runtime, WebviewUrl, WebviewWindow, WindowEvent,
};

pub const CAPSULE: &str = "duo-capsule";
pub const CARD: &str = "duo-card";

const GAP: f64 = 8.0; // logical pixels between capsule and card
const SLACK: i32 = 1; // physical pixels of rounding we ignore

pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let capsule = build(app, CAPSULE, 320.0, 56.0)?;
    let card = build(app, CARD, 320.0, 440.0)?; // room for the Month tab

    let card_for_capsule = card.clone();
    capsule.on_window_event(move |event| match event {
        WindowEvent::Moved(_) | WindowEvent::Resized(_) => follow_capsule(&card_for_capsule),
        WindowEvent::CloseRequested { api, .. } => {
            // Alt+F4 hides the pair instead of destroying one half of it.
            api.prevent_close();
            hide_both(card_for_capsule.app_handle());
        }
        _ => {}
    });
    let capsule_for_card = capsule.clone();
    card.on_window_event(move |event| match event {
        WindowEvent::Moved(card_pos) => follow_card(&capsule_for_card, *card_pos),
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            hide_both(capsule_for_card.app_handle());
        }
        _ => {}
    });

    // The window-state plugin may have restored both positions; re-link them.
    follow_capsule(&card);
    Ok(())
}

fn build<R: Runtime>(
    app: &AppHandle<R>,
    label: &str,
    width: f64,
    height: f64,
) -> tauri::Result<WebviewWindow<R>> {
    WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::App(format!("index.html?window={label}").into()),
    )
    .title("Todo Duo")
    .inner_size(width, height)
    .min_inner_size(240.0, 48.0)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .resizable(true)
    .visible(false) // shown by the float button; not tracked by the window-state plugin
    .build()
}

/// Where the card belongs: left-aligned with the capsule, just below it.
fn card_target<R: Runtime>(capsule: &WebviewWindow<R>) -> Option<PhysicalPosition<i32>> {
    let pos = capsule.outer_position().ok()?;
    let size = capsule.outer_size().ok()?;
    let gap = (GAP * capsule.scale_factor().ok()?).round() as i32;
    Some(PhysicalPosition::new(
        pos.x,
        pos.y + size.height as i32 + gap,
    ))
}

fn close_enough(a: PhysicalPosition<i32>, b: PhysicalPosition<i32>) -> bool {
    (a.x - b.x).abs() <= SLACK && (a.y - b.y).abs() <= SLACK
}

fn follow_capsule<R: Runtime>(card: &WebviewWindow<R>) {
    let Some(capsule) = card.app_handle().get_webview_window(CAPSULE) else {
        return;
    };
    let (Some(target), Ok(now)) = (card_target(&capsule), card.outer_position()) else {
        return;
    };
    if !close_enough(target, now) {
        let _ = card.set_position(target);
    }
}

fn follow_card<R: Runtime>(capsule: &WebviewWindow<R>, card_pos: PhysicalPosition<i32>) {
    let Some(expected) = card_target(capsule) else {
        return;
    };
    if close_enough(expected, card_pos) {
        return; // the card moved because we moved it
    }
    // The user dragged the card: put the capsule back on top of it.
    let (Ok(pos), Ok(size), Ok(scale)) = (
        capsule.outer_position(),
        capsule.outer_size(),
        capsule.scale_factor(),
    ) else {
        return;
    };
    let gap = (GAP * scale).round() as i32;
    let target = PhysicalPosition::new(card_pos.x, card_pos.y - size.height as i32 - gap);
    if !close_enough(target, pos) {
        let _ = capsule.set_position(target);
    }
}

fn both<R: Runtime>(app: &AppHandle<R>) -> Vec<WebviewWindow<R>> {
    [CAPSULE, CARD]
        .iter()
        .filter_map(|label| app.get_webview_window(label))
        .collect()
}

fn hide_both<R: Runtime>(app: &AppHandle<R>) {
    for window in both(app) {
        let _ = window.hide();
    }
}

// ---------------------------------------------------------------------------
// Mini mode: the main window shrinks into the Todo Duo sticky and back.

/// Hide the main window and show the sticky at its top-right corner,
/// so it looks like the window shrank in place.
pub fn enter_mini_mode<R: Runtime>(app: &AppHandle<R>) {
    let main = app.get_webview_window("main");
    let capsule = app.get_webview_window(CAPSULE);
    if let (Some(main), Some(capsule)) = (&main, &capsule) {
        if let (Ok(pos), Ok(size), Ok(capsule_size)) = (
            main.outer_position(),
            main.outer_size(),
            capsule.outer_size(),
        ) {
            let x = pos.x + size.width as i32 - capsule_size.width as i32;
            let _ = capsule.set_position(PhysicalPosition::new(x, pos.y));
        }
    }
    for window in both(app) {
        let _ = window.show();
    }
    if let Some(main) = main {
        let _ = main.hide();
    }
}

/// Keep the sticky above other windows (pinned) or let them cover it.
pub fn set_pinned<R: Runtime>(app: &AppHandle<R>, pinned: bool) {
    for window in both(app) {
        let _ = window.set_always_on_top(pinned);
    }
}

/// Hide the sticky and bring the main window back.
/// Leaves mini mode onto the calendar page at `date` (a double-click in the
/// card's Month tab); the main window opens the day on `open-calendar-day`.
pub fn open_calendar_day<R: Runtime>(app: &AppHandle<R>, date: &str) {
    leave_mini_mode(app);
    let _ = app.emit_to("main", "open-calendar-day", date);
}

pub fn leave_mini_mode<R: Runtime>(app: &AppHandle<R>) {
    hide_both(app);
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
}

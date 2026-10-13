//! Todo Duo: two linked desktop windows, a capsule on top and a todo card below.
//!
//! The card always sits just under the capsule. Dragging the capsule moves the
//! card; dragging the card moves the capsule; when the capsule grows into the
//! heatmap the card slides down with it. Each window keeps its own size.
//!
//! Positions are physical pixels. Moving one window fires a Moved event on the
//! other; it is ignored when the other is already where it should be, which is
//! what stops the two from chasing each other.

use tauri::webview::WebviewWindowBuilder;
use tauri::{
    AppHandle, Manager, PhysicalPosition, Runtime, WebviewUrl, WebviewWindow, WindowEvent,
};

pub const CAPSULE: &str = "duo-capsule";
pub const CARD: &str = "duo-card";

const GAP: f64 = 8.0; // logical pixels between capsule and card
const SLACK: i32 = 1; // physical pixels of rounding we ignore

pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let capsule = build(app, CAPSULE, 320.0, 56.0)?;
    let card = build(app, CARD, 320.0, 380.0)?;

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
    .visible(false) // shown from the tray; the window-state plugin restores last visibility
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

/// Show both windows if either is hidden, otherwise hide both.
pub fn toggle<R: Runtime>(app: &AppHandle<R>) {
    let windows = both(app);
    if windows.iter().all(|w| w.is_visible().unwrap_or(false)) {
        hide_both(app);
    } else {
        for window in &windows {
            let _ = window.show();
        }
    }
}

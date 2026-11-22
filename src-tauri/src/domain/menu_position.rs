//! Where a popup menu opened at the cursor goes (the tray menu window).
//!
//! Up and to the right of the cursor, as Windows 11 opens tray menus;
//! flipped left near the screen's right edge and down from a taskbar at the
//! top, then kept inside the monitor's work area. All values are physical
//! pixels.

/// A rectangle in physical pixels: the monitor's work area, or a menu.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// Top-left corner for a `width` x `height` menu opened at the cursor `at`.
// NOTE: only the tray menu calls this, and Linux has no tray menu window.
#[cfg_attr(target_os = "linux", allow(dead_code))]
pub fn menu_origin(at: (i32, i32), width: i32, height: i32, area: Rect) -> (i32, i32) {
    let (cx, cy) = at;
    let right = area.x + area.width;
    let bottom = area.y + area.height;

    let x = if cx + width <= right { cx } else { cx - width };
    let y = if cy - height >= area.y {
        cy - height
    } else {
        cy
    };
    // min before max: a menu larger than the area sticks to its top-left.
    (
        x.min(right - width).max(area.x),
        y.min(bottom - height).max(area.y),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const W: i32 = 280;
    const H: i32 = 240;

    /// A 1920x1080 screen whose 48 px taskbar takes the given side.
    fn screen(taskbar: &str) -> Rect {
        match taskbar {
            "top" => Rect {
                x: 0,
                y: 48,
                width: 1920,
                height: 1032,
            },
            "left" => Rect {
                x: 48,
                y: 0,
                width: 1872,
                height: 1080,
            },
            _ => Rect {
                x: 0,
                y: 0,
                width: 1920,
                height: 1032,
            },
        }
    }

    #[test]
    fn opens_up_and_right_above_a_bottom_taskbar() {
        // The icon is in the taskbar, below the work area: the menu starts at
        // the cursor's x and sits on the taskbar's top edge.
        assert_eq!(
            menu_origin((1500, 1060), W, H, screen("bottom")),
            (1500, 792)
        );
    }

    #[test]
    fn flips_left_near_the_right_edge() {
        assert_eq!(
            menu_origin((1800, 1060), W, H, screen("bottom")),
            (1520, 792)
        );
    }

    #[test]
    fn opens_down_from_a_top_taskbar() {
        assert_eq!(menu_origin((1500, 20), W, H, screen("top")), (1500, 48));
    }

    #[test]
    fn opens_right_of_a_left_taskbar() {
        assert_eq!(menu_origin((20, 900), W, H, screen("left")), (48, 660));
    }

    #[test]
    fn stays_on_a_second_monitor_to_the_left() {
        let left_monitor = Rect {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1032,
        };
        assert_eq!(menu_origin((-100, 1060), W, H, left_monitor), (-380, 792));
    }

    #[test]
    fn a_menu_taller_than_the_area_sticks_to_its_top() {
        let short = Rect {
            x: 0,
            y: 0,
            width: 1920,
            height: 200,
        };
        assert_eq!(menu_origin((1500, 1060), W, H, short), (1500, 0));
    }
}

//! Where the panel goes and when the pointer has left it. Physical pixels.

use crate::types::PanelEdge;

/// The pointer may stray this far off the panel before it closes (logical px).
pub const LEAVE_TOLERANCE: f64 = 10.0;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl Rect {
    /// Whether (x, y) is inside, or within `margin` of it.
    pub fn near(&self, x: f64, y: f64, margin: f64) -> bool {
        let (left, top) = (f64::from(self.x) - margin, f64::from(self.y) - margin);
        let right = f64::from(self.x) + f64::from(self.width) + margin;
        let bottom = f64::from(self.y) + f64::from(self.height) + margin;
        x >= left && x < right && y >= top && y < bottom
    }
}

/// The panel along `edge` of a screen's work area, `width` logical px wide.
pub fn panel_rect(work: Rect, scale: f64, edge: PanelEdge, width: u32) -> Rect {
    let w = ((f64::from(width) * scale).round() as u32).min(work.width);
    let x = match edge {
        PanelEdge::Left => work.x,
        PanelEdge::Right => work.x + work.width as i32 - w as i32,
    };
    Rect {
        x,
        y: work.y,
        width: w,
        height: work.height,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WORK: Rect = Rect {
        x: 1920,
        y: 0,
        width: 2560,
        height: 1392,
    };

    #[test]
    fn the_panel_hugs_the_chosen_edge_at_the_screen_scale() {
        let right = panel_rect(WORK, 1.5, PanelEdge::Right, 340);
        assert_eq!(
            right,
            Rect {
                x: 1920 + 2560 - 510,
                y: 0,
                width: 510,
                height: 1392
            }
        );
        let left = panel_rect(WORK, 1.0, PanelEdge::Left, 340);
        assert_eq!((left.x, left.width), (1920, 340));
    }

    #[test]
    fn near_allows_the_tolerance_and_no_more() {
        let r = Rect {
            x: 100,
            y: 0,
            width: 50,
            height: 100,
        };
        assert!(r.near(120.0, 50.0, 0.0));
        assert!(r.near(91.0, 50.0, 10.0));
        assert!(!r.near(89.0, 50.0, 10.0));
        assert!(!r.near(161.0, 50.0, 10.0));
    }
}

//! Pure helpers for monitor samples.

use std::time::Duration;

/// Bytes counted over `elapsed`, as bytes per second.
pub fn per_second(bytes: u64, elapsed: Duration) -> u64 {
    let ms = elapsed.as_millis().max(1);
    (u128::from(bytes) * 1000 / ms) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rates_are_per_second() {
        assert_eq!(per_second(3000, Duration::from_millis(1500)), 2000);
        assert_eq!(per_second(5, Duration::ZERO), 5000);
    }
}

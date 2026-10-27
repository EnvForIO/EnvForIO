//! Data sources behind an interface, so another one can take over without
//! the rest of the app noticing: `base.rs` holds the trait, `factory.rs`
//! picks the implementation.

pub mod monitor;

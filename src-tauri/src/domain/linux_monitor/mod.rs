//! Readings of a Linux machine (an SSH host or a WSL distribution) from the
//! text a small shell loop prints: `parse` turns one round of that text
//! into counters, `compute` turns two rounds into a `Sample` (CPU shares
//! and disk rates need the difference between them).
//!
//! The loop's output, one round:
//!
//! ```text
//! @sample
//! @stat      lines of /proc/stat starting with "cpu"
//! @mem       MemTotal, MemAvailable, SwapTotal, SwapFree from /proc/meminfo
//! @disk      /proc/diskstats
//! @df        df -kPT without its header
//! @gpu       nvidia-smi --query-gpu=... csv, if there is nvidia-smi
//! @end
//! ```
//!
//! and once, before the loop, `@info` with the host name, kernel, CPU model
//! and thread count, one per line.

pub mod compute;
pub mod parse;

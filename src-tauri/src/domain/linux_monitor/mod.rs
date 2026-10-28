//! Readings of a Linux machine (an SSH host or a WSL distribution) from the
//! text a small shell loop prints: `parse` turns one round of that text
//! into counters, `compute` turns two rounds into a `Sample` (rates and CPU
//! shares need the difference between them).
//!
//! The loop's output, one round:
//!
//! ```text
//! @sample
//! @stat      lines of /proc/stat starting with "cpu"
//! @mem       MemTotal, MemAvailable, SwapTotal, SwapFree from /proc/meminfo
//! @net       /proc/net/dev without its two header lines
//! @disk      /proc/diskstats
//! @df        df -kPT without its header
//! @proc      "pid ticks rss_pages comm" per process
//! @gpu       nvidia-smi --query-gpu=... csv, if there is nvidia-smi
//! ```
//!
//! and once, before the loop, `@info` with the host name, kernel, CPU model,
//! thread count, clock ticks per second and page size, one per line.

pub mod compute;
pub mod parse;

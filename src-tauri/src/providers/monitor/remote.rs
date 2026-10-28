//! A Linux machine read through a long-lived session: `ssh host sh -s` or
//! `wsl.exe -d distro -- sh -s`, fed `remote.sh` on stdin. The script loops
//! once a second; a reader thread parses each round and keeps the latest
//! `Sample`. The session starts on the first `sample` call, ends on
//! `pause` (nothing watching) or drop, and is retried every 10 s after it
//! fails. ssh runs in batch mode: it never asks for a password.

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use super::base::MonitorSource;
use super::process::{hidden, ssh_program};
use crate::domain::linux_monitor::compute;
use crate::domain::linux_monitor::parse::{parse_info, parse_round, Info, Round};
use crate::entity::monitor::{GpuInfo, MachineInfo, Sample};

const SCRIPT: &str = include_str!("remote.sh");
const RETRY: Duration = Duration::from_secs(10);

/// What one session has read so far. A new session gets a new one, so a
/// dying session's threads cannot write into the next.
#[derive(Default)]
struct Shared {
    info: Option<Info>,
    latest: Option<Sample>,
    error: Option<String>,
}

pub struct RemoteSource {
    label: String,
    command: fn(&str) -> Command,
    child: Option<Child>,
    shared: Arc<Mutex<Shared>>,
    started: Option<Instant>,
}

pub fn ssh(host: &str) -> Command {
    let mut c = hidden(&ssh_program());
    c.args(["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10"])
        .args([
            "-o",
            "ServerAliveInterval=15",
            "-o",
            "ServerAliveCountMax=2",
        ])
        .args([host, "sh", "-s"]);
    c
}

pub fn wsl(distro: &str) -> Command {
    let mut c = hidden("wsl.exe");
    c.args(["-d", distro, "--", "sh", "-s"]);
    c
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default()
}

impl RemoteSource {
    pub fn new(label: &str, command: fn(&str) -> Command) -> Self {
        Self {
            label: label.to_string(),
            command,
            child: None,
            shared: Arc::new(Mutex::new(Shared::default())),
            started: None,
        }
    }

    fn connect(&mut self) {
        self.stop();
        self.started = Some(Instant::now());
        let shared = Arc::new(Mutex::new(Shared::default()));
        self.shared = shared.clone();
        let spawned = (self.command)(&self.label)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();
        let mut child = match spawned {
            Ok(child) => child,
            Err(e) => {
                shared.lock().unwrap().error = Some(format!("could not start: {e}"));
                return;
            }
        };
        if let Some(mut stdin) = child.stdin.take() {
            // The script is read whole, then the loop runs; closing stdin is fine.
            let _ = stdin.write_all(SCRIPT.as_bytes());
        }
        let last_error = Arc::new(Mutex::new(String::new()));
        if let Some(stderr) = child.stderr.take() {
            let last_error = last_error.clone();
            thread::spawn(move || {
                for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                    if !line.trim().is_empty() {
                        *last_error.lock().unwrap() = line.trim().to_string();
                    }
                }
            });
        }
        if let Some(stdout) = child.stdout.take() {
            thread::spawn(move || read_rounds(stdout, &shared, &last_error));
        }
        self.child = Some(child);
    }

    fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    fn running(&mut self) -> bool {
        self.child
            .as_mut()
            .is_some_and(|c| matches!(c.try_wait(), Ok(None)))
    }
}

/// Read the script's output until it ends, keeping the latest sample.
fn read_rounds(stdout: impl std::io::Read, shared: &Mutex<Shared>, last_error: &Mutex<String>) {
    let mut section = Vec::new();
    let mut previous: Option<(Round, Instant)> = None;
    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        match line.as_str() {
            "@sample" => {
                let mut s = shared.lock().unwrap();
                if s.info.is_none() && section.first().is_some_and(|l: &String| l == "@info") {
                    s.info = Some(parse_info(&section[1..]));
                }
                section.clear();
            }
            "@end" => {
                let round = parse_round(&section.join("\n"));
                let now = Instant::now();
                let mut s = shared.lock().unwrap();
                let elapsed = previous
                    .as_ref()
                    .map_or(Duration::ZERO, |(_, at)| now - *at);
                s.latest = Some(compute::sample(
                    previous.as_ref().map(|(r, _)| r),
                    &round,
                    elapsed,
                    now_ms(),
                ));
                s.error = None;
                previous = Some((round, now));
                section.clear();
            }
            _ => section.push(line),
        }
    }
    let why = last_error.lock().unwrap().clone();
    shared.lock().unwrap().error = Some(if why.is_empty() {
        "The connection closed.".to_string()
    } else {
        why
    });
}

impl Drop for RemoteSource {
    fn drop(&mut self) {
        self.stop();
    }
}

impl MonitorSource for RemoteSource {
    fn info(&mut self) -> MachineInfo {
        let s = self.shared.lock().unwrap();
        let info = s.info.clone().unwrap_or_default();
        let latest = s.latest.as_ref();
        MachineInfo {
            host_name: if info.host_name.is_empty() {
                self.label.clone()
            } else {
                info.host_name
            },
            os: info.os,
            cpu_brand: info.cpu_model,
            logical_cores: info.threads,
            physical_cores: None,
            memory_total: latest.map_or(0, |l| l.memory.total),
            gpus: latest
                .map(|l| {
                    l.gpus
                        .iter()
                        .map(|g| GpuInfo {
                            index: g.index,
                            name: g.name.clone(),
                            memory_total: g.memory_total,
                        })
                        .collect()
                })
                .unwrap_or_default(),
        }
    }

    fn sample(&mut self) -> Option<Sample> {
        let retry_due = self.started.is_none_or(|at| at.elapsed() >= RETRY);
        if !self.running() && retry_due {
            self.connect();
        }
        let s = self.shared.lock().unwrap();
        match (&s.latest, &s.error) {
            (_, Some(error)) => Some(Sample {
                at_ms: now_ms(),
                error: Some(error.clone()),
                ..Sample::default()
            }),
            (Some(latest), None) => Some(latest.clone()),
            (None, None) => None, // still connecting
        }
    }

    fn pause(&mut self) {
        self.stop();
        self.started = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Runs remote.sh through a local `sh -s` (the same path as ssh and
    /// wsl.exe) and reads two rounds. Ignored: needs a Linux machine.
    #[test]
    #[ignore]
    fn the_script_reads_this_linux_machine() {
        let mut source = RemoteSource::new("sh", |_| {
            let mut c = Command::new("sh");
            c.arg("-s");
            c
        });
        let mut last = None;
        for _ in 0..40 {
            if let Some(s) = source.sample() {
                last = Some(s);
            }
            thread::sleep(Duration::from_millis(100));
        }
        let s = last.expect("a sample within 4 s");
        assert_eq!(s.error, None);
        assert!(!s.cpu.cores.is_empty() && s.memory.total > 0);
        assert!(!s.drives.is_empty());
        let info = source.info();
        assert!(!info.os.is_empty() && info.logical_cores > 0);
        println!(
            "{info:#?}\ncpu {:.1}% cores {} mem {} drives {:?}\ngpus {:?}",
            s.cpu.usage,
            s.cpu.cores.len(),
            s.memory.used,
            s.drives.iter().map(|d| &d.mount).collect::<Vec<_>>(),
            s.gpus
                .iter()
                .map(|g| (&g.name, g.usage, g.memory_used))
                .collect::<Vec<_>>()
        );
    }
}

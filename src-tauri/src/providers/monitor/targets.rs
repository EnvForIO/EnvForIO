//! The machines that can be watched: this PC, each WSL distribution that
//! is running now (listing never starts one), and each host named in the
//! user's SSH config.

use super::process::{hidden, home};
use crate::domain::ssh_config::host_aliases;
use crate::entity::monitor::MonitorTarget;

pub fn list() -> Vec<MonitorTarget> {
    let mut targets = vec![MonitorTarget::Local];
    targets.extend(
        running_distros()
            .into_iter()
            .map(|distro| MonitorTarget::Wsl { distro }),
    );
    targets.extend(
        ssh_hosts()
            .into_iter()
            .map(|host| MonitorTarget::Ssh { host }),
    );
    targets
}

fn ssh_hosts() -> Vec<String> {
    let Some(path) = home().map(|h| h.join(".ssh").join("config")) else {
        return Vec::new();
    };
    std::fs::read_to_string(path)
        .map(|config| host_aliases(&config))
        .unwrap_or_default()
}

fn running_distros() -> Vec<String> {
    if !cfg!(windows) {
        return Vec::new();
    }
    match hidden("wsl.exe")
        .args(["--list", "--running", "--quiet"])
        .output()
    {
        Ok(out) if out.status.success() => wsl_lines(&out.stdout),
        _ => Vec::new(), // no WSL, or none running
    }
}

/// wsl.exe writes UTF-16LE; newer builds may write UTF-8 when asked.
fn wsl_lines(bytes: &[u8]) -> Vec<String> {
    let text = if bytes.len() > 1 && bytes[1] == 0 {
        let units: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|p| u16::from_le_bytes([p[0], p[1]]))
            .collect();
        String::from_utf16_lossy(&units)
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    };
    text.lines()
        .map(|l| {
            l.trim_matches(|c: char| c.is_whitespace() || c == '\0')
                .to_string()
        })
        .filter(|l| !l.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wsl_output_reads_in_utf16_and_utf8() {
        let utf16: Vec<u8> = "Ubuntu-24.04\r\ndocker-desktop\r\n"
            .encode_utf16()
            .flat_map(u16::to_le_bytes)
            .collect();
        assert_eq!(wsl_lines(&utf16), vec!["Ubuntu-24.04", "docker-desktop"]);
        assert_eq!(wsl_lines(b"Debian\n\n"), vec!["Debian"]);
    }
}

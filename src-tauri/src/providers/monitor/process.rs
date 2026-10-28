//! Starting helper programs (ssh, wsl.exe) without a console window
//! flashing up on Windows.

use std::path::Path;
use std::process::Command;

/// A command that opens no console window.
pub fn hidden(program: &str) -> Command {
    #[allow(unused_mut)]
    let mut command = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

/// Windows' own OpenSSH client if it is there, else whatever `ssh` is on PATH.
pub fn ssh_program() -> String {
    let windows = r"C:\Windows\System32\OpenSSH\ssh.exe";
    if cfg!(windows) && Path::new(windows).exists() {
        windows.to_string()
    } else {
        "ssh".to_string()
    }
}

/// The user's home folder (USERPROFILE on Windows, HOME elsewhere).
pub fn home() -> Option<std::path::PathBuf> {
    std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(Into::into)
}

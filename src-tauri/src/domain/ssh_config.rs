//! The host names an OpenSSH config offers: every alias after `Host`,
//! except patterns (`*`, `?`, `!`), which match hosts rather than name one.
//! `Include` is not followed; `Match` blocks name no host.

pub fn host_aliases(config: &str) -> Vec<String> {
    let mut hosts: Vec<String> = Vec::new();
    for line in config.lines() {
        let line = line.trim();
        if line.starts_with('#') {
            continue;
        }
        // "Host a b", "Host=a", "host  a" all mean the same.
        let (keyword, rest) = match line.split_once(|c: char| c.is_whitespace() || c == '=') {
            Some(split) => split,
            None => continue,
        };
        if !keyword.eq_ignore_ascii_case("host") {
            continue;
        }
        for alias in rest.trim_start_matches(['=', ' ', '\t']).split_whitespace() {
            let alias = alias.trim_matches('"');
            let pattern = alias.contains(['*', '?', '!']);
            if !pattern && !alias.is_empty() && !hosts.iter().any(|h| h == alias) {
                hosts.push(alias.to_string());
            }
        }
    }
    hosts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn named_hosts_are_listed_and_patterns_skipped() {
        let config = "\
# lab machines
Host gpu1 gpu2
    HostName 10.0.0.1
    User tea
host=login
Host *.internal !bastion
Host *
    ServerAliveInterval 30
Match host foo
Host \"quoted\" gpu1
HostName not-a-host
";
        assert_eq!(
            host_aliases(config),
            vec!["gpu1", "gpu2", "login", "quoted"]
        );
    }

    #[test]
    fn an_empty_config_names_no_hosts() {
        assert!(host_aliases("").is_empty());
    }
}

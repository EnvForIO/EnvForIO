---
name: cleanup
description: Run static analysis tools (knip, jscpd, check:all) and get recommendations for cleanup.
user-invocable: true
allowed-tools: [Read, Write, Bash, Glob, Edit, Agent]
---

## Execution

1. Spawn the `cleanup-analyzer` agent to run analysis and investigate findings.
2. Present the agent's structured report to the user, ordered as actionable steps.

# Audit Playbook

Use this when asked to audit, sweep or health-check the app, before starting
work in a new feature area, and on the recurring scheduled audit. Claude Code
runs it as the `ascendra-audit` skill (`.claude/skills/ascendra-audit/`).

Task-scoped work reads the files a task touches and stops. An audit looks
across the whole app on purpose, because the defects that matter most here
live next to earlier changes, not inside them (REQ-096).

## Rules

1. Read-only until the owner approves a fix plan.
2. Several narrow reviewers in parallel beat one broad pass: mobile flows,
   backend integrity, schema vs code, adversarial concurrency, and teaching
   quality when lessons, grading or review changed.
3. Every finding cites `file:line` and is verified against the code, and
   against a real database when the finding is about data, before it is
   reported.
4. Report ranked findings, each covering what it is, why it matters, what
   changes and how it will be verified, plus a batching plan and the decisions
   only the owner can make.
5. Fixes ship in small approved batches under the normal completion workflow.

## Cadence

- Weekly, read-only, as a scheduled task that reports to the owner.
- Before any new feature area: audit that area plus what it touches.
- After any change to the data model, auth, grading or the AI models.

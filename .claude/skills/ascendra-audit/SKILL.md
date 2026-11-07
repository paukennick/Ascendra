---
name: ascendra-audit
description: Run a read-only, multi-reviewer audit of Ascendra for bugs that task-scoped work misses — lost state on navigation, duplicate or unscoped writes, missing access checks, races, schema drift, broken migrations, and teaching-quality gaps — then verify every finding and return a ranked fix plan. Use when asked to audit, sweep, health-check, "look at everything", "check the other workflows", before starting a new feature area, and on the recurring scheduled audit.
---

# Ascendra audit

Read-only. This skill finds and verifies problems; it never fixes them. Fixes
happen afterwards, in batches the owner approves (see "After the audit").

Why this exists (REQ-096): a task-scoped session reads the files its task
touches and stops, by design. The bugs found in the 2026-11-06 audit lived in
the code *next to* earlier changes — the account export broke when REQ-082
added a query beside it; grading could half-write because nothing ever ran it
against a real database. Those only surface when someone looks across the
whole app on purpose, with several narrow lenses and a real database.

## 1. Scope and baseline

- Work on the newest branch that contains all open work (check open PRs with
  `gh api repos/paukennick/Ascendra/pulls`; stacked PRs mean the top of the
  stack, not master).
- Note the commit you audit. Every finding cites `file:line` at that commit.
- If the owner named an area, audit only that area plus what it touches.

## 2. Fan out: independent reviewers in parallel

Launch these as parallel subagents (one message, several Agent calls), each
read-only, each told the owner is reachable through the lead and to escalate
genuinely blocking questions rather than guess. Use the repo's own agents in
`.claude/agents/` where they fit. Each reviewer reports findings as
`file:line · what happens to the user · severity · one-line fix`, separating
what it read from what it inferred.

| Lens | Agent | Looks for |
| --- | --- | --- |
| Mobile flows | general-purpose | in-progress work held only in component state; screens that load once instead of on focus; double submits; `router.push` stacking; dead ends; accessibility labels, contrast, touch targets |
| Backend integrity | security-reviewer | queries on user-owned tables missing `user_id`; routes reading by id without `lib/visibility.ts`; non-idempotent writes; multi-statement writes outside `withTransaction`; check-then-use races on single-use secrets |
| Schema vs code | architecture-reviewer | every SQL table/column/enum/`ON CONFLICT` target against migrations 001→latest; mobile `src/types` against what routes return; numeric/bigint handling; code that depends on a migration production may not have |
| Adversarial | test-adversary | concurrency (fire the same write 5× at once), retries after partial failure, boundary inputs, non-UUID ids |
| Teaching quality (when lessons, grading, review or prompts changed) | general-purpose | the loop against the evidence brief in the "Teaching & UX Overhaul Plan" doc: retrieval volume, spacing, mastery rules, AI guardrails, answer keys |

## 3. Verify against reality

Nothing reaches the report on a reviewer's word alone.

- Re-read the cited lines yourself for every high/medium finding.
- Run what can be run. A local Postgres 16 with every migration applied is the
  standard check:
  ```
  export DATABASE_URL=postgresql://postgres@localhost:55432/<db> PGSSLMODE=disable
  cd backend && npm run migrate -- --all && npm run migrate -- --status
  npm run seed && npm run test:db
  ```
  CI runs the same thing in its Database job. Races and half-writes are
  confirmed by an integration test that fails on the current code.
- Drop findings you cannot confirm, or label them "inferred" with why.

## 4. Report

One ranked list, high → low, each item covering: what it is, why it matters
to a learner, what changes, how it will be verified. Then a proposed batching
(small independent PRs, data-correctness first) and the decisions only the
owner can make. Long reports go in a doc; short ones in chat. Record nothing
in `.ai/requirements` or the failure ledger yet — that happens when a fix
lands.

## After the audit

Fixes go in approved batches, each as its own PR stacked in dependency order,
following `.ai/checklists/pre-completion.md`: a requirement, a failure-ledger
entry per defect with its regression test, integration tests against a real
database for anything stateful, a schema probe in `backend/lib/schema-status.ts`
for every migration the code depends on, the changelog, and `./omni gate`.

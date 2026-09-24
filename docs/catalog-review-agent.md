# Catalog review agent

A Claude API Managed Agent that runs quarterly and checks every course in
the catalog against its recorded official source, so course content
doesn't silently go stale between manual authoring passes. Built as
REQ-042/043.

## What it does

Each scheduled run:

1. `GET /api/catalog/review-context` — lists every track that has a
   `source_url`: code, title, freshness model, source URL, and (for
   certification tracks) the credential exam's `official_objectives_url`,
   `status`, and `retirement_date`.
2. For each track, fetches its source (and objectives URL, if present) and
   compares it against what the catalog currently reflects.
3. `POST /api/catalog/review-findings` for every track checked, with a
   `trackCode`, a `conclusion` (`current` or `flagged`), the exact
   `evidenceUrl` it fetched, and a `summary` that cites specifics.

## Where a finding actually writes

Every call inserts a row into `content_review_findings` (migration `018`)
first — nothing is silent, whether or not it also touches live data.

- **`conclusion: "current"`** additionally advances
  `subject_tracks.source_verified_at` (to the check time) and
  `content_review_due_at` (+4 months) — the exact fields the home screen's
  Verified / Review due / Unverified badges and filter read (REQ-036/038).
- **`conclusion: "flagged"`** only pulls `content_review_due_at` to *now*,
  so the track shows "Review due" immediately. It never touches
  `source_verified_at` — a flagged track should never look freshly
  verified.

This split was a deliberate design decision, not an oversight: an
unattended quarterly write should never move the one signal users see
("Verified") without the evidence that produced it sitting right next to
it in `content_review_findings`.

Auth is a static bearer credential, `CATALOG_REVIEW_AGENT_TOKEN`
(`backend/lib/auth/requireReviewAgent.ts`) — separate from user session
auth entirely. Constant-time compare, no JWT, no expiry; rotate it by
generating a new value and updating it in both places below.

## Anthropic-side resources

Created 2026-09-23, referencing the agent Nick built in the Console:

| Resource | ID |
|---|---|
| Agent | `agent_01K6FP985aEw1qMgX1TKaUFd` |
| Environment | `env_01LuC4FM8aaexBpeNCxuKKqA` (cloud, unrestricted networking — it has to reach many different vendor doc sites, not just one host) |
| Vault | `vlt_011CfMk3LNq3poLiKm5LE4dD` |
| Deployment | `depl_01JTkJYuDrNUsWCAUNZXoodc` (cron `0 6 1 1,4,7,10 *` UTC — Jan/Apr/Jul/Oct 1st, quarterly) |

The vault holds one credential: an `environment_variable` named
`CATALOG_REVIEW_AGENT_TOKEN`, substituted into the agent's sandbox at
egress (never visible inside the sandbox itself, even under prompt
injection) and, ideally, host-restricted to `backend-mauve-mu-18.vercel.app`
so it's never sent anywhere else.

The deployment's kickoff is outcome-based (`user.define_outcome`), with a
rubric requiring a real `evidenceUrl` and specific summary per track
checked, and explicitly forbidding any catalog edit outside the findings
endpoint.

## Credential setup / rotation

Two places need `CATALOG_REVIEW_AGENT_TOKEN` to match:

1. **This backend** — `CATALOG_REVIEW_AGENT_TOKEN` in `backend/.env.local`
   (local dev) and in Vercel's production project env vars (**Settings →
   Environment Variables**).
2. **The vault credential** — Console → Vaults → `vlt_011CfMk3LNq3poLiKm5LE4dD`
   → the `CATALOG_REVIEW_AGENT_TOKEN` credential's value.

Generate a new value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Rotating it means updating both places — the agent authenticates with
whatever the vault currently holds, and this backend validates against
whatever env var is currently deployed. Whichever you update first will
cause auth failures until the other catches up; do both before the next
scheduled run.

**Vault credential values are write-only** — the Console (and the API)
will show you that a credential named `CATALOG_REVIEW_AGENT_TOKEN` exists,
never its current value. Keep the value itself only in `backend/.env.local`
(gitignored) and Vercel's env vars.

## Testing a run

A manual run doubles as a smoke test and works even while the deployment
is otherwise idle:

```bash
curl -X POST https://api.anthropic.com/v1/deployments/depl_01JTkJYuDrNUsWCAUNZXoodc/run \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01"
```

Then check `content_review_findings` for new rows, and that any
`"current"` conclusions moved the corresponding tracks' freshness fields
forward as expected.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `GET`/`POST /api/catalog/*` returns 401 | `CATALOG_REVIEW_AGENT_TOKEN` mismatch between the vault credential and this backend's deployed env var — see rotation steps above |
| `GET`/`POST /api/catalog/*` returns 404 | This backend's `master` branch is behind what's actually deployed — the routes exist in code but haven't reached production yet (this happened once, 2026-09-23: 12 commits sat on a feature branch through an entire work session before merging) |
| Deployment run fails with `vault_not_found` or `environment_archived` | One of the resources above was deleted/archived outside this workflow; recreate and update the IDs in this doc |
| A finding's `evidenceUrl` doesn't match what changed | The rubric requires the *actual* page fetched, not the catalog's own recorded `source_url` — a mismatch usually means the source moved and the agent found the new location itself, which is fine, but worth a manual glance |

## Extending it

Only `source_verified_at`/`content_review_due_at` are agent-writable today.
If a future need arises for the agent to propose actual content changes
(objective wording, unit structure), that should go through a *new*,
separately-reviewed table and endpoint — not by widening what
`review-findings` can touch, per the same reasoning that kept it out of
scope this time.

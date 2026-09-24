# Overnight catalog builder agent

A Claude API Managed Agent that works through `docs/catalog-backlog.md`
one course per session, on an hourly schedule, started 2026-09-24 to
continue the catalog build (CompTIA-remainder → PM → PT → fitness →
Udemy/Coursera taxonomy gaps) while unattended. Distinct from the
quarterly review agent (`docs/catalog-review-agent.md`) -- that one reads
and reports; this one authors and writes.

## Resources

| Resource | ID |
|---|---|
| Agent | `agent_01CWRrp4MkHfMzCAdPrLtSBQ` |
| Environment | `env_01LuC4FM8aaexBpeNCxuKKqA` (shared with the review agent -- cloud, unrestricted networking) |
| Vault | `vlt_011CfMwAWQ4Mc5bPfKJAyWX5` (separate from the review agent's vault -- this one holds a full database-write credential, kept out of the narrower agent's reach) |
| Deployment | `depl_01EizV77ytLtbHGNTy5yw2rP` (cron `0 * * * *` UTC -- hourly; $1.00 session budget, ~12 firings ≈ $12 max against a $14.74 account balance) |

## What it does, each firing

1. Clones the repo read-only (`https://github.com/paukennick/Ascendra.git`
   is public -- no GitHub credential needed or granted).
2. Reads `docs/catalog-backlog.md`, takes the first unchecked item.
3. Fetches that course's authoritative source directly -- never from
   training-data memory -- and extracts any PDF guide locally with
   `pymupdf`.
4. Authors a new `SeedTrack` in `backend/supabase/seed/tracks/`, wires it
   into `seed.ts`, runs `npm run typecheck` then `npm run seed` against
   the live database using a vaulted `DATABASE_URL` credential.
5. Updates the backlog (checks off the item, or writes `BLOCKED: <reason>`
   and moves on -- never fabricates a sourcing gap), adds a
   `REQ-###`/`CHANGELOG.md` entry, commits locally in this repo's style.
6. **Does not push and cannot open a PR** -- no GitHub write credential
   exists for this agent at all. It writes a recoverable patch instead:
   `git format-patch origin/master --stdout > /mnt/session/outputs/<code>.patch`.

## Why no GitHub credential

Confirmed with Nick 2026-09-24: commits stay local to each session. The
repo is public, so read access needs no credential; write access
(pushing, opening a PR) was deliberately left out rather than granted and
constrained, since there's no branch-protection API available in this
session's GitHub tool set to enforce "PR only" at the platform level --
recommend enabling **Settings → Branches → Branch protection rule on
`master` → Require a pull request before merging** in the GitHub UI
regardless, as a standing safeguard independent of this agent.

**Consequence:** each session's code changes exist only as a patch file
in that session's `/mnt/session/outputs/` until someone retrieves and
applies them (`git am <course-code>.patch` against a local clone, then
push/PR as normal). The **data** changes (the live `npm run seed`) are
real and immediate regardless -- the app shows new courses right away.
Recovering the source files is the deliberate manual step this design
leaves for review.

## Credential setup

One vault credential, added by hand (never automated -- sending a raw
`DATABASE_URL` through an API call is exactly the kind of action this
session's own sandbox classifier blocks, correctly):

- Console → Vaults → `vlt_011CfMwAWQ4Mc5bPfKJAyWX5` → add credential
- Type: Environment variable
- `secret_name`: `DATABASE_URL`
- `secret_value`: the value in `backend/.env.local`
- Host-restrict to `aws-0-ca-central-1.pooler.supabase.com` if the form
  offers it -- the credential should never be sent anywhere else

Until this is added, every firing will fail at `npm run seed` (typecheck
and everything before it will still work) -- check
`deployment_runs` / session transcripts for `DATABASE_URL is not set`
errors if courses stop landing.

## Monitoring / stopping

No native "stop after N hours" exists on a scheduled deployment -- it
keeps firing hourly until paused or archived. **Someone needs to pause it
manually** once the ~12-hour window is up or the $14.74 balance is
getting close, whichever comes first:

```bash
curl -X POST https://api.anthropic.com/v1/deployments/depl_01EizV77ytLtbHGNTy5yw2rP/pause \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01"
```

Check progress any time by reading `docs/catalog-backlog.md`'s Session
log section (updated each firing) or `deployment_runs` for this
deployment ID.

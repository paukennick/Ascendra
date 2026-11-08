# Restore drill

REQ-118 (Audit 3 LOW-11). Nothing in this repo said how to get the database
back, and nobody had tried. A backup that has never been restored is a hope,
not a backup. Run this drill once now and then every quarter, and after any
change to how backups are taken. Write the date and the timings at the
bottom.

The drill never touches production's data: it reads from production (or
from a platform backup) and restores into a throwaway database.

## What you need

- `psql`, `pg_dump` and `pg_restore` of the same major version as production
  (Postgres 16 at the time of writing; `select version();` on production).
- The production **direct** connection string (port 5432, not the
  transaction pooler on 6543), from the Supabase dashboard. `pg_dump` needs a
  session, which the transaction pooler does not give.
- A scratch Postgres: a local one (`docker run -p 55432:5432 -e
  POSTGRES_HOST_AUTH_METHOD=trust postgres:16`) or a separate, disposable
  Supabase project. Never the production project.
- This repo checked out at the commit production runs.

## Two sources, drill both once

1. **Logical dump (always available).** You take it yourself, so it works on
   any plan.
2. **The platform's backup.** Supabase's daily backups and point-in-time
   recovery depend on the plan; check Dashboard -> Database -> Backups for
   what this project has and how long it is kept. Restoring one in place
   overwrites production, so for the drill restore it into a **new** project
   if the dashboard offers that, or download it and restore locally. If the
   plan has no downloadable backups, the logical dump below is the only
   backup there is, and should be taken on a schedule (and stored off
   Supabase).

## Steps (logical dump)

```bash
# 1. Dump. Custom format, no owner/ACLs (Supabase roles do not exist locally).
time pg_dump "$PROD_DIRECT_URL" --format=custom --no-owner --no-acl \
  --schema=public --file=ascendra-$(date +%F).dump

# 2. Restore into an empty scratch database.
psql "$SCRATCH_URL/postgres" -c 'create database ascendra_restore'
time pg_restore --no-owner --no-acl --jobs=4 \
  --dbname="$SCRATCH_URL/ascendra_restore" ascendra-$(date +%F).dump

# 3. The schema is what this commit needs, and levels match the rule.
cd backend
DATABASE_URL="$SCRATCH_URL/ascendra_restore" PGSSLMODE=disable npm run migrate -- --status

# 4. Row counts match production (run the same query on both).
psql "$SCRATCH_URL/ascendra_restore" -c "
  select (select count(*) from app_users) users, (select count(*) from attempts) attempts,
         (select count(*) from mastery) mastery, (select count(*) from review_schedule) schedule,
         (select max(created_at) from attempts) newest_attempt"

# 5. The app works against it: start the backend on the restored copy and
#    sign in as a test account, open a course, answer one question.
DATABASE_URL="$SCRATCH_URL/ascendra_restore" PGSSLMODE=disable npm run dev
```

Pass when: step 3 prints "Schema is current" and "every stored level
matches", step 4's counts equal production's at dump time, and step 5 can
sign in and grade. Then drop the scratch database and delete the dump file
(it holds every learner's data: keep it encrypted and off shared drives
while it exists).

## What to write down

- How long steps 1 and 2 took, and the dump size. That is the recovery time
  for a full loss with this method.
- How old the newest data in the restore was. That is the data you would
  lose (the recovery point).
- Anything that failed or needed a manual fix, and the fix, in this file.

## Notes

- `auth_events` and `ai_calls` are the largest tables and are logs; a
  restore that must be fast can dump them separately (`--exclude-table-data`)
  and load them afterwards.
- The `mastery_backup_*` tables are rollback copies (drop them 30 days after
  a deploy, see deploy-runbook-integration.md "Cleanup"); they need not be
  restored.

## Drill log

| Date | Source | Dump size | Dump time | Restore time | Newest data | Result |
|---|---|---|---|---|---|---|
| (not yet run) | | | | | | |

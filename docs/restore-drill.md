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
  (Postgres 17 at the time of writing; `select version();` on production).
- The production **direct** connection string (port 5432, not the
  transaction pooler on 6543), from the Supabase dashboard. `pg_dump` needs a
  session, which the transaction pooler does not give.
- A scratch Postgres: a local one (`docker run -p 55432:5432 -e
  POSTGRES_HOST_AUTH_METHOD=trust postgres:17`) or a separate, disposable
  Supabase project. Never the production project.
- This repo checked out at the commit production runs.

## Nightly backup (REQ-200): the quick drill

Since REQ-200 the nightly workflow ("Nightly database backup",
`.github/workflows/db-backup.yml`) is the backup to drill first. Setup is in
[operations-runbook.md](operations-runbook.md) "Backups". With a local
Postgres 17 (the Docker one above, or a local cluster) and this repo checked out:

```bash
# 1. Download the run's artifact from the Actions tab and unzip it:
#    ascendra-db-<UTC time>.dump.age, manifest.json.age and checksums.json
#    (keep the three in one folder).
# 2. Put the key file from the password manager next to it, then (the
#    Docker cluster above; a local cluster is postgres://postgres:postgres@localhost:5432/postgres):
ADMIN_URL=postgres://postgres@localhost:55432/postgres \
  backend/scripts/restore-drill.sh ascendra-db-<UTC time>.dump.age ascendra-backup.key
# 3. Delete the key file copy.
```

`restore-drill.sh` refuses a non-local `ADMIN_URL`. It checks the file's
sha256 and the manifest's against `checksums.json`, decrypts `manifest.json.age`
with the same key (in memory, never to disk), creates a new database, loads
`backend/scripts/ci/supabase-roles.sql` and Supabase's `extensions` schema
(uuid-ossp), decrypts with age straight into `pg_restore --no-owner
--no-privileges --schema=public` (no plaintext file), re-applies migration
071 (a dump holds no roles or grants: it re-creates `app_runtime` and the
privileges, as a real restore must), checks the number of
tables in `public` and the row counts of `app_users`, `attempts` and
`mastery` equal the manifest's, runs `npm run migrate -- --status` (must say
"Schema is current"), and drops the database (`KEEP_DB=1` keeps it, for step 5
below). It prints the restore time. A wrong key, a changed file or a count
mismatch fails it (counts must equal the manifest's exactly). The third and
fourth arguments name `checksums.json` and `manifest.json.age` if they are not
beside the dump. CI runs the same path on every pull request with a
throwaway key and database (`backend/scripts/ci/backup-drill-test.sh`, job
"backup-drill").

Pass when it prints `RESTORE DRILL PASSED`. Write the date, the manifest's
`encrypted_bytes` (`age -d -i ascendra-backup.key manifest.json.age | jq`), the
restore time and the manifest's `created_at` (the recovery point, which the
drill prints) in the drill log below.

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

# 3. The schema is what this commit needs, and levels match the rule. A dump
#    holds no roles or grants, so re-apply 071 first (it is safe to run twice).
cd backend
psql "$SCRATCH_URL/ascendra_restore" --single-transaction -f supabase/migrations/071_app_runtime_role.sql
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

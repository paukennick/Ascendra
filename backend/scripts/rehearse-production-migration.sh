#!/usr/bin/env bash
# HISTORICAL (retired 2026-11-10, REQ-214): kept as the record of how the
# 2026-11-07 release was rehearsed. It no longer runs in CI and is not valid
# for later releases: it applies every migration but undoes only 11-07's.
#
# Release 2026-11-07: rehearse the production migration, and its rollback,
# on local throwaway databases. Repeatable and CI-able (.github/workflows/ci.yml
# job "rehearsal"). Never touches a remote database: it refuses any ADMIN_URL
# that is not on localhost / 127.0.0.1.
#
# What it proves (docs/release-2026-11-07.md, "Rehearsal"):
#   A. PRODUCTION STATE: master @ c3e13ab's migrations 001-024 exactly as
#      master has them, then line B's 025/026/027 (already run in
#      production), the ledger rows production has (023-027 only), master's
#      own seed, and 3 accounts / 25 graded answers made through master's
#      own routes (scripts/rehearsal/master-smoke.ts populate).
#   B. FORWARD: baseline the ledger (scripts/release-2026-11-07-baseline-ledger.sql),
#      `migrate --status` lists exactly the release's new files, `--all`,
#      `--status` current with mastery drift 0, the batched recompute, the
#      release seed, `--status` again; 052's data moves checked.
#   C. BACKWARD COMPATIBILITY: master's routes (no-AI ones) against the
#      fully migrated database, as a pre-release and a new account.
#   D. ROLLBACK: scripts/rollback-release-2026-11-07.sql; the schema then
#      matches the production-state schema (apart from the enum values
#      Postgres cannot remove, listed), master's routes pass again, and
#      migrating forward again gets back to "Schema is current".
#   E. FRESH: an empty database, `--all`, `--status`, seed, `--status`.
#
# Usage (from anywhere in the repo):
#   ADMIN_URL=postgresql://postgres@localhost:55432/postgres \
#     backend/scripts/rehearse-production-migration.sh
# Env: ADMIN_URL (a superuser on a local cluster; default as above),
#      MASTER_REF (default c3e13ab), DB_PREFIX (default rehearse_20261107),
#      KEEP_DBS=1 to leave the databases for inspection.
# Needs: git (with MASTER_REF fetched), psql and pg_dump, backend/node_modules.

set -euo pipefail
export PGSSLMODE=disable
ADMIN_URL="${ADMIN_URL:-postgresql://postgres@localhost:55432/postgres}"
MASTER_REF="${MASTER_REF:-c3e13ab}"
DB_PREFIX="${DB_PREFIX:-rehearse_20261107}"
BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(git -C "$BACKEND" rev-parse --show-toplevel)"
MIGRATIONS="$BACKEND/supabase/migrations"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/rehearse-20261107.XXXXXX")"

case "$ADMIN_URL" in
  *@localhost[:/]*|*@127.0.0.1[:/]*) ;;
  *) echo "Refusing: ADMIN_URL must point at a local cluster (localhost/127.0.0.1)." >&2; exit 2 ;;
esac

db_url() { echo "${ADMIN_URL%/*}/$1"; }
PROD_DB="${DB_PREFIX}_prod"
FRESH_DB="${DB_PREFIX}_fresh"
PROD_URL="$(db_url "$PROD_DB")"
FRESH_URL="$(db_url "$FRESH_DB")"
psql_q() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

cleanup() {
  rm -rf "$WORK"
  if [[ "${KEEP_DBS:-0}" != 1 ]]; then
    psql_q "$ADMIN_URL" -c "drop database if exists $PROD_DB with (force)" -c "drop database if exists $FRESH_DB with (force)" || true
  fi
}
trap cleanup EXIT

step() { printf '\n=== %s\n' "$*"; }
fail() { echo "REHEARSAL FAILED: $*" >&2; exit 1; }
migrate() { (cd "$BACKEND" && DATABASE_URL="$1" npx tsx supabase/apply-migration.ts "$2"); }

# Supabase creates these roles in every project; B's 026 and the release's
# 052 revoke from them, so a plain Postgres needs them too (NOLOGIN: they
# can't be used to connect).
psql_q "$ADMIN_URL" -c "do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end \$\$"

# --- master's backend, as production runs it ---------------------------------
step "Extract master @ $MASTER_REF"
git -C "$REPO" rev-parse --verify --quiet "$MASTER_REF^{commit}" >/dev/null || fail "$MASTER_REF is not in this clone (fetch it)"
mkdir -p "$WORK/master"
git -C "$REPO" archive "$MASTER_REF" backend | tar -x -C "$WORK/master"
MASTER="$WORK/master/backend"
ln -s "$BACKEND/node_modules" "$MASTER/node_modules"
# Master's pool always asks for TLS (Supabase); this local cluster has none.
# The only change made to master's code: honour PGSSLMODE=disable.
sed -i 's/ssl: { rejectUnauthorized: false }/ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }/' \
  "$MASTER/lib/db.ts" "$MASTER/supabase/seed/seed.ts"
grep -q 'PGSSLMODE' "$MASTER/lib/db.ts" || fail "could not adapt master's lib/db.ts for a local database"
master_smoke() { (cd "$MASTER" && DATABASE_URL="$1" MASTER_BACKEND="$MASTER" npx tsx "$BACKEND/scripts/rehearsal/master-smoke.ts" "$2"); }

# --- A. production state ------------------------------------------------------
step "A. Build the production-state database ($PROD_DB)"
psql_q "$ADMIN_URL" -c "drop database if exists $PROD_DB with (force)" -c "create database $PROD_DB"
# Production's history: 001-022 pasted into the SQL editor; the runner (and
# its ledger) from 023 on, so the ledger table existed when B's 026 turned
# RLS on for every table. The ledger lists exactly 023-027.
ledger() { psql_q "$PROD_URL" -c "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now());
  insert into schema_migrations (filename) values ('$1') on conflict do nothing"; }
for f in $(ls "$MASTER/supabase/migrations" | LC_ALL=C sort); do
  [[ "$f" == 023_* ]] && ledger_started=1
  psql_q "$PROD_URL" -1 -f "$MASTER/supabase/migrations/$f" >/dev/null
  [[ -n "${ledger_started:-}" ]] && ledger "$f"
done
echo "  master's $(ls "$MASTER/supabase/migrations" | wc -l) migrations applied"
for f in 025_lesson_choice_feedback.sql 026_enable_rls.sql 027_legal_acceptances_and_content_reports.sql; do
  # The release keeps line B's files byte for byte (production recorded
  # them); checked when B's branch is in this clone.
  if git -C "$REPO" rev-parse --verify --quiet origin/legal/comptia-retitle >/dev/null; then
    cmp -s <(git -C "$REPO" show "origin/legal/comptia-retitle:backend/supabase/migrations/$f") "$MIGRATIONS/$f" \
      || fail "$f differs from line B's file"
  fi
  psql_q "$PROD_URL" -1 -f "$MIGRATIONS/$f" >/dev/null
  ledger "$f"
done
psql_q "$PROD_URL" -At -c "select '  ledger: '||string_agg(filename, ', ' order by filename) from schema_migrations"
(cd "$MASTER" && DATABASE_URL="$PROD_URL" npx tsx supabase/seed/seed.ts >"$WORK/master-seed.log" 2>&1) || { tail -20 "$WORK/master-seed.log"; fail "master's seed"; }
echo "  master's seed done"
master_smoke "$PROD_URL" populate
pg_dump --schema-only --no-owner --no-privileges "$PROD_URL" >"$WORK/prod-before.sql"
enums() { psql_q "$PROD_URL" -At -c "select t.typname||'.'||e.enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid order by 1"; }
enums >"$WORK/enums-before.txt"
# The runbook's pre-deploy backup, exactly as documented (public schema only:
# Supabase's own schemas are not the app's).
pg_dump -Fc --no-owner --no-privileges --schema=public "$PROD_URL" -f "$WORK/pre-release.dump"
counts() { psql_q "$PROD_URL" -At -c "select (select count(*) from app_users)||' accounts, '||(select count(*) from attempts)||' attempts, '||(select count(*) from mastery)||' mastery rows, '||(select count(*) from lesson_content)||' lessons'"; }
counts >"$WORK/counts-before.txt"
psql_q "$PROD_URL" -At -c "select 'accounts '||count(*) from app_users" -c "select 'attempts '||count(*) from attempts" -c "select 'mastery rows '||count(*) from mastery"

# --- B. forward ---------------------------------------------------------------
step "B. Forward: baseline the ledger, --status, --all"
psql_q "$PROD_URL" -f "$BACKEND/scripts/release-2026-11-07-baseline-ledger.sql"
set +e
migrate "$PROD_URL" --status >"$WORK/status-before.txt" 2>&1
status_rc=$?
set -e
cat "$WORK/status-before.txt"
[[ $status_rc -eq 2 ]] || fail "--status before migrating should exit 2 (missing objects), got $status_rc"
expected="$(ls "$MIGRATIONS" | grep '\.sql$' | LC_ALL=C sort | LC_ALL=C awk '$0 > "027_legal_acceptances_and_content_reports.sql"')"
listed="$(sed -n '/^Not in the schema_migrations ledger/,$p' "$WORK/status-before.txt" | sed -n 's/^  \(.*\.sql\)$/\1/p' | LC_ALL=C sort)"
[[ "$listed" == "$expected" ]] || { diff <(echo "$expected") <(echo "$listed") || true; fail "--status should list exactly the release's new files"; }
echo "  --status lists exactly the $(echo "$expected" | wc -l) new files ($(echo "$expected" | head -1) .. $(echo "$expected" | tail -1))"
start=$(date +%s)
migrate "$PROD_URL" --all | sed 's/^/  /'
echo "  --all took $(( $(date +%s) - start )) s"
migrate "$PROD_URL" --status | tee "$WORK/status-after.txt" | sed 's/^/  /'
grep -q '^Schema is current' "$WORK/status-after.txt" || fail "schema not current after --all"
grep -q 'every stored level matches' "$WORK/status-after.txt" || fail "mastery drift after --all"
psql_q "$PROD_URL" -c "call recompute_mastery_batched();"
migrate "$PROD_URL" --status >"$WORK/s.txt"; grep -q 'every stored level matches' "$WORK/s.txt" || fail "mastery drift after the batched recompute"
(cd "$BACKEND" && DATABASE_URL="$PROD_URL" npx tsx supabase/seed/seed.ts >"$WORK/release-seed.log" 2>&1) || { tail -20 "$WORK/release-seed.log"; fail "release seed"; }
migrate "$PROD_URL" --status | tee "$WORK/status-seeded.txt" | sed 's/^/  /'
grep -q '^Schema is current' "$WORK/status-seeded.txt" || fail "schema not current after the release seed"
grep -q 'every stored level matches' "$WORK/status-seeded.txt" || fail "mastery drift after the release seed"
psql_q "$PROD_URL" -At -c "select case when count(*) = 1 then '  052 moved line B''s choice feedback into fade_option_reasons' else 'MISSING' end
                             from lesson_content where fade_option_reasons is not null and model = 'rehearsal'" | tee "$WORK/052.txt"
grep -q 'moved' "$WORK/052.txt" || fail "052 did not fold *_choice_feedback into *_option_reasons"
psql_q "$PROD_URL" -At -c "select '  tables without RLS: '||count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                             where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity"
psql_q "$PROD_URL" -At -c "select '  tables anon or authenticated can read: '||count(*) from information_schema.role_table_grants
                             where table_schema = 'public' and grantee in ('anon', 'authenticated')"

# --- C. old code on the new schema ---------------------------------------------
step "C. Backward compatibility: master's routes on the migrated database"
master_smoke "$PROD_URL" smoke

# --- D. rollback ----------------------------------------------------------------
step "D. Rollback to the pre-release schema"
psql_q "$PROD_URL" -f "$BACKEND/scripts/rollback-release-2026-11-07.sql"
pg_dump --schema-only --no-owner --no-privileges "$PROD_URL" >"$WORK/prod-after-rollback.sql"
# Postgres cannot drop an enum value; the release's added values stay
# (old code never writes them). Everything else must match exactly.
strip() { grep -v -E '^(--|SET |SELECT pg_catalog.set_config|\\(un)?restrict )' "$1" | sed '/^$/d'; }
normalize() { grep -v -E '^(--|SET |SELECT pg_catalog.set_config|\\(un)?restrict )' "$1" | sed '/^$/d' | awk '
  /^CREATE TYPE public\.[a-z_]+ AS ENUM \($/ { skip = 1; print "<enum>"; next }
  skip && /^\);$/ { skip = 0; next }
  !skip { print }'; }
if ! diff <(normalize "$WORK/prod-before.sql") <(normalize "$WORK/prod-after-rollback.sql") >"$WORK/rollback.diff"; then
  head -60 "$WORK/rollback.diff"
  fail "schema after rollback differs from the production-state schema"
fi
echo "  schema matches the production-state schema (enum types compared by name only)"
LC_ALL=C comm -13 <(LC_ALL=C sort "$WORK/enums-before.txt") <(enums | LC_ALL=C sort) | sed 's/^/  enum value left in place (Postgres cannot drop one): /'
master_smoke "$PROD_URL" smoke
step "D1. Full restore from the pre-deploy pg_dump (after the rollback script)"
pg_restore --clean --if-exists --no-owner --no-privileges --schema=public -d "$PROD_URL" "$WORK/pre-release.dump" 2>"$WORK/restore.log" \
  || { grep -v 'NOTICE' "$WORK/restore.log" | head -20; fail "pg_restore"; }
# A restored CHECK on a varchar column deparses its casts differently
# ('a'::varchar)::text vs ARRAY['a'::varchar]::text[] -- same constraint);
# casts and parentheses are dropped before comparing.
uncast() { sed -E 's/::(character varying|text)(\[\])?//g; s/[()]//g'; }
if ! diff <(normalize "$WORK/prod-before.sql" | uncast) <(pg_dump --schema-only --no-owner --no-privileges "$PROD_URL" | normalize /dev/stdin | uncast) >"$WORK/restore.diff"; then
  head -40 "$WORK/restore.diff"; fail "schema after the restore differs from the production-state schema"
fi
[[ "$(counts)" == "$(cat "$WORK/counts-before.txt")" ]] || fail "row counts after the restore ($(counts)) differ from before ($(cat "$WORK/counts-before.txt"))"
echo "  restored: schema and row counts match the backup ($(counts))"
LC_ALL=C comm -13 <(LC_ALL=C sort "$WORK/enums-before.txt") <(enums | LC_ALL=C sort) | sed 's/^/  enum value still present after restore: /'
master_smoke "$PROD_URL" smoke

step "D2. Forward again after the rollback"
psql_q "$PROD_URL" -f "$BACKEND/scripts/release-2026-11-07-baseline-ledger.sql"
migrate "$PROD_URL" --all >/dev/null
# The seed fills what the rollback dropped (e.g. retired_at on the CS0-003 units).
(cd "$BACKEND" && DATABASE_URL="$PROD_URL" npx tsx supabase/seed/seed.ts >"$WORK/reseed.log" 2>&1) || { tail -20 "$WORK/reseed.log"; fail "seed after re-applying"; }
migrate "$PROD_URL" --status >"$WORK/s.txt"; grep -q '^Schema is current' "$WORK/s.txt" || fail "re-applying after the rollback did not reach a current schema"
echo "  re-applied: schema current"

# --- E. fresh -------------------------------------------------------------------
step "E. Fresh empty database ($FRESH_DB)"
psql_q "$ADMIN_URL" -c "drop database if exists $FRESH_DB with (force)" -c "create database $FRESH_DB"
migrate "$FRESH_URL" --all >/dev/null
migrate "$FRESH_URL" --status >"$WORK/s.txt"; grep -q '^Schema is current' "$WORK/s.txt" || fail "fresh: schema not current after --all"
(cd "$BACKEND" && DATABASE_URL="$FRESH_URL" npx tsx supabase/seed/seed.ts >"$WORK/fresh-seed.log" 2>&1) || { tail -20 "$WORK/fresh-seed.log"; fail "fresh seed"; }
migrate "$FRESH_URL" --status | tee "$WORK/fresh-status.txt" | sed 's/^/  /'
grep -q '^Schema is current' "$WORK/fresh-status.txt" || fail "fresh: schema not current after seed"
# Same schema either way, enum values included (casts deparsed differently
# after D1's restore are ignored, as there).
if ! diff <(pg_dump --schema-only --no-owner --no-privileges "$FRESH_URL" | strip /dev/stdin | uncast) \
          <(pg_dump --schema-only --no-owner --no-privileges "$PROD_URL" | strip /dev/stdin | uncast) >"$WORK/fresh-vs-prod.diff"; then
  head -40 "$WORK/fresh-vs-prod.diff"
  fail "a fresh database and the migrated production-state database have different schemas"
fi
echo "  fresh and migrated-production schemas are identical, enum values included"

step "REHEARSAL PASSED"

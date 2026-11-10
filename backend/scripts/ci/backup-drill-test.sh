#!/usr/bin/env bash
# REQ-200: end-to-end test of the nightly backup and its restore drill, on
# throwaway local databases with a throwaway age keypair:
#   dump -> encrypt (scripts/db-backup.sh) -> decrypt -> restore -> verify
#   (scripts/restore-drill.sh), plus the refusals that keep a public-repo
#   artifact safe and a bad backup loud.
#
# The source database is laid out like Supabase (roles, uuid-ossp in schema
# `extensions` on the search_path), built with every migration over a small
# synthetic history (scripts/ci/synthetic-history.sql), so the dump has real
# rows in app_users, attempts and mastery.
#
# Usage: ADMIN_URL=postgres://postgres:postgres@localhost:5432/postgres \
#          backend/scripts/ci/backup-drill-test.sh
# Refuses a non-local ADMIN_URL. Run in CI by .github/workflows/ci.yml job
# "backup-drill". Needs age, jq, psql/pg_dump/pg_restore (pg_dump >= server),
# node and backend/node_modules.

set +x
set -euo pipefail
export PGSSLMODE=disable
ADMIN_URL="${ADMIN_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
case "$ADMIN_URL" in
  *@localhost[:/]*|*@127.0.0.1[:/]*) ;;
  *) echo "Refusing: ADMIN_URL must point at a local cluster." >&2; exit 2 ;;
esac
BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$BACKEND/scripts"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/backup-drill.XXXXXX")"
SRC_DB="backup_drill_src_$$"
SRC_URL="${ADMIN_URL%/*}/$SRC_DB"
psql_q() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }
cleanup() {
  rm -rf "$WORK"
  psql_q "$ADMIN_URL" -c "drop database if exists $SRC_DB with (force)" 2>/dev/null || true
}
trap cleanup EXIT
step() { printf '\n=== %s\n' "$*"; }
fail() { echo "BACKUP DRILL TEST FAILED: $*" >&2; exit 1; }
pass=0
ok() { pass=$((pass + 1)); echo "ok $pass - $*"; }
# Expects the command to fail and its output to contain a phrase.
refuses() {
  local phrase="$1"; shift
  local out
  if out="$("$@" 2>&1)"; then echo "$out"; fail "expected a refusal ($phrase), but it succeeded"; fi
  grep -qF -- "$phrase" <<<"$out" || { echo "$out"; fail "refused, but not with \"$phrase\""; }
}

step "Throwaway keypair"
age-keygen -o "$WORK/test.key" 2>/dev/null
RECIPIENT="$(age-keygen -y "$WORK/test.key")"
age-keygen -o "$WORK/other.key" 2>/dev/null

step "Source database, laid out like Supabase"
psql_q "$ADMIN_URL" -c "create database $SRC_DB"
psql_q "$SRC_URL" -f "$SCRIPTS/ci/supabase-roles.sql"
psql_q "$SRC_URL" -c 'create schema if not exists extensions' \
  -c 'create extension if not exists "uuid-ossp" with schema extensions' \
  -c "alter database $SRC_DB set search_path = \"\$user\", public, extensions"
migrate() { (cd "$BACKEND" && DATABASE_URL="$SRC_URL" npm run -s migrate -- "$@"); }
LC_COLLATE=C  # glob in C order, as the migration runner sorts
for path in "$BACKEND"/supabase/migrations/*.sql; do
  f="${path##*/}"
  # shellcheck disable=SC2071 # a string comparison is intended: names before 029
  [[ "$f" > "029" ]] && break
  migrate "$f" >/dev/null
done
psql_q "$SRC_URL" -v learners=40 -v per_learner=30 -f "$SCRIPTS/ci/synthetic-history.sql" >/dev/null
migrate --all >/dev/null
users="$(psql_q "$SRC_URL" -At -c 'select count(*) from app_users')"
attempts="$(psql_q "$SRC_URL" -At -c 'select count(*) from attempts')"
mastery="$(psql_q "$SRC_URL" -At -c 'select count(*) from mastery')"
(( users > 0 && attempts > 0 && mastery > 0 )) || fail "the source has no rows to back up"
echo "source: $users app_users, $attempts attempts, $mastery mastery"

step "Refusals before anything is dumped"
refuses "DATABASE_URL is not set" env -u DATABASE_URL BACKUP_AGE_RECIPIENT="$RECIPIENT" OUT_DIR="$WORK/r1" "$SCRIPTS/db-backup.sh"
refuses "BACKUP_AGE_RECIPIENT is not set" env -u BACKUP_AGE_RECIPIENT DATABASE_URL="$SRC_URL" OUT_DIR="$WORK/r2" "$SCRIPTS/db-backup.sh"
refuses "not an age public key" env DATABASE_URL="$SRC_URL" BACKUP_AGE_RECIPIENT="$(grep '^AGE-SECRET-KEY-' "$WORK/test.key")" OUT_DIR="$WORK/r3" "$SCRIPTS/db-backup.sh"
for d in r1 r2 r3; do [[ -z "$(ls -A "$WORK/$d" 2>/dev/null)" ]] || fail "a refused run left files in $d"; done
ok "missing connection, missing recipient and a private key as recipient are refused, nothing written"

step "Too small fails loudly (the default 1 MB floor on a small test database)"
refuses "under the 1048576-byte minimum" env DATABASE_URL="$SRC_URL" BACKUP_AGE_RECIPIENT="$RECIPIENT" OUT_DIR="$WORK/small" "$SCRIPTS/db-backup.sh"
[[ -z "$(ls -A "$WORK/small" 2>/dev/null)" ]] || fail "a too-small backup was left behind"
ok "a backup under the minimum fails and is removed"

step "Backup: dump -> encrypt"
out="$(DATABASE_URL="$SRC_URL" BACKUP_AGE_RECIPIENT="$RECIPIENT" OUT_DIR="$WORK/out" MIN_BACKUP_BYTES=10000 \
  "$SCRIPTS/db-backup.sh" 2>&1)" || { echo "$out"; fail "db-backup.sh failed"; }
echo "$out"
name="$(tail -n1 <<<"$out")"
BACKUP="$WORK/out/$name"
[[ -f "$BACKUP" ]] || fail "no backup file named on the last line"
ok "backup written"
grep -qF -- "$SRC_URL" <<<"$out" && fail "the connection string was printed"
grep -qF -- "postgres:postgres@" <<<"$out" && fail "credentials were printed"
ok "no connection string or credentials in the output"
[[ "$(find "$WORK/out" -mindepth 1 -printf '%f\n' | LC_ALL=C sort | tr '\n' ' ')" == "$name manifest.json " ]] \
  || fail "unexpected files beside the backup: $(ls -A "$WORK/out")"
ok "only the .age file and manifest.json were written (no plaintext dump)"
[[ "$(head -c 21 "$BACKUP")" == "age-encryption.org/v1" ]] || fail "not an age file"
pg_restore --list "$BACKUP" >/dev/null 2>&1 && fail "pg_restore can read the backup without the key"
grep -qa 'PGDMP' "$BACKUP" && fail "the custom-format dump header is visible in the backup"
age --decrypt --identity "$WORK/other.key" "$BACKUP" >/dev/null 2>&1 && fail "another key decrypted the backup"
ok "unreadable without the key: not a dump to pg_restore, and another age key cannot decrypt it"

M="$WORK/out/manifest.json"
jq -e --arg n "$name" --argjson u "$users" --argjson a "$attempts" --argjson m "$mastery" \
  '.file == $n and .row_counts == {app_users: $u, attempts: $a, mastery: $m}
   and (.public_table_count > 30) and (.sha256 | test("^[0-9a-f]{64}$"))
   and (.encrypted_bytes > 0) and (.server_version | length > 0) and (.created_at | length > 0)' "$M" >/dev/null \
  || { cat "$M"; fail "manifest does not record the expected counts and checksum"; }
[[ "$(jq -r '.sha256' "$M")" == "$(sha256sum "$BACKUP" | cut -d' ' -f1)" ]] || fail "manifest sha256 is wrong"
[[ "$(jq -c '[paths(scalars)] | map(join(".")) | sort' "$M")" == \
   '["created_at","dump","dump_seconds","encrypted_bytes","encryption","file","format","pg_dump_major","public_table_count","row_counts.app_users","row_counts.attempts","row_counts.mastery","server_version","sha256"]' ]] \
  || { cat "$M"; fail "manifest has fields beyond the allowed list"; }
grep -q '@' "$M" && fail "manifest contains an @ (an email address?)"
ok "manifest: exact fields, counts and sha256 match, no user data"

step "Restore drill: decrypt -> restore -> verify"
ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$M" \
  || fail "the restore drill did not pass on a good backup"
ok "restore drill passed"

step "The drill catches a wrong key, a changed file and a count mismatch"
refuses "age could not decrypt" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/other.key" "$M"
ok "wrong key fails"
jq '.row_counts.attempts += 1' "$M" > "$WORK/bad-count.json"
refuses "attempts has $attempts rows, manifest says $((attempts + 1))" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$WORK/bad-count.json"
ok "a row-count mismatch fails"
jq '.public_table_count += 1' "$M" > "$WORK/bad-tables.json"
refuses "table count" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$WORK/bad-tables.json"
ok "a table-count mismatch fails"
cp "$BACKUP" "$WORK/tampered.age"; printf 'x' >> "$WORK/tampered.age"
refuses "does not match the manifest" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$WORK/tampered.age" "$WORK/test.key" "$M"
ok "a changed backup file fails the sha256 check"
refuses "must point at a local cluster" env ADMIN_URL="postgres://u:p@db.example.com:5432/postgres" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$M"
ok "a non-local target is refused"
left="$(psql_q "$ADMIN_URL" -At -c "select count(*) from pg_database where datname like 'restore_drill_%'")"
[[ "$left" == 0 ]] || fail "$left restore_drill_ database(s) left behind"
ok "every drill database was dropped"

echo
echo "BACKUP DRILL TEST PASSED: $pass checks."

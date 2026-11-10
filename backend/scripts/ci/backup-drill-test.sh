#!/usr/bin/env bash
# REQ-200: end-to-end test of the nightly backup and its restore drill, on
# throwaway local databases with a throwaway age keypair:
#   dump -> encrypt (scripts/db-backup.sh) -> decrypt -> restore -> verify
#   (scripts/restore-drill.sh), plus the refusals that keep a public-repo
#   artifact safe and a bad backup loud. The manifest (counts, versions) is
#   inside manifest.json.age; the only plaintext beside the dump is
#   checksums.json, and this test fails if any count or table name shows up
#   in a plaintext file or in the backup's output.
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
[[ "$(find "$WORK/out" -mindepth 1 -printf '%f\n' | LC_ALL=C sort | tr '\n' ' ')" == "$name checksums.json manifest.json.age " ]] \
  || fail "unexpected files beside the backup: $(ls -A "$WORK/out")"
ok "only the two .age files and checksums.json were written (no plaintext dump or manifest)"
[[ "$(head -c 21 "$BACKUP")" == "age-encryption.org/v1" ]] || fail "not an age file"
pg_restore --list "$BACKUP" >/dev/null 2>&1 && fail "pg_restore can read the backup without the key"
grep -qa 'PGDMP' "$BACKUP" && fail "the custom-format dump header is visible in the backup"
age --decrypt --identity "$WORK/other.key" "$BACKUP" >/dev/null 2>&1 && fail "another key decrypted the backup"
ok "unreadable without the key: not a dump to pg_restore, and another age key cannot decrypt it"

CK="$WORK/out/checksums.json"
MAN_AGE="$WORK/out/manifest.json.age"
[[ "$(head -c 21 "$MAN_AGE")" == "age-encryption.org/v1" ]] || fail "manifest.json.age is not an age file"
age --decrypt --identity "$WORK/other.key" "$MAN_AGE" >/dev/null 2>&1 && fail "another key decrypted the manifest"
# The manifest is read into a variable and piped, never written out in plaintext.
MJSON="$(age --decrypt --identity "$WORK/test.key" "$MAN_AGE")" || fail "the test key could not decrypt manifest.json.age"
mj() { printf '%s' "$MJSON" | jq "$@"; }
mj -e --arg n "$name" --argjson u "$users" --argjson a "$attempts" --argjson m "$mastery" \
  '.format == 2 and .file == $n and .row_counts == {app_users: $u, attempts: $a, mastery: $m}
   and (.public_table_count > 30) and (.sha256 | test("^[0-9a-f]{64}$"))
   and (.encrypted_bytes > 0) and (.server_version | length > 0) and (.created_at | length > 0)' >/dev/null \
  || { echo "$MJSON" | jq -c 'del(.row_counts)'; fail "the decrypted manifest does not record the expected counts and checksum"; }
[[ "$(mj -r '.sha256')" == "$(sha256sum "$BACKUP" | cut -d' ' -f1)" ]] || fail "manifest sha256 is wrong"
[[ "$(mj -c '[paths(scalars)] | map(join(".")) | sort')" == \
   '["created_at","dump","dump_seconds","encrypted_bytes","encryption","file","format","pg_dump_major","public_table_count","row_counts.app_users","row_counts.attempts","row_counts.mastery","server_version","sha256"]' ]] \
  || fail "the decrypted manifest has fields beyond the allowed list"
grep -q '@' <<<"$MJSON" && fail "manifest contains an @ (an email address?)"
ok "manifest.json.age: decrypts with the key only, exact fields, counts and sha256 match, no user data"

# --- Nothing about the database is readable without the key. ---
# Plaintext side: checksums.json holds a format number and two sha256 values,
# nothing else (the dump's own name is the timestamp already in the artifact name).
jq -e --arg n "$name" '
    (keys == ["format", "sha256"]) and .format == 2
    and (.sha256 | keys == ([$n, "manifest.json.age"] | sort))
    and (.sha256 | map(test("^[0-9a-f]{64}$")) | all)' "$CK" >/dev/null \
  || { cat "$CK"; fail "checksums.json holds more than a format and two sha256 values"; }
[[ "$(jq -r '.sha256[$n]' --arg n "$name" "$CK")" == "$(sha256sum "$BACKUP" | cut -d' ' -f1)" ]] || fail "checksums.json: dump sha256 is wrong"
[[ "$(jq -r '.sha256["manifest.json.age"]' "$CK")" == "$(sha256sum "$MAN_AGE" | cut -d' ' -f1)" ]] || fail "checksums.json: manifest sha256 is wrong"
# No count, table name or version in any plaintext file or in the run's output
# (the Actions log is public): scan checksums.json and the captured output for
# every key name and for each actual count as a whole word.
tables_n="$(mj -r '.public_table_count')"; sv="$(mj -r '.server_version')"
leak_words='app_users|attempts|mastery|row_counts|public_table_count|server_version|tables in public|PostgreSQL'
for count in "$users" "$attempts" "$mastery" "$tables_n"; do
  [[ "$count" =~ ^[0-9]+$ ]] || fail "test setup: count '$count' is not a number"
done
printf '%s\n' "$out" > "$WORK/run-output.txt"
for f in "$CK" "$WORK/run-output.txt"; do
  grep -Eqi -- "$leak_words" "$f" && fail "$f names a table, a count field or the server"
  for count in "$users" "$attempts" "$mastery" "$tables_n"; do
    grep -qw -- "$count" "$f" && fail "$f contains the count $count"
  done
  grep -qF -- "$sv" "$f" && fail "$f contains the server version"
done
# Ciphertext side: the key names must not appear in the encrypted files either.
grep -Eqai -- 'row_counts|public_table_count|server_version' "$MAN_AGE" && fail "manifest.json.age shows field names without the key"
ok "plaintext side (checksums.json, the run's output) holds no counts, table names or versions"

step "Restore drill: decrypt -> restore -> verify"
ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$CK" "$MAN_AGE" \
  || fail "the restore drill did not pass on a good backup"
ok "restore drill passed"

step "The drill catches a wrong key, a changed file and a count mismatch"
refuses "age could not decrypt" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/other.key" "$CK" "$MAN_AGE"
ok "wrong key fails"
# A changed manifest is re-encrypted to the same key straight from a pipe, then
# checksums.json is pointed at it, so only the check under test can fail.
rebuild() { # $1 = jq filter on the manifest, $2 = suffix for the new files
  mj "$1" | age --encrypt --recipient "$RECIPIENT" --output "$WORK/man-$2.age"
  jq --arg h "$(sha256sum "$WORK/man-$2.age" | cut -d' ' -f1)" '.sha256["manifest.json.age"] = $h' "$CK" > "$WORK/ck-$2.json"
}
rebuild '.row_counts.attempts += 1' count
refuses "attempts has $attempts rows, manifest says $((attempts + 1))" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$WORK/ck-count.json" "$WORK/man-count.age"
ok "a row-count mismatch fails"
rebuild '.public_table_count += 1' tables
refuses "table count" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$WORK/ck-tables.json" "$WORK/man-tables.age"
ok "a table-count mismatch fails"
rebuild '.sha256 = ("0" * 64)' other
refuses "written for a different dump" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$WORK/ck-other.json" "$WORK/man-other.age"
ok "a manifest that belongs to a different dump fails"
cp "$BACKUP" "$WORK/tampered.age"; printf 'x' >> "$WORK/tampered.age"
jq --arg n "tampered.age" --arg h "$(jq -r --arg n "$name" '.sha256[$n]' "$CK")" '.sha256 = {($n): $h, "manifest.json.age": .sha256["manifest.json.age"]}' "$CK" > "$WORK/ck-tampered.json"
refuses "does not match checksums.json" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$WORK/tampered.age" "$WORK/test.key" "$WORK/ck-tampered.json" "$MAN_AGE"
ok "a changed backup file fails the sha256 check"
cp "$MAN_AGE" "$WORK/tampered-man.age"; printf 'x' >> "$WORK/tampered-man.age"
refuses "does not match checksums.json" env ADMIN_URL="$ADMIN_URL" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$CK" "$WORK/tampered-man.age"
ok "a changed manifest file fails the sha256 check"
refuses "must point at a local cluster" env ADMIN_URL="postgres://u:p@db.example.com:5432/postgres" "$SCRIPTS/restore-drill.sh" "$BACKUP" "$WORK/test.key" "$CK" "$MAN_AGE"
ok "a non-local target is refused"
left="$(psql_q "$ADMIN_URL" -At -c "select count(*) from pg_database where datname like 'restore_drill_%'")"
[[ "$left" == 0 ]] || fail "$left restore_drill_ database(s) left behind"
ok "every drill database was dropped"

echo
echo "BACKUP DRILL TEST PASSED: $pass checks."

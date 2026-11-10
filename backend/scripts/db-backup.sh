#!/usr/bin/env bash
# REQ-200: take one encrypted logical backup of the database.
#
# Streams `pg_dump --format=custom` of the whole database (roles are never in
# a pg_dump; --no-owner --no-privileges) straight into `age`, encrypted to a
# public key. The plaintext dump never touches the disk. Next to it, writes
# manifest.json.age: the manifest (sizes, the dump's sha256, the server
# version, the number of tables in schema public and the row counts of
# app_users, attempts and mastery -- counts only, no user data), encrypted to
# the same recipient and piped straight into age, so it is never plaintext on
# disk either. The counts and the dump come from the same snapshot
# (pg_export_snapshot), so a restore must match them exactly.
#
# The repository is public, so what stays readable beside the two encrypted
# files is only checksums.json: a format number and the sha256 of each
# encrypted file (to catch a corrupt or swapped download before decrypting).
# No counts, no table names, no versions, and none of them are printed to
# the log either.
#
# Used by .github/workflows/db-backup.yml (nightly, production) and by
# scripts/ci/backup-drill-test.sh (CI, a throwaway local database).
# docs/operations-runbook.md "Backups" has the setup; restore with
# scripts/restore-drill.sh.
#
# Env:
#   DATABASE_URL           required. Never printed.
#   BACKUP_AGE_RECIPIENT   required. The age public key (age1...).
#   OUT_DIR                where to write the two .age files and checksums.json
#                          (default: current directory; created if missing).
#   MIN_BACKUP_BYTES       fail if the encrypted file is smaller (default
#                          1048576 = 1 MB; production is about 29 MB).
#   PG_BIN                 directory holding pg_dump/psql (default: PATH).
# Prints the backup file name as the last line of stdout. Exit 0 only when
# the file exists, is at least MIN_BACKUP_BYTES, and the encrypted manifest and
# checksums.json are written.

set +x
set -euo pipefail

fail() { echo "BACKUP FAILED: $*" >&2; exit 1; }

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set; refusing to run."
[[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] || fail "BACKUP_AGE_RECIPIENT is not set; refusing to run (only the public key is needed)."
# An X25519 age recipient is "age1" plus 58 bech32 characters. Anything else
# (a private key pasted by mistake starts with AGE-SECRET-KEY-) is refused,
# and its value is not echoed.
[[ "$BACKUP_AGE_RECIPIENT" =~ ^age1[02-9ac-hj-np-z]{58}$ ]] \
  || fail "BACKUP_AGE_RECIPIENT is not an age public key (expected age1 followed by 58 characters)."

MIN_BACKUP_BYTES="${MIN_BACKUP_BYTES:-1048576}"
[[ "$MIN_BACKUP_BYTES" =~ ^[0-9]+$ ]] || fail "MIN_BACKUP_BYTES must be a whole number of bytes."
OUT_DIR="${OUT_DIR:-.}"
PG_BIN="${PG_BIN:-}"
pg() { if [[ -n "$PG_BIN" ]]; then "$PG_BIN/$1" "${@:2}"; else "$@"; fi; }

command -v age >/dev/null || fail "age is not installed."
command -v jq >/dev/null || fail "jq is not installed."
command -v sha256sum >/dev/null || fail "sha256sum is not installed."

mkdir -p "$OUT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="ascendra-db-$stamp.dump.age"
out="$OUT_DIR/$name"
[[ ! -e "$out" ]] || fail "$out already exists."

# Remove a partial or rejected backup on any failure, so nothing half-made is
# uploaded. The file is ciphertext, so a plain rm is enough.
ok=0
cleanup() {
  local rc=$?
  if [[ "$ok" != 1 ]]; then rm -f "$out" "$OUT_DIR/manifest.json.age" "$OUT_DIR/checksums.json"; fi
  if [[ -n "${SNAP_PID:-}" ]]; then kill "$SNAP_PID" 2>/dev/null || true; fi
  exit "$rc"
}
trap cleanup EXIT

# pg_dump must be at least the server's major version.
client_major="$(pg pg_dump --version | sed -E 's/^pg_dump \(PostgreSQL\) ([0-9]+).*/\1/')"
[[ "$client_major" =~ ^[0-9]+$ ]] || fail "could not read pg_dump's version."

# One session holds a repeatable-read snapshot open; the counts are read in
# it and pg_dump reads the same snapshot, so they describe the same data.
coproc SNAP { pg psql "$DATABASE_URL" -X -q -A -t -v ON_ERROR_STOP=1 2>&1; }
# bash sets SNAP_PID for the coprocess; cleanup() kills it on failure.
ask() {
  # One query, one line back. A query that errors makes psql exit, and the
  # read then fails instead of hanging.
  send "$1"
  local line
  IFS= read -r -t 120 line <&"${SNAP[0]}" || fail "the database session ended unexpectedly (check the connection secret)."
  [[ "$line" != ERROR:* && "$line" != psql:* && "$line" != FATAL:* ]] || fail "query failed: ${line%%DETAIL*}"
  printf '%s' "$line"
}
# psql -q prints no BEGIN/COMMIT tags, so these are sent without a read.
send() { printf '%s\n' "$1" >&"${SNAP[1]}"; }
send "begin isolation level repeatable read read only;"
server_version="$(ask "select current_setting('server_version');")"
server_major="$(ask "select current_setting('server_version_num')::int / 10000;")"
[[ "$server_major" =~ ^[0-9]+$ ]] || fail "could not read the server version."
(( client_major >= server_major )) || fail "pg_dump $client_major is older than the server ($server_major); install a newer client."
snapshot="$(ask "select pg_export_snapshot();")"
[[ "$snapshot" =~ ^[0-9A-Fa-f-]+$ ]] || fail "could not export a snapshot."
table_count="$(ask "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p');")"
declare -A rows
for t in app_users attempts mastery; do
  rows[$t]="$(ask "select count(*) from public.$t;")"
  [[ "${rows[$t]}" =~ ^[0-9]+$ ]] || fail "could not count public.$t."
done

# Nothing about the database (versions, table or row counts) goes to the log:
# this repository is public and so are its Actions logs.
echo "Dumping and encrypting."
start=$(date +%s)
pg pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges \
  --snapshot="$snapshot" \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$out"
secs=$(( $(date +%s) - start ))

send "commit;"
send '\q'
wait "$SNAP_PID" 2>/dev/null || true
SNAP_PID=""

[[ -f "$out" ]] || fail "no backup file was written."
size="$(stat -c %s "$out")"
(( size >= MIN_BACKUP_BYTES )) || fail "backup is $size bytes, under the $MIN_BACKUP_BYTES-byte minimum: the dump is empty or the wrong database."
head -c 21 "$out" | grep -q '^age-encryption.org/v1' || fail "the output is not an age file."
sha="$(sha256sum "$out" | cut -d' ' -f1)"

# The manifest goes from jq straight into age: no plaintext copy on disk.
manifest_out="$OUT_DIR/manifest.json.age"
jq -n \
  --arg file "$name" --argjson size "$size" --arg sha "$sha" \
  --arg sv "$server_version" --argjson pgd "$client_major" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson secs "$secs" \
  --argjson tables "$table_count" \
  --argjson users "${rows[app_users]}" --argjson attempts "${rows[attempts]}" --argjson mastery "${rows[mastery]}" \
  '{format: 2, file: $file, encrypted_bytes: $size, sha256: $sha, encryption: "age (X25519)",
    dump: "pg_dump --format=custom --no-owner --no-privileges (whole database)",
    pg_dump_major: $pgd, server_version: $sv, created_at: $ts, dump_seconds: $secs,
    public_table_count: $tables,
    row_counts: {app_users: $users, attempts: $attempts, mastery: $mastery}}' \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$manifest_out"
[[ -s "$manifest_out" ]] || fail "the encrypted manifest was not written."
head -c 21 "$manifest_out" | grep -q '^age-encryption.org/v1' || fail "the manifest output is not an age file."
manifest_sha="$(sha256sum "$manifest_out" | cut -d' ' -f1)"

# The only plaintext: a format number and the hash of each encrypted file.
jq -n --arg dump "$name" --arg dsha "$sha" --arg msha "$manifest_sha" \
  '{format: 2, sha256: {($dump): $dsha, "manifest.json.age": $msha}}' \
  > "$OUT_DIR/checksums.json"

ok=1
echo "Backup written; sha256 $sha"
echo "$name"

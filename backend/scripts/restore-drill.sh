#!/usr/bin/env bash
# REQ-200: restore drill for a nightly backup (.github/workflows/db-backup.yml).
#
# Given the downloaded .age file, the age private key file and the backup's
# manifest.json, this:
#   1. checks the file's sha256 against the manifest (before decrypting);
#   2. creates a new, empty database on a LOCAL Postgres, loads
#      scripts/ci/supabase-roles.sql and Supabase's `extensions` schema
#      (uuid-ossp; the dump's column defaults call extensions.uuid_generate_v4);
#   3. decrypts with age straight into `pg_restore --no-owner --no-privileges
#      --schema=public` (the plaintext dump never touches the disk);
#   4. checks the number of tables in public and the row counts of app_users,
#      attempts and mastery equal the manifest's;
#   5. runs `npm run migrate -- --status` against it (schema is current);
#   6. drops the database (KEEP_DB=1 keeps it and prints its name).
#
# The backup holds the whole database; this restores schema public, which is
# all of the app's data. Supabase's own schemas (auth, storage, realtime, ...)
# need Supabase's roles and extensions and are not used by Ascendra.
#
# Usage (from anywhere in the repo):
#   backend/scripts/restore-drill.sh ascendra-db-....dump.age ascendra-backup.key [manifest.json]
# Env: ADMIN_URL  a superuser on a local cluster (default
#                 postgres://postgres:postgres@localhost:5432/postgres); a
#                 non-local host is refused, so this can never write to
#                 production.
#      KEEP_DB=1  leave the restored database for inspection.
#      PG_BIN     directory holding psql/pg_restore (default: PATH).
# Needs: age, psql and pg_restore (same major as the backup's pg_dump or
# newer), node, backend/node_modules. Exit 0 only when every check passes.

set +x
set -euo pipefail
export PGSSLMODE=disable

fail() { echo "RESTORE DRILL FAILED: $*" >&2; exit 1; }
step() { printf '\n=== %s\n' "$*"; }

BACKUP="${1:-}"; KEY="${2:-}"
[[ -n "$BACKUP" && -n "$KEY" ]] || fail "usage: restore-drill.sh <backup.age> <private-key-file> [manifest.json]"
MANIFEST="${3:-$(dirname "$BACKUP")/manifest.json}"
[[ -f "$BACKUP" ]] || fail "no backup file at $BACKUP"
[[ -f "$KEY" ]] || fail "no key file at $KEY"
[[ -f "$MANIFEST" ]] || fail "no manifest at $MANIFEST (pass it as the third argument)"

ADMIN_URL="${ADMIN_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
case "$ADMIN_URL" in
  *@localhost[:/]*|*@127.0.0.1[:/]*|*@\[::1\][:/]*) ;;
  *) fail "ADMIN_URL must point at a local cluster (localhost/127.0.0.1); refusing." ;;
esac
PG_BIN="${PG_BIN:-}"
pg() { if [[ -n "$PG_BIN" ]]; then "$PG_BIN/$1" "${@:2}"; else "$@"; fi; }
BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
command -v age >/dev/null || fail "age is not installed."
command -v node >/dev/null || fail "node is not installed."

# Reads one value from the manifest with node (needed anyway for npm).
m() { node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=process.argv[2].split(".").reduce((o,k)=>o==null?o:o[k],m);if(v==null)process.exit(3);console.log(v)' "$MANIFEST" "$1" \
  || fail "manifest has no $1"; }

step "Integrity"
want_sha="$(m sha256)"
got_sha="$(sha256sum "$BACKUP" | cut -d' ' -f1)"
[[ "$got_sha" == "$want_sha" ]] || fail "sha256 of $BACKUP does not match the manifest (corrupt or a different backup)."
echo "sha256 matches the manifest ($(m created_at), server $(m server_version))."

DB="restore_drill_$(date -u +%Y%m%d%H%M%S)_$$"
DB_URL="${ADMIN_URL%/*}/$DB"
psql_q() { pg psql -X -q -v ON_ERROR_STOP=1 "$@"; }
cleanup() {
  local rc=$?
  if [[ "${KEEP_DB:-0}" == 1 ]]; then
    echo "KEEP_DB=1: left database $DB"
  else
    psql_q "$ADMIN_URL" -c "drop database if exists $DB with (force)" 2>/dev/null || true
  fi
  exit "$rc"
}
trap cleanup EXIT

step "Fresh database"
psql_q "$ADMIN_URL" -c "create database $DB"
psql_q "$DB_URL" -f "$BACKEND/scripts/ci/supabase-roles.sql"
# Supabase keeps extensions in schema `extensions` and puts it on the
# search_path; the restored tables and functions expect the same.
psql_q "$DB_URL" -c 'create schema if not exists extensions' \
  -c 'create extension if not exists "uuid-ossp" with schema extensions' \
  -c "alter database $DB set search_path = \"\$user\", public, extensions"

step "Decrypt and restore (schema public)"
start=$(date +%s)
log="$(mktemp)"
set +e
age --decrypt --identity "$KEY" "$BACKUP" \
  | pg pg_restore --no-owner --no-privileges --schema=public --dbname="$DB_URL" 2>"$log"
codes=("${PIPESTATUS[@]}")
set -e
secs=$(( $(date +%s) - start ))
if [[ "${codes[0]}" != 0 ]]; then rm -f "$log"; fail "age could not decrypt (wrong key file?)."; fi
if [[ "${codes[1]}" != 0 ]]; then cat "$log" >&2; rm -f "$log"; fail "pg_restore reported errors (above)."; fi
rm -f "$log"
echo "Restored in ${secs}s."

step "Counts match the manifest"
q() { psql_q "$DB_URL" -A -t -c "$1"; }
tables="$(q "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')")"
want="$(m public_table_count)"
echo "tables in public: $tables (manifest $want)"
[[ "$tables" == "$want" ]] || fail "table count $tables != manifest $want"
for t in app_users attempts mastery; do
  got="$(q "select count(*) from public.$t")"
  want="$(m "row_counts.$t")"
  echo "$t: $got rows (manifest $want)"
  [[ "$got" == "$want" ]] || fail "$t has $got rows, manifest says $want"
done

step "Schema is current for this checkout"
status_out="$(cd "$BACKEND" && DATABASE_URL="$DB_URL" npm run -s migrate -- --status)" \
  || { echo "$status_out"; fail "migrate --status says the schema is not current."; }
echo "$status_out" | head -3
grep -q '^Schema is current' <<<"$status_out" || fail "migrate --status did not report a current schema."

echo
echo "RESTORE DRILL PASSED: $(m public_table_count) tables, counts match, schema current, restore ${secs}s."

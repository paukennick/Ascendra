#!/usr/bin/env bash
# REQ-207: the integration suite, connected as app_runtime (migration 071)
# instead of the owner -- what production runs once DATABASE_URL names that
# role. DATABASE_URL must be the OWNER url of a database that already has
# every migration applied and the seed loaded. The role is made LOGIN with a
# throwaway password for the run and put back to NOLOGIN afterwards.
#
# Tests that must do owner things (create roles, drop a table, fixtures that
# write tables the app may not) read OWNER_DATABASE_URL, which this sets.
#
#   cd backend && DATABASE_URL=postgres://... PGSSLMODE=disable bash scripts/ci/db-tests-as-runtime.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL (the owner url) is required}"
export OWNER_DATABASE_URL="$DATABASE_URL"
RUNTIME_PW="$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
export RUNTIME_PW
psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "alter role app_runtime login password '$RUNTIME_PW'"
trap 'psql "$OWNER_DATABASE_URL" -q -c "alter role app_runtime nologin password null" || true' EXIT
DATABASE_URL="$(node -e 'const u = new URL(process.env.OWNER_DATABASE_URL); u.username = "app_runtime"; u.password = process.env.RUNTIME_PW; process.stdout.write(u.toString());')"
export DATABASE_URL
unset RUNTIME_PW
npm run test:db

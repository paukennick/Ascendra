#!/usr/bin/env bash
# REQ-207: the integration suite, connected as app_runtime (migration 071)
# instead of the owner -- what production runs once DATABASE_URL names that
# role. DATABASE_URL must be the OWNER url of a database that already has
# every migration applied and the seed loaded. The role is made LOGIN with a
# throwaway password for the run and put back to NOLOGIN afterwards.
#
# Tests that must do owner things (create roles, replay a migration, DDL,
# touch the rollback copies) use lib/test-owner.ts, which reads
# OWNER_DATABASE_URL (set below). Four files do little else and are run as the
# owner in a second pass; each is DDL / migration replay / the batched-recompute
# procedure by nature, and none exercises app code paths:
#   backup-housekeeping   creates and drops tables and schemas
#   mastery-model         replays 031/031b and alters constraints
#   mastery-recompute     replays 029/029b
#   mastery-recompute-race  calls recompute_mastery_batched() (owner-only), drops a backup table
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
OWNER_ONLY="lib/backup-housekeeping.dbtest.ts lib/mastery-model.dbtest.ts lib/mastery-recompute.dbtest.ts lib/mastery-recompute-race.dbtest.ts"
RUNTIME_FILES="$(ls lib/*.dbtest.ts | grep -vxF -f <(printf '%s\n' $OWNER_ONLY) | tr '\n' ' ')"
echo "== as app_runtime: $(echo $RUNTIME_FILES | wc -w) files"
# shellcheck disable=SC2086
npx tsx --test --test-concurrency=1 $RUNTIME_FILES
echo "== as the owner (DDL and migration replay): $OWNER_ONLY"
DATABASE_URL="$OWNER_DATABASE_URL" npx tsx --test --test-concurrency=1 $OWNER_ONLY

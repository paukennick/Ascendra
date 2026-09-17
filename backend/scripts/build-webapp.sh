#!/usr/bin/env bash
# Rebuilds the web app (mobile/'s Expo Router app exported for web via
# react-native-web) and drops it into backend/public/, which the catch-all
# route in app/[[...path]]/route.ts serves for any path that isn't an API
# route or one of the existing server-rendered pages (reset-password,
# verify-email, confirm-email-change).
#
# EXPO_PUBLIC_API_URL is deliberately unset for this export (not read from
# mobile/.env.local) so the web build calls the API with relative paths --
# it's served same-origin from this same Next.js app, so there's no
# separate API host to hardcode. Native builds (EAS) are unaffected; they
# get their API URL from eas.json, not this script.
#
# Run from backend/: ./scripts/build-webapp.sh
#
# Also runs as part of `npm run build` (see package.json), including
# Vercel's own git-triggered production builds -- those start from a fresh
# checkout with no mobile/node_modules, so this installs them first if
# missing. That checkout only contains sibling directories like mobile/ at
# all because "Include files outside of the Root Directory in the Build
# Step" is enabled in Vercel Project Settings -> General -> Root Directory;
# without it Vercel only fetches backend/, cd into mobile/ below fails, and
# the catch-all route's own fallback ("Web app not built...") serves a 503
# instead of a hard build failure.
set -euo pipefail
BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -d "$BACKEND_DIR/../mobile" ]; then
  echo "error: ../mobile not found from backend/ -- Vercel's git-triggered build only" >&2
  echo "checks out the Root Directory. Enable 'Include files outside of the Root" >&2
  echo "Directory in the Build Step' in Project Settings -> General -> Root Directory." >&2
  exit 1
fi
MOBILE_DIR="$(cd "$BACKEND_DIR/../mobile" && pwd)"
ENV_LOCAL="$MOBILE_DIR/.env.local"
ENV_LOCAL_BAK="$MOBILE_DIR/.env.local.bak"

if [ ! -d "$MOBILE_DIR/node_modules" ]; then
  echo "Installing mobile/ dependencies (not cached in this build)..."
  npm install --prefix "$MOBILE_DIR"
fi

# `env -u` alone doesn't work here -- Expo's own dotenv loader reads
# .env.local directly regardless of what the parent shell's env has, so the
# file has to actually be out of the way during export. Absolute paths in
# the trap so restoration works no matter what the cwd is when it fires.
had_env_local=0
if [ -f "$ENV_LOCAL" ]; then
  had_env_local=1
  mv "$ENV_LOCAL" "$ENV_LOCAL_BAK"
fi
trap '[ "$had_env_local" = "1" ] && mv "$ENV_LOCAL_BAK" "$ENV_LOCAL"; true' EXIT

cd "$MOBILE_DIR"
rm -rf dist
npx expo export --platform web --clear

cd "$BACKEND_DIR"
rm -rf public/_expo public/assets public/index.html public/metadata.json public/favicon.ico
cp -r "$MOBILE_DIR/dist/." public/

# Vercel's file-tracing for what to include in the deployed function drops
# anything with a literal "node_modules" path segment, anywhere -- and
# Expo's web export names a real, needed asset folder exactly that
# (assets/node_modules/@expo-google-fonts/...), mirroring each font
# package's own path. That silently strips every custom font from
# production (they 404 through to the SPA-shell fallback, which browsers
# correctly report as a font-load error) while working fine locally, since
# `next dev` reads straight off disk with no such filtering. Renaming the
# folder and rewriting the handful of references to it works around this.
if [ -d public/assets/node_modules ]; then
  mv public/assets/node_modules public/assets/vendor
  grep -rl "/assets/node_modules/" public/_expo public/index.html 2>/dev/null | while read -r f; do
    sed -i 's#/assets/node_modules/#/assets/vendor/#g' "$f"
  done
fi

echo "Web app copied into backend/public/"

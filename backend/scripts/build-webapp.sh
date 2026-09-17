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
set -euo pipefail
cd "$(dirname "$0")/../../mobile"

rm -rf dist
env -u EXPO_PUBLIC_API_URL npx expo export --platform web --clear

cd ../backend
rm -rf public/_expo public/assets public/index.html public/metadata.json public/favicon.ico
cp -r ../mobile/dist/. public/
echo "Web app copied into backend/public/"

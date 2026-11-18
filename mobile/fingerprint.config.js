// REQ-300 / docs/versioning.md §3 (Nick, 2026-11-14): leave the app version
// (expo.version, android.versionCode, ios.buildNumber) out of the runtime
// fingerprint, so a version bump alone can ship over the air. A config here
// replaces @expo/fingerprint's default skips, so the default is kept too.
// Adding this file changes the fingerprint once: ship it with a store build.
/** @type {import('expo/fingerprint').Config} */
const { SourceSkips } = require("expo/fingerprint");

module.exports = {
  sourceSkips: SourceSkips.ExpoConfigVersions | SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun,
};

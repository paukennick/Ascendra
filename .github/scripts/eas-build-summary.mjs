// FAIL-1166: the job summary for .github/workflows/build-android-preview.yml.
//
// The workflow's last step used to read `b.project.ownerAccount.name` out of
// `eas build --json`. When the JSON shape changed that threw a TypeError AFTER
// Expo had built the app, so the run went red with the install link lost. This
// reads every field defensively and never throws: whatever is missing is left
// out, and the build page URL falls back (page URL EAS gives -> one built from
// owner, project and id -> the build id with where to find it).
//
// Usage: node eas-build-summary.mjs <build.json>   (prints Markdown; exit 0)
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const EXPO_PAGE = /^https:\/\/expo\.dev\/[A-Za-z0-9\-._~/%?=&]+$/;
const ARTIFACT = /^https:\/\/[A-Za-z0-9\-._~/%?=&:+@]+$/;
const SLUG = /^[A-Za-z0-9._-]{1,100}$/;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const TEXT = /^[A-Za-z0-9 ._+()-]{1,60}$/;

const str = (v) => (typeof v === "string" ? v.trim() : "");
const plain = (v) => {
  const s = typeof v === "number" ? String(v) : str(v);
  return TEXT.test(s) ? s : "";
};

// The first build in the output. EAS prints an array; an object, or log lines
// before the JSON, are tolerated.
export function firstBuild(raw) {
  const text = str(raw);
  const start = text.search(/[[{]/);
  if (start < 0) return null;
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start));
  } catch {
    return null;
  }
  const b = Array.isArray(parsed) ? parsed[0] : parsed;
  return b && typeof b === "object" ? b : null;
}

// The page of the build on expo.dev, or null when neither a page URL nor the
// parts to build one are in the output.
export function buildPageUrl(b) {
  const given = str(b.buildDetailsPageUrl);
  if (EXPO_PAGE.test(given)) return given;
  const owner = str(b.project?.ownerAccount?.name) || str(b.initiatingActor?.username) || str(b.account?.name);
  const slug = str(b.project?.slug) || str(b.projectSlug);
  const id = str(b.id);
  if (SLUG.test(owner) && SLUG.test(slug) && ID.test(id)) {
    return `https://expo.dev/accounts/${owner}/projects/${slug}/builds/${id}`;
  }
  return null;
}

export function summarize(raw) {
  const b = firstBuild(raw);
  if (!b) {
    return "### Android preview build\n\nThe build step finished, but its JSON output could not be read. Open expo.dev -> your project -> Builds for the install page.\n";
  }
  const id = ID.test(str(b.id)) ? str(b.id) : "";
  const page = buildPageUrl(b);
  const apk = [b.artifacts?.applicationArchiveUrl, b.artifacts?.buildUrl].map(str).find((u) => ARTIFACT.test(u)) ?? "";
  const lines = [];
  if (plain(b.status)) lines.push(`Status: ${plain(b.status)}`);
  const version = plain(b.appVersion);
  const code = plain(b.appBuildVersion);
  if (version) lines.push(`Version: ${version}${code ? ` (${code})` : ""}`);
  if (page) lines.push(`Install page (QR code): ${page}`);
  else if (id) lines.push(`Build id: ${id} (open expo.dev -> your project -> Builds, or run \`eas build:view ${id}\`)`);
  else lines.push("Build id: not in the output (open expo.dev -> your project -> Builds)");
  if (page && id) lines.push(`Build id: ${id}`);
  if (apk) lines.push(`APK: ${apk}`);
  return "### Android preview build\n\n" + lines.join("  \n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let raw = "";
  try {
    raw = readFileSync(process.argv[2] ?? "build.json", "utf8");
  } catch {
    // no file: summarize() reports that the output could not be read
  }
  process.stdout.write(summarize(raw));
}

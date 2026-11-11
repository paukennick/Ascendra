// REQ-176: decision logic for .github/workflows/eas-update.yml.
//
// An EAS update only reaches an installed build whose runtime version is the
// same as the update's (runtimeVersion policy "fingerprint": a hash of the
// native project). This file decides, from `eas build:list --json`, which
// platforms have a finished build on the target channel with the current
// code's runtime, and writes the job summary. It never sees EXPO_TOKEN.
//
//   node eas-ota.mjs report --channel production --runtime-android a.json \
//     --runtime-ios i.json --builds builds.json [--updates updates.json]
//   node eas-ota.mjs env --eas-json mobile/eas.json --profile production
//   node eas-ota.mjs verify-bundle --dir dist --platform android --url https://...
import { appendFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PLATFORMS = ["android", "ios"];

const short = (s, n = 12) => (s ? String(s).slice(0, n) : "-");
const day = (s) => (s ? String(s).replace("T", " ").slice(0, 16) + " UTC" : "-");

export function normalizeBuild(b) {
  return {
    id: b.id,
    platform: String(b.platform ?? "").toLowerCase(),
    status: String(b.status ?? "").toUpperCase(),
    profile: b.buildProfile ?? "-",
    channel: b.updateChannel?.name ?? b.channel ?? null,
    distribution: String(b.distribution ?? "-").toLowerCase(),
    appVersion: b.appVersion ?? "-",
    buildNumber: b.appBuildVersion ?? "-",
    runtime: b.runtime?.version ?? b.runtimeVersion ?? null,
    fingerprintHash: b.fingerprint?.hash ?? null,
    finishedAt: b.completedAt ?? b.createdAt ?? null,
    commit: b.gitCommitHash ?? null,
  };
}

const newestFirst = (a, b) => String(b.finishedAt ?? "").localeCompare(String(a.finishedAt ?? ""));

// runtimes: { android: "<hash>", ios: "<hash>" } for the code being checked.
export function decide({ channel, runtimes, builds }) {
  const all = builds.map(normalizeBuild).filter((b) => b.status === "FINISHED");
  return PLATFORMS.map((platform) => {
    const runtime = runtimes[platform] ?? null;
    const mine = all.filter((b) => b.platform === platform).sort(newestFirst);
    const onChannel = mine.filter((b) => b.channel === channel);
    const matching = runtime ? mine.filter((b) => b.runtime === runtime) : [];
    const matchingOnChannel = matching.filter((b) => b.channel === channel);
    let verdict;
    if (!runtime) verdict = "no-runtime";
    else if (mine.length === 0) verdict = "no-builds";
    else if (matchingOnChannel.length > 0) verdict = "match";
    else if (matching.length > 0) verdict = "match-other-channel";
    else verdict = "no-match";
    return {
      platform,
      runtime,
      builds: mine,
      onChannel,
      matching,
      matchingOnChannel,
      verdict,
      publish: verdict === "match",
      // The build to diff against when nothing matches: newest on the target
      // channel, else the newest of any channel.
      compareBuild: verdict === "match" ? null : (onChannel[0] ?? mine[0] ?? null),
      // The profile whose eas.json env the update must be bundled with.
      profile: matchingOnChannel[0]?.profile ?? null,
    };
  });
}

function buildRow(b, runtime) {
  const mark = runtime && b.runtime === runtime ? "MATCH" : "differs";
  return `| ${b.platform} | ${b.profile} | ${b.channel ?? "-"} | ${b.distribution} | ${b.appVersion} (${b.buildNumber}) | \`${short(b.runtime)}\` ${mark} | ${day(b.finishedAt)} | \`${short(b.commit, 7)}\` | \`${short(b.id, 8)}\` |`;
}

function verdictLine(d, channel) {
  const p = d.platform;
  switch (d.verdict) {
    case "match": {
      const b = d.matchingOnChannel[0];
      return `**${p}: MATCH.** Runtime \`${short(d.runtime)}\` equals ${d.matchingOnChannel.length} finished build(s) on channel \`${channel}\` (newest: ${b.profile}, ${b.appVersion} (${b.buildNumber}), ${day(b.finishedAt)}). An update published now reaches it.`;
    }
    case "match-other-channel": {
      const chans = [...new Set(d.matching.map((b) => b.channel ?? "none"))].join(", ");
      return `**${p}: MATCH ON ANOTHER CHANNEL ONLY.** Runtime \`${short(d.runtime)}\` matches build(s) on channel ${chans}, not \`${channel}\`. Publishing to \`${channel}\` would not reach them; re-run with that channel if that build is the one installed.`;
    }
    case "no-match": {
      const b = d.compareBuild;
      return `**${p}: NO MATCH.** Runtime \`${short(d.runtime)}\` matches no finished ${p} build. Newest ${b.channel === channel ? `on \`${channel}\`` : "build"}: ${b.profile}, ${b.appVersion} (${b.buildNumber}), runtime \`${short(b.runtime)}\`, ${day(b.finishedAt)}. Nothing will be published for ${p}; this code needs a new store build to reach devices.`;
    }
    case "no-builds":
      return `**${p}: NO BUILDS.** EAS has no finished ${p} build, so there is nothing an update could reach.`;
    default:
      return `**${p}: UNKNOWN.** The local runtime version could not be computed.`;
  }
}

export function renderSummary({ channel, dryRun, decisions, updates }) {
  const lines = [];
  lines.push(`### Runtime fingerprint check (channel \`${channel}\`)`, "");
  for (const d of decisions) lines.push(`- ${verdictLine(d, channel)}`);
  const pub = decisions.filter((d) => d.publish).map((d) => d.platform);
  lines.push("");
  if (pub.length === 0) lines.push(`**Result: nothing to publish.** No platform has a finished build on \`${channel}\` with this runtime; a new store build is needed.`);
  else if (dryRun) lines.push(`**Result (dry run): would publish ${pub.join(" and ")}.** Nothing was published.`);
  else lines.push(`**Result: publishing ${pub.join(" and ")}.**`);
  lines.push("", "Local runtime versions (fingerprint hashes):", "");
  for (const d of decisions) lines.push(`- ${d.platform}: \`${d.runtime ?? "-"}\``);
  lines.push("", "### Finished EAS builds", "");
  const rows = decisions.flatMap((d) => d.builds.map((b) => buildRow(b, d.runtime)));
  if (rows.length === 0) lines.push("None.");
  else {
    lines.push("| Platform | Profile | Channel | Distribution | Version (build) | Runtime | Finished | Commit | Build |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    lines.push(...rows);
  }
  const groups = updates?.currentPage ?? (Array.isArray(updates) ? updates : null);
  if (groups) {
    lines.push("", "### Recent update groups (all branches)", "");
    if (groups.length === 0) lines.push("None.");
    else {
      lines.push("| Branch | Platforms | Runtime | Message | Group |", "| --- | --- | --- | --- | --- |");
      for (const g of groups.slice(0, 10)) {
        const msg = String(g.message ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").slice(0, 80);
        lines.push(`| ${g.branch ?? "-"} | ${g.platforms ?? g.platform ?? "-"} | \`${short(g.runtimeVersion)}\` | ${msg} | \`${g.group ?? "-"}\` |`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

// The env block of an eas.json build profile, following `extends`. `eas update`
// does not read it (REQ-031, REQ-058), so the workflow sets it itself.
export function resolveProfileEnv(easJson, profile, seen = new Set()) {
  const p = easJson?.build?.[profile];
  if (!p) throw new Error(`eas.json has no build profile "${profile}"`);
  if (seen.has(profile)) throw new Error(`eas.json profile "${profile}" extends itself`);
  seen.add(profile);
  const base = p.extends ? resolveProfileEnv(easJson, p.extends, seen) : {};
  return { ...base, ...(p.env ?? {}) };
}

export function shellExports(env) {
  return Object.entries(env)
    .map(([k, v]) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw new Error(`bad env name ${k}`);
      return `export ${k}='${String(v).replace(/'/g, `'\\''`)}'`;
    })
    .join("\n") + "\n";
}

// Private-network addresses, as a dev machine's .env.local leaked once (REQ-031,
// http://10.0.0.85:3000). Loopback is not checked: React Native itself embeds
// http://localhost:8081 (the Metro dev server) in every release bundle.
const LAN = /https?:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?/;

export function checkBundleText(text, url) {
  const problems = [];
  if (!url) problems.push("EXPO_PUBLIC_API_URL is empty");
  else if (!text.includes(url)) problems.push(`bundle does not contain ${url}`);
  const lan = text.match(LAN);
  if (lan) problems.push(`bundle contains a private-network URL (${lan[0]})`);
  return problems;
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, "")] = argv[i + 1];
  return out;
}

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));

function main([cmd, ...rest]) {
  const a = args(rest);
  if (cmd === "report") {
    const runtimes = {};
    for (const p of PLATFORMS) {
      try {
        runtimes[p] = readJson(a[`runtime-${p}`]).runtimeVersion ?? null;
      } catch {
        runtimes[p] = null;
      }
    }
    const builds = readJson(a.builds);
    let updates = null;
    try {
      updates = a.updates ? readJson(a.updates) : null;
    } catch {
      updates = null;
    }
    const decisions = decide({ channel: a.channel, runtimes, builds });
    process.stdout.write(renderSummary({ channel: a.channel, dryRun: a["dry-run"] === "true", decisions, updates }));
    if (process.env.GITHUB_OUTPUT) {
      const out = [`publish_platforms=${decisions.filter((d) => d.publish).map((d) => d.platform).join(" ")}`];
      for (const d of decisions) {
        out.push(`${d.platform}_verdict=${d.verdict}`);
        out.push(`${d.platform}_runtime=${d.runtime ?? ""}`);
        out.push(`${d.platform}_profile=${d.profile ?? ""}`);
        out.push(`${d.platform}_compare_build=${d.compareBuild?.id ?? ""}`);
        out.push(`${d.platform}_compare_commit=${d.compareBuild?.commit ?? ""}`);
      }
      appendFileSync(process.env.GITHUB_OUTPUT, out.join("\n") + "\n");
    }
    return 0;
  }
  if (cmd === "env") {
    process.stdout.write(shellExports(resolveProfileEnv(readJson(a["eas-json"]), a.profile)));
    return 0;
  }
  if (cmd === "verify-bundle") {
    const js = filesUnder(a.dir).filter((f) => f.includes(`${a.platform}`) && /\.(hbc|js)$/.test(f));
    if (js.length === 0) {
      console.error(`no ${a.platform} bundle under ${a.dir}`);
      return 1;
    }
    // Hermes bytecode keeps ASCII string literals as plain bytes.
    const text = js.map((f) => readFileSync(f).toString("latin1")).join("\n");
    const problems = checkBundleText(text, a.url);
    if (problems.length) {
      for (const p of problems) console.error(`bundle check failed: ${p}`);
      return 1;
    }
    console.log(`bundle check passed: ${js.length} file(s) contain ${a.url} and no private-network URL`);
    return 0;
  }
  console.error("usage: eas-ota.mjs report|env|verify-bundle ...");
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));

// REQ-207 (FAIL-951): `npm audit` as a blocking CI step, with a written list of
// the advisories we cannot fix without a breaking upgrade.
//
//   node .github/scripts/audit-gate.mjs <audit.json> <known.json>
//
// <audit.json> is `npm audit --omit=dev --json`. <known.json> is
// { "<package>": "why it is accepted and what clears it" }. Fails (exit 1) on
// any high or critical advisory whose package is not in the list, and on a
// list entry that no longer appears (so the list shrinks as upgrades land).
// Moderate and low are printed, not blocking.
import { readFileSync } from "node:fs";

export function gate(audit, known) {
  const vulns = audit.vulnerabilities ?? {};
  const serious = Object.entries(vulns).filter(([, v]) => v.severity === "high" || v.severity === "critical").map(([name]) => name);
  const unknown = serious.filter((n) => !(n in known));
  const stale = Object.keys(known).filter((n) => !serious.includes(n));
  return { serious, unknown, stale, ok: unknown.length === 0 && stale.length === 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [auditFile, knownFile] = process.argv.slice(2);
  const audit = JSON.parse(readFileSync(auditFile, "utf8"));
  const known = JSON.parse(readFileSync(knownFile, "utf8"));
  const r = gate(audit, known);
  const meta = audit.metadata?.vulnerabilities ?? {};
  console.log(`npm audit (production): ${JSON.stringify(meta)}`);
  if (r.serious.length) console.log(`high/critical: ${r.serious.join(", ")} (accepted: ${r.serious.filter((n) => n in known).join(", ") || "none"})`);
  if (r.unknown.length) console.error(`::error::New high/critical advisory not in mobile/audit-known.json: ${r.unknown.join(", ")}`);
  if (r.stale.length) console.error(`::error::Remove from mobile/audit-known.json, no longer reported: ${r.stale.join(", ")}`);
  process.exit(r.ok ? 0 : 1);
}

// REQ-184: content audit fixes (2026-11-09) for the CompTIA and security
// courses. Each test pins a corrected answer key, command or figure so the
// old wrong value cannot come back (FAIL-581..585).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, mkdirSync, readdirSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LAB_SETS } from "../supabase/seed/labs";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";

function lab(track: string, slug: string) {
  const l = LAB_SETS.find((s) => s.trackCode === track)?.labs.find((x) => x.slug === slug);
  assert.ok(l, `${track}/${slug}`);
  return l!;
}
const text = (l: ReturnType<typeof lab>) =>
  [l.brief, ...l.steps.flatMap((s) => [s.text, s.ask, ...s.parts.flatMap((p) => [p.criteria, p.modelAnswer])])].join("\n");

describe("CompTIA content audit fixes (REQ-184)", () => {
  test("Security+ V7 names control categories and control types the SY0-701 way (FAIL-581)", () => {
    const t = CATALOG_TRACKS.find((x) => x.code === "SECPLUS")!;
    const all = t.units.flatMap((u) => u.objectives);
    const o = all.find((x) => /control categories/i.test(x));
    assert.ok(o, "objective present");
    assert.match(o!, /categories \(technical, managerial, operational, physical\)/);
    assert.match(o!, /control types \(preventive, deterrent, detective, corrective, compensating, directive\)/);
    assert.ok(!all.some((x) => /control types \(technical/i.test(x)), "the swapped wording is gone");
  });

  test("Network+ adds the /24 before deleting the /16 so the default route survives (FAIL-582)", () => {
    const t = text(lab("NETWORKPLUS", "methodology-one-user-cannot-reach-server"));
    const add = t.indexOf("ip addr add 10.20.5.37/24");
    const del = t.indexOf("ip addr del 10.20.5.37/16");
    assert.ok(add > 0 && del > 0 && add < del, "add comes before del");
  });

  test("Linux+ archive script stops with exit 1 and keeps the log when gzip fails (FAIL-583)", { skip: process.platform === "win32" }, () => {
    const l = lab("LINUXPLUS", "archive-old-logs-script");
    const script = l.steps[0].parts[0].modelAnswer.split("\n\n(The positional")[0];
    assert.match(script, /if ! gzip -c/);
    const dir = mkdtempSync(join(tmpdir(), "asc-archive-"));
    try {
      for (const d of ["src", "dst", "bin"]) mkdirSync(join(dir, d));
      writeFileSync(join(dir, "archive.sh"), script);
      writeFileSync(join(dir, "bin", "gzip"), "#!/bin/sh\necho 'gzip: disk full' >&2\nexit 1\n");
      chmodSync(join(dir, "bin", "gzip"), 0o755);
      const old = new Date(Date.now() - 10 * 86400_000);
      for (const f of ["app 2026-10-28.log", "app-2026-10-27.log"]) {
        writeFileSync(join(dir, "src", f), "x\n");
        utimesSync(join(dir, "src", f), old, old);
      }
      const r = spawnSync("bash", [join(dir, "archive.sh"), join(dir, "src"), join(dir, "dst")], {
        env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` },
        encoding: "utf8",
      });
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.doesNotMatch(r.stdout, /archived 2/);
      assert.equal(readdirSync(join(dir, "src")).length, 2, "originals kept");
      assert.equal(readdirSync(join(dir, "dst")).length, 0, "partial .gz removed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("Security+ V8 CVSS lab: reported attacks justify E:A and the 9.3 key; a PoC alone is 8.9 (FAIL-584)", () => {
    const l = lab("SECPLUSV8", "cvss4-score-a-finding");
    assert.match(l.brief, /exploitation in the wild has been reported/);
    const t = text(l);
    assert.match(t, /9\.3/);
    assert.match(t, /E:P \(POC\) and score 8\.9/);
  });

  test("EPSS percentiles are realistic for the stated scores (FAIL-585)", () => {
    const sec = lab("SECPLUS", "vuln-prioritization-cvss-epss-kev").brief;
    assert.match(sec, /EPSS 0\.93 \(99\.8th percentile\)/);
    assert.match(sec, /EPSS 0\.6 \(99\.1st percentile\)/);
    const cysa = lab("CYSAPLUS", "cvss-epss-kev-prioritization").brief;
    assert.match(cysa, /EPSS 0\.91 \(99\.8th pct\)/);
    assert.match(cysa, /EPSS 0\.55 \(99\.0th pct\)/);
  });
});

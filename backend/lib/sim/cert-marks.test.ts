// REQ-309 (wave 2026-11-17; FAIL-2120): no seeded sim, whatever its profile,
// names a mark of an exam body whose trademark policy allows no use without
// written permission. lint.ts certMarkProblems now checks every document for
// these bodies (the governance, exercise and professional-ethics profiles keep
// their stricter REQ-313 list too), and its patterns must match the
// "permission" bodies of lib/catalog-trademarks.test.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { certMarkProblems, PERMISSION_BODY_MARKS } from "./lint.ts";
import type { ScenarioDoc } from "./engine/v1/index.ts";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const docOf = (slug: string): ScenarioDoc => {
  const e = ALL_DOCUMENTS.find((d) => d.slug === slug);
  assert.ok(e, slug);
  return loadDocument(e);
};

describe("REQ-309: sims name no 'permission' body's mark", () => {
  test("every seeded document passes, bands included", () => {
    const bad = ALL_DOCUMENTS.flatMap((e) => certMarkProblems(loadDocument(e)).map((p) => `${e.course}/${e.slug} ${p.path}: ${p.message}`));
    assert.deepEqual(bad, []);
  });

  test("the lint's patterns are the catalog test's 'permission' bodies, less the three homonyms", () => {
    const src = readFileSync(join(__dirname, "..", "catalog-trademarks.test.ts"), "utf8");
    const bodies = [...src.matchAll(/\{ name: "([^"]+)", policy: "permission",[\s\S]*?marks: \/(.+?)\/ \}/g)].map((m) => ({ body: m[1], marks: m[2] }));
    assert.equal(bodies.length, 13, "the catalog test lists 13 permission bodies");
    const homonymsOut = (s: string) => s.replace("|\\bCISA\\b", "").replace("GCS|", "").replace("|ECS", "");
    assert.deepEqual(
      PERMISSION_BODY_MARKS.map((b) => ({ body: b.body, marks: b.marks.source })),
      bodies.map((b) => ({ body: b.body, marks: homonymsOut(b.marks) })),
    );
  });

  test("it catches a mark in any profile and leaves sources, objectives and homonyms alone", () => {
    const d = clone(docOf("departing-engineer-usb-evidence"));
    assert.deepEqual(certMarkProblems(d), []);
    d.brief.situation += " Your CISSP colleague agrees.";
    assert.equal(certMarkProblems(d).length, 1);
    const n = clone(docOf("cnc-crash-diet-request"));
    n.brief.situation = n.brief.situation.replace("certified nutrition coach", "NASM-CNC");
    assert.match(certMarkProblems(n)[0]?.message ?? "", /NASM/);
    const s = clone(docOf("departing-engineer-usb-evidence"));
    s.brief.situation += " GCS 15, ACE inhibitor at home, logs from Amazon ECS, a CISA advisory.";
    s.sources[0].cite += " (ISC2)";
    assert.deepEqual(certMarkProblems(s), []);
  });
});

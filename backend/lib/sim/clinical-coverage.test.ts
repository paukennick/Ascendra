// REQ-296 (docs/sims-coverage-clinical.md, docs/sims.md 22.16): the sims added
// to cover the existing clinical courses. Each is a running clinical case on
// an existing screen, registers to a catalog objective of its course that the
// selection rule (lib/sim/generator/selection.ts) passes, orders its endings,
// and its golden paths cover Good, Mediocre and Bad and every criterion both
// met and missed. Sources say how they were read (FAIL-1981), and the schema
// validates the document itself, not only the golden builder (FAIL-1980).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, DPT_TREATMENT_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ296: readonly { course: string; slug: string; screen: string }[] = [
  { course: "CNA", slug: "evening-vitals-out-of-range", screen: "bedside" },
  { course: "PTPREREQ", slug: "cycle-test-falling-pressure", screen: "treatment-session" },
  { course: "NCLEXRN", slug: "postpartum-hemorrhage-atony", screen: "bedside" },
  { course: "CCRNADULT", slug: "status-epilepticus-after-craniotomy", screen: "bedside" },
  { course: "DPT", slug: "dizziness-central-red-flags", screen: "treatment-session" },
  { course: "NCLEXPN", slug: "first-dose-anaphylaxis", screen: "bedside" },
];

interface GoldenPath { id: string; expect: { ending: string; rating: string; criteria: Record<string, string> } }

const jsonbOrder = (a: string, b: string): number => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

for (const r of REQ296) {
  const entry = ALL_DOCUMENTS.find((e) => e.course === r.course && e.slug === r.slug);
  test(`${r.course}/${r.slug}: registered, valid, on its screen, a fitting objective`, () => {
    assert.ok(entry, "registered in ALL_DOCUMENTS");
    const raw = JSON.parse(readFileSync(entry!.file, "utf8"));
    const parsed = scenarioSchema.safeParse(raw);
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(entry!);
    assert.equal(doc.screen.type, r.screen);
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    const ctx = courseObjectives(r.course).find((o) => toUsSpelling(o.objective) === toUsSpelling(doc.objective));
    assert.ok(ctx, `objective in the ${r.course} catalog`);
    assert.ok(selectionFor(ctx!).qualifies, `"${doc.objective}" passes the selection screen`);
    // Clinical cases run on the clock (study pace by default, 5.4a).
    assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
    const conditional = Object.entries(doc.endings).filter(([, e]) => e.when).map(([id]) => id);
    assert.deepEqual([...(doc.endingOrder ?? [])].sort(), [...conditional].sort(), "endingOrder lists every conditional ending");
    const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
    assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
  });

  test(`${r.course}/${r.slug}: sources say how they were read (FAIL-1981)`, () => {
    const doc = loadDocument(entry!);
    for (const s of doc.sources) {
      if (!s.url) continue;
      assert.match(s.note ?? "", /^(Read|Relayed)/, `${s.cite}: note starts with how it was read`);
    }
  });

  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad and every criterion met and missed`, () => {
    const g = JSON.parse(readFileSync(entry!.golden!, "utf8")) as { paths: GoldenPath[] };
    const ratings = new Set(g.paths.map((p) => p.expect.rating));
    for (const want of ["good", "mediocre", "bad"]) assert.ok(ratings.has(want), `a ${want} path`);
    const doc = loadDocument(entry!);
    for (const c of doc.scoring.criteria) {
      const scores = new Set(g.paths.map((p) => p.expect.criteria[c.id]));
      assert.ok(scores.has("met") && scores.has("missed"), `${c.id} met and missed`);
    }
    const reached = new Set(g.paths.map((p) => p.expect.ending));
    for (const id of Object.keys(doc.endings)) if (id !== "time_up") assert.ok(reached.has(id), `ending ${id} reached`);
  });
}

test("DPT: the REQ-232 first set stays three documents when later DPT sims are added (FAIL-1983)", () => {
  assert.equal(DPT_TREATMENT_DOCUMENTS.length, 3);
  assert.ok(ALL_DOCUMENTS.filter((e) => e.course === "DPT").length > 3);
});

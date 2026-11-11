// REQ-162 (docs/sims.md 4.4, 4.5, 15, 16): every seeded document passes the
// linter with its golden paths, and the client document the app receives
// leaks nothing server-only (scoring, reasoning parts and model answers,
// debrief text, source check dates).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { checkDocument } from "./lint.ts";
import { addMonths, canonicalJson, clientDocument, earliestRecheck } from "./content-hash.ts";
import type { ScenarioDoc } from "./engine/v1/types.ts";

describe("seeded sim documents pass the linter", () => {
  for (const entry of ALL_DOCUMENTS) {
    test(`${entry.course}/${entry.slug}`, () => {
      // `now` left out: a source falling due must not fail CI on its own day;
      // `npm run sims:lint` reports it and the stale-sources report tracks it.
      const r = checkDocument(entry, { full: true });
      assert.deepEqual(r.problems.filter((p) => p.level === "error"), []);
      for (const g of r.goldenResults) {
        assert.equal(g.error, null, `${g.path.id}: ${g.error}`);
        assert.deepEqual(g.mismatches, [], g.path.id);
      }
    });
  }
});

const SERVER_ONLY_KEYS = ["scoring", "parts", "modelAnswer", "modelReasoning", "debrief", "expertPath", "checkedAt", "recheckBy"];

function keysIn(v: unknown, out: Set<string>): Set<string> {
  if (v && typeof v === "object") {
    if (Array.isArray(v)) v.forEach((x) => keysIn(x, out));
    else
      for (const k of Object.keys(v)) {
        out.add(k);
        keysIn((v as Record<string, unknown>)[k], out);
      }
  }
  return out;
}

function serverOnlyStrings(doc: ScenarioDoc): string[] {
  const s: string[] = [];
  for (const m of Object.values(doc.reasoning ?? {})) for (const p of m.parts ?? []) s.push(p.modelAnswer, p.criteria);
  if (doc.scoring) {
    s.push(doc.scoring.modelReasoning);
    for (const d of Object.values(doc.scoring.debrief ?? {})) s.push(d.body);
    for (const e of doc.scoring.expertPath ?? []) s.push(e.text);
  }
  return s.filter((x) => typeof x === "string" && x.length >= 24);
}

describe("client document leaks nothing server-only", () => {
  const corpusDir = join(__dirname, "engine", "v1", "golden", "corpus");
  const docs: [string, ScenarioDoc][] = [
    ...readdirSync(corpusDir)
      .filter((f) => f.endsWith(".json"))
      .map((f): [string, ScenarioDoc] => [`corpus/${f}`, (JSON.parse(readFileSync(join(corpusDir, f), "utf8")) as { doc: ScenarioDoc }).doc]),
    ...ALL_DOCUMENTS.map((e): [string, ScenarioDoc] => [`${e.course}/${e.slug}`, loadDocument(e)]),
  ];

  test("there are documents to check", () => assert.ok(docs.length > 0));

  for (const [name, doc] of docs) {
    test(name, () => {
      const client = clientDocument(doc);
      const keys = keysIn(client, new Set());
      for (const k of SERVER_ONLY_KEYS) assert.ok(!keys.has(k), `${name}: client document has key "${k}"`);
      const text = canonicalJson(client);
      for (const s of serverOnlyStrings(doc)) assert.ok(!text.includes(JSON.stringify(s).slice(1, -1)), `${name}: server-only text reaches the client: ${s.slice(0, 60)}`);
      // everything the app needs to run is still there
      for (const k of ["state", "derived", "processes", "phases", "actions", "timers", "triggers", "endings", "outcome", "clock", "params"] as const) assert.ok(k in client, `${name}: client document lost ${k}`);
    });
  }
});

// REQ-223 (FAIL-1190): a source checked on the 29th-31st must not produce an
// impossible re-check date; Postgres refused 2027-04-31 and the seed stopped.
describe("source re-check dates are real calendar dates", () => {
  test("addMonths clamps to the end of the target month", () => {
    assert.equal(addMonths("2026-10-31", 6), "2027-04-30");
    assert.equal(addMonths("2027-08-31", 6), "2028-02-29");
    assert.equal(addMonths("2026-11-10", 6), "2027-05-10");
    assert.equal(addMonths("2026-01-31", 12), "2027-01-31");
  });
  for (const e of ALL_DOCUMENTS) {
    test(`${e.course}/${e.slug}: earliest re-check date parses`, () => {
      for (const months of [6, 12]) {
        const d = earliestRecheck(loadDocument(e), months);
        if (d === null) continue;
        assert.equal(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), d, `${d} is a real date`);
      }
    });
  }
});

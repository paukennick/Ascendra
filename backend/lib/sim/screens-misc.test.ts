// REQ-314 (docs/sims.md 22.27): the facility console, the sandbox report and
// the client trainer. The bindings are validated like the console's; the new
// facility profile and the fitness stopWindow refuse a looser threshold; the
// sandbox report stays defensive (sandboxSafetyProblems); every case is
// learner-paced, on engine 1.2 with an endingOrder, on a catalog objective of
// its course, and its goldens reach every ending but time_up, every rating
// and every criterion both met and missed; the three renderers are on by
// default and an app without them is told to update.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REQ314_DOCUMENTS, REQ314_SLUGS, loadDocument } from "./documents.ts";
import { lintScenario, validateScenario } from "./engine/v1/index.ts";
import type { ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";
import { schemaProblems } from "./schema.ts";
import { DEFAULT_RENDERERS, pacingEligible, parseCaps, renderersOn, runnable } from "./server-run.ts";
import { backslashEscapeProblems, safetyFamilyOf, sandboxSafetyProblems, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { clientDocument } from "./content-hash.ts";

const clone = (d: ScenarioDoc): ScenarioDoc => JSON.parse(JSON.stringify(d)) as ScenarioDoc;
const errors = (d: ScenarioDoc): string[] => validateScenario(d).map(String);
const entry = (slug: string) => REQ314_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entry(slug));
const SCREEN: Record<keyof typeof REQ314_SLUGS, string> = { trainer: "trainer", facility: "facility-console", sandbox: "sandbox-report" };
const BASES = REQ314_DOCUMENTS.filter((e) => e.kind === "scenario");

describe("REQ-314 documents", () => {
  test("every listed slug is registered once, valid, schema-clean, on its screen, engine 1.2 with an endingOrder", () => {
    for (const [kind, slugs] of Object.entries(REQ314_SLUGS) as [keyof typeof REQ314_SLUGS, readonly string[]][]) {
      for (const slug of slugs) {
        const e = entry(slug);
        assert.ok(e, slug);
        const d = loadDocument(e);
        assert.deepEqual(errors(d), [], slug);
        assert.deepEqual(schemaProblems(d), [], slug);
        assert.equal(d.screen.type, SCREEN[kind], slug);
        assert.equal(d.engine.minor, 2, slug);
        assert.ok(d.endingOrder && d.endingOrder.length >= 3, slug);
        assert.deepEqual(backslashEscapeProblems(d), [], slug);
        assert.deepEqual(secondsUnitProblems(d), [], slug);
      }
    }
    assert.equal(REQ314_DOCUMENTS.length, REQ314_SLUGS.trainer.length + REQ314_SLUGS.facility.length + REQ314_SLUGS.sandbox.length);
  });

  test("learner-paced: no running phase, so pacing is refused; the family follows the profile", () => {
    for (const e of REQ314_DOCUMENTS) {
      const d = loadDocument(e);
      for (const p of Object.values(d.phases)) assert.notEqual(p.clock, "running", e.slug);
      const fam = safetyFamilyOf(d);
      assert.equal(fam, d.screen.type === "trainer" ? "fitness" : "general", e.slug);
      assert.equal(pacingEligible(d, fam), false, e.slug);
    }
  });

  test("each primary objective is a catalog objective of its course", () => {
    for (const e of REQ314_DOCUMENTS) {
      const track = CATALOG_TRACKS.find((t) => t.code === e.course);
      assert.ok(track, e.course);
      const titles = new Set(activeUnits(track!).flatMap((u) => u.objectives));
      const d = loadDocument(e);
      assert.ok(titles.has(d.objective), `${e.course}/${e.slug}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${e.course}/${e.slug} secondary: ${s}`);
    }
  });

  test("goldens: every ending but time_up, Good, Mediocre and Bad, every criterion met and missed; bands reuse the base paths", () => {
    for (const e of BASES) {
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up" && d.endings[k].terminal) assert.ok(endings.has(k), `${e.slug}: ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: ${r}`);
      for (const c of d.scoring.criteria) {
        const scores = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(scores.has("met"), `${e.slug}: ${c.id} met`);
        assert.ok(scores.has("missed"), `${e.slug}: ${c.id} missed`);
      }
      const critical = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(critical >= 3 && critical <= 4, `${e.slug}: ${critical} critical criteria`);
      assert.equal(Object.keys(d.reasoning).length, 1, e.slug);
    }
    for (const e of REQ314_DOCUMENTS.filter((x) => x.kind === "band")) {
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      assert.equal(g.slug, e.slug);
      assert.ok(g.paths.length >= 5, e.slug);
    }
  });
});

describe("the client document leaks no server-only text (as documents.test.ts, for these cases)", () => {
  test("no debrief, model answer or expert path text appears in what the app receives", () => {
    for (const e of REQ314_DOCUMENTS) {
      const d = loadDocument(e);
      const text = JSON.stringify(clientDocument(d));
      const secret: string[] = [d.scoring.modelReasoning, ...Object.values(d.scoring.debrief).map((x) => x.body), ...d.scoring.expertPath.map((x) => x.text)];
      for (const m of Object.values(d.reasoning)) for (const p of m.parts) secret.push(p.modelAnswer, p.criteria);
      for (const s of secret.filter((x) => x.length >= 24)) assert.ok(!text.includes(JSON.stringify(s).slice(1, -1)), `${e.slug}: ${s.slice(0, 60)}`);
    }
  });
});

describe("bindings are checked", () => {
  test("a screen type without its bindings is refused", () => {
    for (const [slug, key] of [["cissp-datahall-tailgate-cooling", "facility"], ["ceh-sandbox-invoice-loader", "sandbox"], ["cpt-parq-chest-tightness", "trainer"]] as const) {
      const d = clone(docOf(slug));
      delete (d.screen as Record<string, unknown>)[key];
      assert.ok(errors(d).some((m) => m.includes(`screen.${key}`)), slug);
    }
  });

  test("facility: alarm kinds, door results and tones are closed lists; ids are unique", () => {
    const d = clone(docOf("cissp-datahall-tailgate-cooling"));
    (d.screen.facility!.alarms[0] as { kind: string }).kind = "earthquake";
    d.screen.facility!.doors[0].result = '"opened"';
    d.screen.facility!.zones[0].tone = '"green"';
    d.screen.facility!.cameras[0].id = d.screen.facility!.zones[1].id;
    const errs = errors(d).join("\n");
    assert.match(errs, /alarms\[0\]\.kind/);
    assert.match(errs, /doors\[0\]\.result/);
    assert.match(errs, /zones\[0\]\.tone/);
    assert.match(errs, /duplicate id/);
  });

  test("sandbox: a process's parent comes first; indicator types and rule tones are closed lists", () => {
    const d = clone(docOf("ceh-sandbox-invoice-loader"));
    d.screen.sandbox!.processes.reverse();
    (d.screen.sandbox!.indicators[0] as { type: string }).type = "email";
    d.screen.sandbox!.rules[0].tone = '"great"';
    const errs = errors(d).join("\n");
    assert.match(errs, /parent/);
    assert.match(errs, /indicators\[0\]\.type/);
    assert.match(errs, /rules\[0\]\.tone/);
  });

  test("trainer: needs at least one rule; gauges need one more word than bands", () => {
    const d = clone(docOf("cpt-parq-chest-tightness"));
    d.screen.trainer!.rules = [];
    d.screen.trainer!.gauges[0].words = ["one"];
    const errs = errors(d).join("\n");
    assert.match(errs, /screen\.trainer\.rules/);
    assert.match(errs, /gauges\[0\]\.words/);
  });
});

describe("profiles", () => {
  test("facility defaults and the fitness stopWindow", () => {
    assert.deepEqual(Object.keys(PROFILE_THRESHOLDS.facility).sort(), ["peopleAtRisk", "responseWindow"]);
    assert.equal(PROFILE_THRESHOLDS.facility.responseWindow.value, 600);
    assert.equal(PROFILE_THRESHOLDS.fitness.stopWindow.value, 120);
  });

  test("a looser facility threshold is an error", () => {
    const d = clone(docOf("cissp-datahall-tailgate-cooling"));
    d.outcome.thresholds.responseWindow.value = 900;
    assert.ok(lintScenario(d, { searchNodes: 0 }).some((p) => p.level === "error" && p.path === "outcome.thresholds.responseWindow"));
  });
});

describe("the sandbox report stays defensive (sandboxSafetyProblems)", () => {
  test("the seeded sandbox cases are clean; other screens are not checked", () => {
    for (const slug of REQ314_SLUGS.sandbox) assert.deepEqual(sandboxSafetyProblems(docOf(slug)), [], slug);
    assert.deepEqual(sandboxSafetyProblems(docOf("cissp-datahall-tailgate-cooling")), []);
  });

  test("live links, encoded blobs, script-host commands, live addresses and unreserved domains are errors", () => {
    const base = docOf("ceh-sandbox-invoice-loader");
    const withText = (t: string): ScenarioDoc => {
      const d = clone(base);
      d.screen.sandbox!.static[0].text = t;
      return d;
    };
    assert.ok(sandboxSafetyProblems(withText("fetches https://example.com/a")).length);
    assert.ok(sandboxSafetyProblems(withText("blob SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkA")).length);
    assert.ok(sandboxSafetyProblems(withText("powershell -enc SQBFAFgAIAAoAE4A")).length);
    assert.ok(sandboxSafetyProblems(withText("connects to 8.8.4.4")).length);
    assert.equal(sandboxSafetyProblems(withText("connects to 198.51.100.23 and 10.0.4.12")).length, 0);
    const dom = clone(base);
    dom.screen.sandbox!.network[0].dest = "cdn-update[.]badsite[.]com";
    assert.ok(sandboxSafetyProblems(dom).some((p) => p.path === "screen.sandbox.network[0].dest"));
  });

  test("FAIL-2220: a SHA-256 is 64 hex characters; a 65-character one is caught as a blob", () => {
    const d = clone(docOf("ceh-sandbox-invoice-loader"));
    assert.equal(d.screen.sandbox!.indicators[0].value.length, 64);
    d.screen.sandbox!.indicators[0].value += "1";
    assert.ok(sandboxSafetyProblems(d).some((p) => p.path === "screen.sandbox.indicators[0].value"));
  });
});

describe("the three renderers are on and negotiated", () => {
  test("SIMS_RENDERERS defaults include them; the env can turn them off", () => {
    for (const t of ["facility-console", "sandbox-report", "trainer"]) {
      assert.ok((DEFAULT_RENDERERS as readonly string[]).includes(t), t);
      assert.ok(renderersOn({}).includes(t), t);
      assert.ok(!renderersOn({ SIMS_RENDERERS: "bedside,board" }).includes(t), t);
    }
  });

  test("an app that advertises a screen can run its sims; an older app is told to update", () => {
    const old = parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,security-console@1,treatment-session@1,terminal@1")!;
    const now = parseCaps("protocol=1;engine=1.2;renderers=bedside@3,facility-console@1,sandbox-report@1,trainer@1")!;
    for (const t of ["facility-console", "sandbox-report", "trainer"]) {
      const need = { engine_major: 1, engine_minor: 2, renderer_level: 1, screen_type: t };
      assert.equal(runnable(need, now), true, t);
      assert.equal(runnable(need, old), false, t);
    }
  });
});

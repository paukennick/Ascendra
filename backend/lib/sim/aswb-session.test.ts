// REQ-288: the ASWB client sessions (docs/sims.md 22.22). Same screen, profile
// and pacing as the NCE/NCMHCE sessions (REQ-239): learner-paced turns, the
// clinical-session profile, registered by course code and exact objective
// title. Each case has endings in all three classes, 3-4 critical criteria,
// KPIs, an expert path, a debrief per ending, 5-8 golden paths that reach every
// ending but time_up and score every criterion both met and missed, and an
// explicit endingOrder.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASWB_OBJECTIVES, ASWB_SESSION_DOCUMENTS, WAJP_OBJECTIVES, WAJP_SESSION_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, GoldenFile, ScenarioDoc } from "./engine/v1/index.ts";
import { pacingEligible } from "./server-run.ts";
import { scenarioSchema } from "./schema.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { ASWB_CLINICAL_SIM_OBJECTIVES, ASWB_MASTERS_SIM_OBJECTIVES } from "../../supabase/seed/tracks/aswb";

const docOf = (slug: string): ScenarioDoc => loadDocument(ASWB_SESSION_DOCUMENTS.find((e) => e.slug === slug)!);
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(ASWB_SESSION_DOCUMENTS.find((e) => e.slug === slug)!.golden!, "utf8")) as GoldenFile;

describe("REQ-288: ASWB client sessions", () => {
  test("each registered to an active objective of its own course by exact title, and the seed names the same titles", () => {
    assert.ok(ASWB_SESSION_DOCUMENTS.length >= 2);
    assert.deepEqual(Object.keys(ASWB_OBJECTIVES).sort(), ASWB_SESSION_DOCUMENTS.map((e) => e.slug).sort());
    const seeded = [...Object.values(ASWB_CLINICAL_SIM_OBJECTIVES), ...Object.values(ASWB_MASTERS_SIM_OBJECTIVES)];
    // REQ-288's four flagship titles are exported by the seed; the REQ-289
    // coverage sessions sit on ordinary outline objectives (checked below).
    for (const title of seeded) assert.ok(Object.values(ASWB_OBJECTIVES).includes(title), `a session is registered to "${title}"`);
    for (const e of ASWB_SESSION_DOCUMENTS) {
      assert.ok(e.course === "ASWBCLINICAL" || e.course === "ASWBMASTERS");
      assert.match(e.slug, e.course === "ASWBCLINICAL" ? /^aswbc-/ : /^aswbm-/);
      const d = loadDocument(e);
      assert.equal(d.objective, ASWB_OBJECTIVES[e.slug], e.slug);
      const track = CATALOG_TRACKS.find((t) => t.code === e.course)!;
      assert.equal(track.subcategorySlug, "social-work-licensure", "the 18+ gate comes from the mental health category");
      const hits = activeUnits(track).filter((u) => u.objectives.includes(d.objective));
      assert.equal(hits.length, 1, `${e.course} has exactly one active "${d.objective}"`);
      assert.equal(e.source, "authored");
    }
  });

  test("valid, session screen, clinical-session profile, learner-paced", () => {
    for (const e of ASWB_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(d.screen.type, "session");
      assert.ok(d.screen.session!.gauges.length >= 3, e.slug);
      assert.equal(d.outcome.profile, "clinical-session");
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: no running phase`);
      assert.equal(pacingEligible(d, "clinical"), false);
      assert.ok(d.outcome.noProgress, `${e.slug}: noProgress declared`);
      assert.ok(d.outcome.thresholds.safetyWindow.value <= 1200, `${e.slug}: safetyWindow may be tightened, never loosened`);
      assert.ok(d.outcome.thresholds.allianceTarget.value >= 6 && d.outcome.thresholds.allianceRecovered.value >= 3, e.slug);
    }
  });

  test("endings in all three classes, an explicit endingOrder, a debrief for every ending", () => {
    for (const e of ASWB_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const classes = new Set(Object.values(d.endings).map((x) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      const conditional = Object.entries(d.endings).filter(([, x]) => x.when).map(([k]) => k);
      assert.deepEqual([...(d.endingOrder ?? [])].sort(), conditional.sort(), `${e.slug}: endingOrder lists every conditional ending`);
      assert.equal(d.engine.minor, 2);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief?.[k], `${e.slug}: debrief for ${k}`);
    }
  });

  test("3-4 critical criteria, KPIs with expert values, an expert path, sources dated and the ASWB outline cited", () => {
    for (const e of ASWB_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const critical = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(critical >= 3 && critical <= 4, `${e.slug}: ${critical} critical`);
      assert.ok(d.scoring.kpis!.length >= 3 && d.scoring.kpis!.every((k) => k.expert), e.slug);
      assert.ok(d.scoring.expertPath!.length >= 4, e.slug);
      assert.ok(d.sources.length >= 2, e.slug);
      for (const s of d.sources) assert.equal(s.checkedAt, "2026-11-14", `${e.slug}: ${s.cite}`);
      assert.ok(d.sources.some((s) => /aswb\.org/.test(s.url ?? "")), `${e.slug}: cites the ASWB outline`);
      assert.ok(d.sources.some((s) => /socialworkers\.org/.test(s.url ?? "")), `${e.slug}: cites the NASW Code`);
    }
  });

  test("golden paths: 5-8 per case, every ending but time_up reached, every criterion both met and missed, a Good, a Mediocre and a Bad", () => {
    for (const e of ASWB_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const g = goldenOf(e.slug);
      assert.ok(g.paths.length >= 5 && g.paths.length <= 8, `${e.slug}: ${g.paths.length} paths`);
      const reached = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(reached.has(k), `${e.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: no ${r} path`);
      for (const c of d.scoring.criteria) {
        const scores = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(scores.has("met") && scores.has("missed"), `${e.slug}: ${c.id} is ${[...scores].join("/")}`);
      }
      const expert = g.paths.find((p) => p.id === "expert")!;
      assert.equal(expert.expect.rating, "good", `${e.slug}: the expert path rates Good`);
    }
  });

  test("the suicide-risk case names 988 and the Stanley-Brown steps", () => {
    const d = docOf("aswbc-suicide-violence-risk");
    assert.ok(d.sources.some((s) => /988/.test(s.cite)));
    assert.match(JSON.stringify(d.actions.planStep), /988 by call or text/);
  });
});

describe("REQ-289: coverage sessions and bands", () => {
  // FAIL-1884: sim:golden built goldens for documents the schema refuses (an
  // action label over 200 characters, a source cite over 500); only sims:lint
  // parses the schema. Every ASWB and jurisprudence document is parsed here.
  test("every ASWB and jurisprudence session, bands compiled, parses against the scenario schema", () => {
    for (const e of [...ASWB_SESSION_DOCUMENTS, ...WAJP_SESSION_DOCUMENTS]) {
      const parsed = scenarioSchema.safeParse(loadDocument(e));
      assert.ok(parsed.success, `${e.slug}: ${parsed.success ? "" : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    }
  });

  test("the shared ASWB objectives reuse one session per pair through a band, and each band is on its own course's objective", () => {
    const bands = ASWB_SESSION_DOCUMENTS.filter((e) => e.kind === "band").map((e) => e.slug).sort();
    assert.deepEqual(bands, ["aswbc-boundaries-small-town", "aswbm-suicide-violence-risk", "aswbm-termination-nonpayment"]);
    for (const slug of bands) {
      const d = docOf(slug);
      assert.ok(d.sources[0].url?.includes("aswb.org"));
      assert.match(d.sources[0].cite, slug.startsWith("aswbc-") ? /Clinical content outline/ : /Masters content outline/, slug);
    }
    assert.doesNotMatch(docOf("aswbm-suicide-violence-risk").brief.situation, /clinical social worker/, "a Masters social worker in the Masters band");
  });

  test("the Washington jurisprudence course has the EPPP duty-to-protect session on its own objective, with Washington's reference list cited", () => {
    assert.deepEqual(WAJP_SESSION_DOCUMENTS.map((e) => [e.course, e.slug, e.kind]), [["WAPSYCHJP", "wajp-duty-to-protect-threat", "band"]]);
    const e = WAJP_SESSION_DOCUMENTS[0];
    const d = loadDocument(e);
    assert.equal(d.objective, WAJP_OBJECTIVES[e.slug]);
    const track = CATALOG_TRACKS.find((t) => t.code === "WAPSYCHJP")!;
    assert.equal(track.subcategorySlug, "psychology-licensure");
    assert.equal(activeUnits(track).filter((u) => u.objectives.includes(d.objective)).length, 1);
    assert.deepEqual(validateScenario(d).map(String), []);
    assert.ok(d.sources.some((s) => /doh\.wa\.gov/.test(s.url ?? "")), "DOH's reference list");
    assert.ok(d.sources.some((s) => /71\.05\.120/.test(s.cite)), "RCW 71.05.120(3)");
    const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
    assert.equal(g.paths.find((p) => p.id === "expert")!.expect.rating, "good");
  });
});

describe("the people layer in the ASWB cases", () => {
  function driver(doc: ScenarioDoc) {
    const run = createRun(doc, 1);
    let seq = 0;
    const send = (c: Record<string, unknown>) => {
      const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
      assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
    };
    return {
      run,
      act: (action: string, params?: Record<string, string>) => send({ type: "act", action, ...(params ? { params } : {}) }),
      choose: (choice: string) => send({ type: "choose", prompt: run.state.openPrompt, choice }),
      cont: () => {
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      },
      value: (n: string) => readValue(run, n),
    };
  }

  test("the risk case: last spring's episode with the rifle is told only once he trusts you", () => {
    const cold = driver(docOf("aswbc-suicide-violence-risk"));
    cold.act("askHistory");
    assert.equal(cold.value("historyKnown"), false);
    const warm = driver(docOf("aswbc-suicide-violence-risk"));
    warm.act("checkIn");
    warm.choose("explore");
    warm.cont();
    warm.act("reflect");
    warm.cont();
    warm.act("askHistory");
    assert.equal(warm.value("historyKnown"), true);
  });

  test("the threat case: the pistol and the day come out only when he trusts you; disclosing first is premature", () => {
    const d = driver(docOf("aswbc-threat-identifiable-person"));
    d.act("checkIn");
    d.choose("explore");
    d.cont();
    d.act("disclose");
    assert.equal(d.value("premature"), true);
    assert.equal(d.value("threatKnown"), false);
    const w = driver(docOf("aswbc-threat-identifiable-person"));
    w.act("checkIn");
    w.choose("explore");
    w.cont();
    w.act("reflect");
    w.cont();
    w.act("explore");
    assert.equal(w.value("threatKnown"), true);
  });

  test("the mandated client: his own goals come out only once he trusts you; goals written for him make an imposed contract", () => {
    const cold = driver(docOf("aswbm-involuntary-engagement"));
    cold.choose("reflect");
    cold.act("askWants");
    assert.equal(cold.value("goalFound"), false);
    const imposed = driver(docOf("aswbm-involuntary-engagement"));
    imposed.choose("persuade");
    imposed.act("imposeGoals");
    imposed.cont();
    imposed.act("contract");
    assert.equal(imposed.value("contractKind"), "imposed");
  });

  test("the child abuse report: reasonable cause is in the notes from the start, and a report can be made before the mother says anything", () => {
    const d = driver(docOf("aswbm-child-abuse-report"));
    d.choose("enough");
    d.act("callNow");
    assert.equal(d.value("reported"), true);
    assert.equal(d.value("reportedWhen"), "session");
  });
});

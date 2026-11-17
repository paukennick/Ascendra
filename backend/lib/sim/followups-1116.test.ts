// REQ-318 (Nick, 2026-11-16): two clinical follow-ups from the verify pass.
//   - NCLEX-RN postpartum hemorrhage: methylergonovine given to this
//     hypertensive client ends the run as harm (FAIL-2280), whatever else
//     goes right. Contraindicated in hypertension and toxemia (American
//     Regent label, revised 08/2025); OpenStax Maternal-Newborn 21.2, citing
//     ACOG 2017: "should not be given ... hypertension or preeclampsia".
//   - CCRN Adult stroke: labetalol and nicardipine respond on their labels'
//     time scales (FAIL-2281), and the case still has Good, Mediocre and Bad
//     paths with every criterion met and missed.
// Documents are selected by slug (FAIL-2002).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import type { GoldenFile, GoldenPath, ScenarioDoc } from "./engine/v1/index.ts";
import type { Ctl } from "../../scripts/sim-golden/steps.ts";
import { pace, teach, until } from "../../scripts/sim-golden/s2b-helpers.ts";

const entryOf = (slug: string) => {
  const e = ALL_DOCUMENTS.find((x) => x.slug === slug);
  assert.ok(e, slug);
  return e!;
};
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;

// Drives a document with the golden builder (scripts/sim-golden) into a
// throwaway golden file and returns the one path's expectations.
async function drive(doc: ScenarioDoc, fn: (c: Ctl) => void): Promise<GoldenPath["expect"]> {
  const { buildSteps } = await import("../../scripts/sim-golden/steps.ts");
  const dir = mkdtempSync(join(tmpdir(), "req318-"));
  try {
    const file = join(dir, "p.golden.json");
    buildSteps(doc, file, { slug: doc.slug, paths: [{ id: "p", title: "p", reasoning: "met", drive: fn }] });
    return (JSON.parse(readFileSync(file, "utf8")) as GoldenFile).paths[0].expect;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("REQ-318: postpartum hemorrhage, methylergonovine in hypertension is harm (FAIL-2280)", () => {
  const SLUG = "postpartum-hemorrhage-atony";

  test("the document lists the harm ending in endingOrder, before the controlled endings", () => {
    const d = docOf(SLUG);
    assert.equal(d.endings.metherHarm.class, "harm");
    assert.equal(d.endings.metherHarm.terminal, true);
    const order = d.endingOrder!;
    assert.ok(order.indexOf("metherHarm") >= 0 && order.indexOf("metherHarm") < order.indexOf("controlled"));
    assert.ok(order.indexOf("metherHarm") < order.indexOf("controlledLate"));
    assert.doesNotMatch(d.endings.controlledLate.narrative ?? "", /drug/);
  });

  test("the label and the OpenStax chapter are among the sources, dated", () => {
    const cites = docOf(SLUG).sources!.map((s) => `${s.cite} ${s.checkedAt}`);
    assert.ok(cites.some((c) => /Methylergonovine maleate injection.*American Regent, revised August 2025.* 2026-11-16/.test(c)), cites.join("\n"));
    assert.ok(cites.some((c) => /OpenStax\. Maternal-Newborn Nursing.*21\.2.* 2026-11-16/.test(c)), cites.join("\n"));
  });

  test("the golden methergine path ends as harm with a Bad rating", () => {
    const p = goldenOf(SLUG).paths.find((x) => x.id === "methergine")!;
    assert.equal(p.expect.ending, "metherHarm");
    assert.equal(p.expect.class, "harm");
    assert.equal(p.expect.rating, "bad");
  });

  test("every golden path that gives methylergonovine ends as harm; none that doesn't ends metherHarm", () => {
    for (const p of goldenOf(SLUG).paths) {
      const gave = p.commands.some((c) => (c as { action?: string }).action === "methergine");
      if (gave) assert.equal(p.expect.class, "harm", p.id);
      else assert.notEqual(p.expect.ending, "metherHarm", p.id);
    }
  });

  test("the expert path plus methylergonovine: harm, not controlled", async () => {
    // The expert path (scripts/sim-golden/rn-pph.steps.ts) with one change:
    // methylergonovine from the kit right after the oxytocin.
    const expect = await drive(docOf(SLUG), (c) => {
      const ended = () => c.run.state.ended !== null;
      const act = (a: string, p?: Record<string, string>) => {
        if (ended()) return;
        c.act(a, p);
        teach(c);
      };
      pace(c, 3);
      until(c, (x) => x.run.state.tick >= 5);
      act("fundus");
      act("massage");
      act("oxytocin");
      act("methergine");
      act("bladder");
      until(c, (x) => x.value("cathPending") === false || x.run.state.ended !== null);
      act("massage");
      act("weigh");
      until(c, (x) => x.value("qblPending") === false || x.run.state.ended !== null);
      act("iv");
      act("escalate", { who: "team", say: "numbers" });
      until(c, (x) => x.value("teamHere") === true || x.run.state.ended !== null);
      act("carboprost");
      act("txa");
      act("massage");
      until(c, (x) => x.run.state.ended !== null);
    });
    assert.equal(expect.ending, "metherHarm");
    assert.equal(expect.class, "harm");
  });
});

describe("REQ-318: stroke case, drug response on the labels' time scales (FAIL-2281)", () => {
  const SLUG = "acute-ischemic-stroke-lvo";

  test("labetalol fades with its 5.5-hour half-life and nicardipine reaches half its effect in 45 minutes", () => {
    const p = docOf(SLUG).params;
    const half = (tauMin: number) => tauMin * Math.LN2;
    assert.ok(Math.abs(half(p.labTau.value as number) - 330) <= 3, `labetalol half-life ${half(p.labTau.value as number)} min`);
    assert.ok(Math.abs(half(p.nicTau.value as number) - 45) <= 1, `nicardipine half-effect ${half(p.nicTau.value as number)} min`);
    // 17 h after a dose, most of its effect is gone (label: back toward baseline in 16-18 h).
    assert.ok(Math.exp((-17 * 60) / (p.labTau.value as number)) < 0.15);
  });

  test("the notes say what was approximated and cite the Hikma and Baxter labels, read 2026-11-16", () => {
    const p = docOf(SLUG).params;
    assert.match(p.labTau.source!.cite, /Hikma, revised August 2024/);
    assert.match(p.nicTau.source!.cite, /Baxter, revised April 2026/);
    for (const k of ["labTau", "nicTau"] as const) {
      assert.equal(p[k].source!.checkedAt, "2026-11-16", k);
      assert.match(p[k].source!.note ?? "", /Approximated \(REQ-318\)/, k);
      assert.doesNotMatch(p[k].source!.note ?? "", /left as authored|kept as authored/, k);
    }
  });

  test("Good, Mediocre and Bad paths remain, and every criterion is both met and missed", () => {
    const g = goldenOf(SLUG);
    const ratings = new Set(g.paths.map((x) => x.expect.rating));
    for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), r);
    for (const c of docOf(SLUG).scoring.criteria) {
      const seen = new Set(g.paths.map((x) => x.expect.criteria?.[c.id]));
      assert.ok(seen.has("met"), `${c.id} met`);
      assert.ok(seen.has("missed"), `${c.id} missed`);
    }
  });

  test("one labetalol dose and no further BP care still drifts back over 180/105 after thrombolysis", () => {
    const p = goldenOf(SLUG).paths.find((x) => x.id === "bpDrift")!;
    assert.equal(p.expect.ending, "bleed");
    assert.equal(p.expect.criteria?.bpAfter, "missed");
  });
});

// REQ-269 (docs/sims.md 22.21): sims for the courses built in REQ-264..268
// on screens that already exist: SQL Fundamentals and TypeScript & Node.js
// on the terminal (infrastructure profile), SC-500 on the security console
// (security profile), AI-200 on the terminal. Each is valid, learner-paced,
// engine 1.2 with an ending order, on its own course's catalog objective
// that meets the generator's selection rule, and its golden paths reach
// every ending but time_up, every rating, and every criterion met and missed.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { validateScenario } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import { pacingEligible } from "./server-run.ts";
import { backslashEscapeProblems, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { isPerformanceObjective } from "../../scripts/generate-labs-lib.ts";

const SCREEN: Record<string, { type: string; profile: string }> = {
  SQL: { type: "terminal", profile: "infrastructure" },
  TSNODE: { type: "terminal", profile: "infrastructure" },
  SC500: { type: "security-console", profile: "security" },
  AI200: { type: "terminal", profile: "infrastructure" },
};
const MINE = ALL_DOCUMENTS.filter((e) => e.course in SCREEN);

// Every string a learner can see, without the citations (whose URLs are real).
function visibleStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) visibleStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "sources" && k !== "source") visibleStrings(x, out);
  return out;
}

describe("REQ-269 sims for the new technology courses", () => {
  test("two per course, authored scenarios", () => {
    for (const c of Object.keys(SCREEN)) assert.equal(MINE.filter((e) => e.course === c).length, 2, c);
    for (const e of MINE) {
      assert.equal(e.kind, "scenario");
      assert.equal(e.source, "authored");
    }
  });

  test("valid, on the right screen and profile, learner-paced, engine 1.2 with endingOrder", () => {
    for (const e of MINE) {
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(d.screen.type, SCREEN[e.course].type, e.slug);
      assert.equal(d.outcome.profile, SCREEN[e.course].profile, e.slug);
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, e.slug);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: learner-paced`);
      assert.equal(pacingEligible(d, "general"), false);
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.entries(d.endings).filter(([id]) => id !== "time_up").map(([, x]) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      for (const id of Object.keys(d.endings)) assert.ok(d.scoring.debrief[id], `${e.slug}: debrief for ${id}`);
      assert.ok(d.scoring.expertPath.length >= 3 && d.scoring.kpis.length >= 3, e.slug);
      assert.deepEqual(secondsUnitProblems(d), [], e.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], e.slug);
      for (const s of d.sources) assert.match(s.checkedAt, /^2026-11-1[4-9]$/, `${e.slug}: ${s.cite}`);
    }
  });

  test("each is on an active objective of its own course, distinct, meeting the selection rule", () => {
    for (const c of Object.keys(SCREEN)) {
      const track = CATALOG_TRACKS.find((t) => t.code === c)!;
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const objs = MINE.filter((e) => e.course === c).map((e) => loadDocument(e));
      assert.equal(new Set(objs.map((d) => d.objective)).size, objs.length, c);
      for (const d of objs) {
        assert.ok(titles.has(d.objective), `${c}: ${d.objective}`);
        assert.ok(isPerformanceObjective(d.objective, "general"), d.objective);
        for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${c}: secondary ${s}`);
      }
    }
  });

  test("goldens reach every ending but time_up, every rating, and every criterion met and missed", () => {
    for (const e of MINE) {
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      assert.ok(g.paths.length >= 5 && g.paths.length <= 6, `${e.slug}: 5-6 golden paths`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), `${e.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: ${r}`);
      for (const c of d.scoring.criteria) {
        const seen = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(seen.has("met") && seen.has("missed"), `${e.slug}: ${c.id} met and missed (${[...seen].join(",")})`);
      }
      const expert = g.paths.find((p) => p.id === "expert")!;
      assert.equal(expert.expect.class, "target", e.slug);
    }
  });

  test("terminal commands are bounded (no free-text params)", () => {
    for (const e of MINE.filter((x) => SCREEN[x.course].type === "terminal")) {
      const d = loadDocument(e);
      for (const id of d.phases.incident.actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${e.slug}.${id}`);
    }
  });

  test("fictional names only: documentation domains and addresses (RFC 2606, RFC 5737)", () => {
    for (const e of MINE) {
      const text = visibleStrings(loadDocument(e)).join("\n");
      for (const m of text.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|dev)\b/gi) ?? []) assert.match(m, /(^|\.)example\.(com|net|org)$/i, `${e.slug}: ${m}`);
      for (const m of text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) ?? []) assert.match(m, /^(192\.0\.2|198\.51\.100|203\.0\.113|10\.\d+\.\d+|127\.0\.0)\.\d+$/, `${e.slug}: ${m}`);
    }
  });
});

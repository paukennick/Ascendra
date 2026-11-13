// REQ-235 (batch H wave 1, "make holds rare"): the seven launch courses carry
// dated unit sources (official outline statements and key values), and the
// lesson writer and the fact-checker are given the same statements. Pure data
// test -- it reads the seed modules, no database, no model.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { currentFactsBlock, courseOutlineLines, unitReferenceLines } from "./current-facts";
import { factCheckPrompt } from "./fact-check";
import { lessonIntroPrompt } from "./prompts";
import { SOURCE_KINDS } from "../supabase/seed/sources";

const LAUNCH = ["DPT", "PTPREREQ", "CCRNADULT", "AWSSAA", "AWSMLA", "SECPLUS", "CNA"];
const track = (code: string) => CATALOG_TRACKS.find((t) => t.code === code)!;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("REQ-235: every launch course unit has dated sources (FAIL-1404)", () => {
  for (const code of LAUNCH) {
    test(`${code}: every taught unit names at least one dated source; every key value and outline line is non-empty`, () => {
      for (const u of activeUnits(track(code))) {
        assert.ok(u.sources?.length, `${code} / ${u.title} has no sources`);
        for (const s of u.sources!) {
          assert.match(s.checkedAt, DATE, `${u.title}: ${s.title}`);
          assert.ok((SOURCE_KINDS as readonly string[]).includes(s.kind));
          assert.ok(s.url.startsWith("https://"));
          for (const v of [...(s.keyValues ?? []), ...(s.outline ?? [])]) assert.ok(v.trim().length > 10, `${u.title}: empty line`);
        }
      }
    });
  }

  test("the exam courses carry their official outline statements on every unit (FAIL-1405)", () => {
    for (const code of ["AWSSAA", "AWSMLA", "SECPLUS", "CNA"]) {
      for (const u of activeUnits(track(code))) {
        assert.ok(u.sources?.some((s) => s.outline?.length), `${code} / ${u.title} has no outline statements`);
      }
    }
    const saa = track("AWSSAA").units.flatMap((u) => u.sources ?? []).flatMap((s) => s.outline ?? []);
    assert.equal(saa.filter((l) => /^Task \d\.\d:/.test(l)).length, 14, "SAA-C03 has 14 task statements");
    const mla = track("AWSMLA").units.flatMap((u) => u.sources ?? []).flatMap((s) => s.outline ?? []);
    assert.equal(mla.length, 12, "MLA-C02 has 12 task statements");
    const sec = track("SECPLUS").units.flatMap((u) => u.sources ?? []).flatMap((s) => s.outline ?? []);
    assert.equal(sec.length, 28, "SY0-701 has 28 objectives (1.1-5.6)");
  });
});

describe("REQ-235: the writer and the checker get the same outline statements (FAIL-1405)", () => {
  test("a unit prompt names the unit's official statements first, then its references", () => {
    const t = track("AWSSAA");
    const lines = unitReferenceLines(t, "Design Cost-Optimized Architectures");
    assert.match(lines[0], /^- Official outline for this unit \(SAA-C03 exam guide, Domain 4, checked 2026-11-11; teach and test to these statements\): Task 4\.1: Design cost-optimized storage solutions\./);
    assert.ok(lines.some((l) => /S3 Glacier Deep Archive 180 days/.test(l)));
    const block = currentFactsBlock(t, "Design Cost-Optimized Architectures")!;
    const intro = lessonIntroPrompt({ trackTitle: t.title, unitTitle: "Design Cost-Optimized Architectures", objectiveTitle: "x", ctx: { trackTitle: t.title, trackType: "certification", currentFacts: block } as never });
    const check = factCheckPrompt({ items: [], ctx: { trackTitle: t.title, trackType: "certification", currentFacts: block } as never });
    assert.ok(intro.system.stable.includes("Task 4.4: Design cost-optimized network architectures."), "the writer gets it");
    assert.ok(check.system.stable.includes("Task 4.4: Design cost-optimized network architectures."), "the checker gets the same text");
  });

  test("with no unit in context (a whole-course prompt) the course outline is listed by unit, without key values", () => {
    const lines = courseOutlineLines(track("SECPLUS"));
    assert.equal(lines[0], "- Official outline, by unit (teach and test to these statements):");
    assert.ok(lines.some((l) => l.includes("Security Program Management and Oversight: 5.1 Summarize")));
    assert.ok(!lines.join("\n").includes("Key values"));
    assert.match(currentFactsBlock(track("SECPLUS"))!, /3\.4 Explain the importance of resilience and recovery in security architecture\./);
    assert.deepEqual(courseOutlineLines(track("MSCS")), [], "a course without outline statements adds nothing");
  });

  test("unchanged behavior: an unknown unit title still gives no reference lines", () => {
    assert.deepEqual(unitReferenceLines(track("CNA"), "no such unit"), []);
  });
});

describe("REQ-235 G5 follow-ups", () => {
  test("Security+: business continuity / DR leaves Security Operations; 3.4 and 5.2 teach it; the BIA lab moves to 5.2 (FAIL-1406)", () => {
    const units = activeUnits(track("SECPLUS"));
    const ops = units.find((u) => u.title === "Security Operations")!;
    assert.ok(!ops.objectives.some((o) => /business continuity and disaster recovery/i.test(o)), "retired in place");
    assert.ok(!/RTO|RPO/.test(ops.gate ?? ""), "the gate no longer asks for RTO/RPO");
    assert.ok(!(ops.labs ?? []).some((l) => l && /BIA/.test(l)));
    const arch = units.find((u) => u.title === "Security Architecture")!;
    assert.ok(arch.objectives.some((o) => /Resilience and recovery: .*backups/.test(o)), "3.4 is in Security Architecture");
    const pm = units.find((u) => u.title === "Security Program Management and Oversight")!;
    const i = pm.objectives.findIndex((o) => /business impact analysis with recovery time objective \(RTO\), recovery point objective \(RPO\)/.test(o));
    assert.ok(i >= 0, "5.2 BIA is in Program Management");
    assert.match(pm.labs![i] ?? "", /BIA outline/);
    // the retired row keeps its slot and id (never removed or reordered)
    const raw = track("SECPLUS").units.find((u) => u.title === "Security Operations")!;
    assert.match(raw.objectives[6], /^Business continuity and disaster recovery/);
    assert.ok(raw.objectiveRetiredAt?.[6]);
    assert.equal(raw.objectiveRetiredAt!.length, raw.objectives.length);
  });

  test("the PTA labs header no longer quotes the pre-2021 maintenance sentence as current (FAIL-1407)", () => {
    const src = readFileSync(join(__dirname, "..", "supabase/seed/labs/pt-nptepta.ts"), "utf8");
    const header = src.slice(0, src.indexOf("export const NPTEPTA_LABS"));
    assert.ok(!header.includes('"PTAs may not provide evaluative or assessment services'), "no quoted older sentence");
    assert.match(header, /Since 2021-01-01 the PT may delegate FURNISHING skilled\n\/\/ maintenance therapy to a PTA/);
  });

  test("CNA choking, sepsis and stroke key values re-read 2026-11-11; sepsis cultures are 'ideally before', not strictly before (FAIL-1408)", () => {
    const kv = (code: string, unit: RegExp) =>
      track(code).units.find((u) => unit.test(u.title))!.sources!.filter((s) => s.kind === "clinical_guideline");
    const choking = kv("CNA", /^Before resident contact$/)[0];
    assert.equal(choking.checkedAt, "2026-11-11");
    assert.match(choking.keyValues!.join(" "), /5 back blows, then 5 abdominal thrusts/);
    const sepsis = kv("CCRNADULT", /^Multisystem$/)[0];
    assert.equal(sepsis.checkedAt, "2026-11-11");
    assert.match(sepsis.keyValues!.join(" "), /ideally before antimicrobials/);
    assert.ok(!sepsis.keyValues!.some((v) => /^blood cultures before antimicrobials/.test(v)));
    const stroke = kv("CCRNADULT", /Neurological/)[0];
    assert.equal(stroke.checkedAt, "2026-11-11");
    assert.match(stroke.keyValues!.join(" "), /185\/110 mm Hg before IV thrombolysis, and below 180\/105/);
  });
});

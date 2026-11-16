// REQ-292 (Nick, 2026-11-14): the Python and Linux depth courses -- Python
// for Automation and Scripting, Python for Data Analysis, Linux Fundamentals
// and the LFCS -- as seeded: verified on the day their sources were read,
// dated sources on every unit, the LFCS domains at the published weights
// with the Linux Foundation's competency lines, the facts an older tutorial
// gets wrong pinned as key values, hybrid lab density, and no Red Hat or
// LPI course slipped in. Pure data test over the seed modules.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { PYAUTO_TRACK, PYDATA_TRACK } from "../supabase/seed/tracks/python-depth";
import { LINUXFUND_TRACK, LFCS_TRACK, LFCS_SIM_OBJECTIVES } from "../supabase/seed/tracks/linux";
import type { SeedTrack } from "../supabase/seed/data";
import { LAB_SETS } from "../supabase/seed/labs";
import { unitPlan } from "../scripts/generate-labs-lib";
import { courseOutlineProblems, dayOf } from "./content-currency";
import { currentFactsBlock } from "./current-facts";
import { courseCategoryOf } from "./billing-config";

const TODAY = new Date().toISOString().slice(0, 10);
const TECH: SeedTrack[] = [PYAUTO_TRACK, PYDATA_TRACK, LINUXFUND_TRACK];
const ALL: SeedTrack[] = [...TECH, LFCS_TRACK];
const facts = (t: SeedTrack, unit: RegExp) => currentFactsBlock(t, t.units.find((u) => unit.test(u.title))!.title) ?? "";

describe("REQ-292: Python and Linux depth courses", () => {
  test("each is in the catalog once, after the courses it builds on", () => {
    const codes = CATALOG_TRACKS.map((t) => t.code);
    for (const t of ALL) assert.equal(codes.filter((c) => c === t.code).length, 1, t.code);
    assert.ok(codes.indexOf("PYAUTO") > codes.indexOf("PYTHON"));
    assert.ok(codes.indexOf("PYDATA") > codes.indexOf("PYTHON"));
  });

  test("the three courses without an exam follow the PYTHON model: technology_aligned, curriculum, 12-month review", () => {
    for (const t of TECH) {
      assert.equal(t.freshnessModel, "technology_aligned", t.code);
      assert.equal(t.trackType, "graduate", t.code);
      assert.equal(t.credential, undefined, t.code);
      assert.equal(t.sourceUrl, undefined, `${t.code}: the curriculum is its outline`);
      assert.equal(dayOf(t.sourceVerifiedAt), "2026-11-14", t.code);
      assert.equal(dayOf(t.contentReviewDueAt), "2027-11-14", t.code);
      assert.equal(t.curriculum?.checkedAt, "2026-11-14", t.code);
      assert.deepEqual(courseOutlineProblems(t, TODAY), [], t.code);
      assert.doesNotMatch(t.title, /Coach$/, `${t.code}: only the listed courses keep Coach`);
      assert.equal(t.levelFlow, undefined, `${t.code}: the lead switches levelFlow on later`);
    }
    assert.equal(PYAUTO_TRACK.subcategorySlug, "programming-languages");
    assert.equal(PYDATA_TRACK.subcategorySlug, "data-science");
    assert.equal(LINUXFUND_TRACK.subcategorySlug, "operating-systems-servers");
    assert.equal(courseCategoryOf("development", "data-science"), "it_cloud");
    assert.equal(courseCategoryOf("it-software", "operating-systems-servers"), "it_cloud");
  });

  test("every unit names dated https sources, and every objective is unique with a gate per unit", () => {
    for (const t of ALL) {
      const all = t.units.flatMap((u) => u.objectives);
      assert.equal(new Set(all).size, all.length, t.code);
      for (const u of t.units) {
        assert.ok((u.sources ?? []).length >= 1, `${t.code} / ${u.title}`);
        for (const s of u.sources!) {
          assert.match(s.url, /^https:\/\//, s.url);
          assert.equal(s.checkedAt, "2026-11-14", `${t.code}: ${s.url}`);
          assert.ok(s.title.trim().length > 0);
        }
        assert.ok((u.gate ?? "").length > 40, `${t.code} / ${u.title}`);
        assert.ok(u.objectives.length >= 4, `${t.code} / ${u.title}`);
      }
    }
  });

  test("LFCS: the five domains at the published weights, each with the Linux Foundation's competency lines", () => {
    assert.deepEqual(
      activeUnits(LFCS_TRACK).map((u) => [u.title, u.weight]),
      [
        ["Operations Deployment", 25],
        ["Networking", 25],
        ["Storage", 20],
        ["Essential Commands", 20],
        ["Users and Groups", 10],
      ]
    );
    const counts = LFCS_TRACK.units.map((u) => u.sources!.find((s) => s.kind === "exam_outline")!.outline!.length);
    assert.deepEqual(counts, [8, 8, 7, 6, 5]);
    for (const u of LFCS_TRACK.units) {
      const o = u.sources!.find((s) => s.kind === "exam_outline")!;
      assert.match(o.url, /training\.linuxfoundation\.org\/certification\/linux-foundation-certified-sysadmin-lfcs/);
      // Objectives are ours: none copies a competency line.
      for (const obj of u.objectives) assert.ok(!o.outline!.includes(obj), obj);
      assert.equal(u.rangeLabel, `${u.weight}% of the exam`);
    }
  });

  test("LFCS: the format and pass mark as read, the trademark notice, and the LF provider block the Kubernetes courses use", () => {
    const c = LFCS_TRACK.credential!;
    assert.equal(c.examCode, "LFCS");
    assert.equal(c.durationMinutes, 120);
    assert.match(c.questionFormat!, /17-20 tasks/);
    assert.match(c.passingScorePolicy!, /67%/);
    assert.match(c.passingScorePolicy!, /valid for 2 years/);
    assert.equal(c.providerSlug, "linux-foundation");
    const cka = CATALOG_TRACKS.find((t) => t.code === "CKA")!.credential!;
    assert.equal(c.providerName, cka.providerName);
    assert.equal(c.providerUrl, cka.providerUrl);
    assert.equal(LFCS_TRACK.subcategorySlug, "cncf-certifications");
    assert.match(LFCS_TRACK.title, /^Prep for the .+ Exam$/);
    assert.match(LFCS_TRACK.description, /not affiliated with or endorsed by The Linux Foundation\./);
    assert.ok(dayOf(LFCS_TRACK.contentReviewDueAt)! > dayOf(LFCS_TRACK.sourceVerifiedAt)!);
  });

  test("the sim objectives exist with exactly these titles, in the right domains", () => {
    const where = (title: string) => LFCS_TRACK.units.filter((u) => u.objectives.includes(title)).map((u) => u.title);
    assert.deepEqual(where(LFCS_SIM_OBJECTIVES.fstab), ["Operations Deployment"]);
    assert.deepEqual(where(LFCS_SIM_OBJECTIVES.lvm), ["Storage"]);
  });

  test("no Red Hat or LPI course is added (REQ-194; LPIC-1 deferred), and no Red Hat course number appears", () => {
    for (const t of ALL) {
      const text = [t.title, t.description, ...t.units.flatMap((u) => [u.title, u.gate ?? "", ...u.objectives])].join(" ");
      assert.doesNotMatch(text, /Red Hat|RHEL|RHCSA|\bEX\d{3}\b|LPIC/, t.code);
    }
    assert.equal(CATALOG_TRACKS.filter((t) => /^(RHCSA|EX200|LPIC)/.test(t.code)).length, 0);
  });

  test("the facts an older tutorial gets wrong are pinned for the lesson writer", () => {
    assert.match(facts(PYAUTO_TRACK, /^Command-line/), /exits with status 2/);
    assert.match(facts(PYAUTO_TRACK, /^Files/), /Path\.copy\(\)/);
    assert.match(facts(PYAUTO_TRACK, /^Logging/), /default level is WARNING/);
    assert.match(facts(PYAUTO_TRACK, /^Regular/), /re\.prefixmatch/);
    assert.match(facts(PYAUTO_TRACK, /^Running other programs/), /shell injection/);
    assert.match(facts(PYAUTO_TRACK, /^Scheduling/), /unescaped %/);
    assert.match(facts(PYDATA_TRACK, /^pandas: loading/), /chained assignment/);
    assert.match(facts(PYDATA_TRACK, /^pandas: loading/), /str dtype/);
    assert.match(facts(PYDATA_TRACK, /^Time series/), /ME, QE and YE/);
    assert.match(facts(PYDATA_TRACK, /^Cleaning/), /applymap/);
    assert.match(facts(PYDATA_TRACK, /^NumPy/), /default_rng/);
    assert.match(facts(LINUXFUND_TRACK, /^Users, groups/), /usermod -aG/);
    assert.match(facts(LINUXFUND_TRACK, /^Storage/), /deleted files/);
    assert.match(facts(LFCS_TRACK, /^Storage/), /grow-only/);
    assert.match(facts(LFCS_TRACK, /^Operations/), /sysctl --system/);
  });

  test("no objective or gate teaches a removed or legacy feature as current", () => {
    const OUTDATED = /distutils|setup\.py|applymap|SettingWithCopy|apt-key|ifconfig|netstat|\bifup\b|iptables-save|resample\("M"\)|utcnow|python 2/i;
    for (const t of ALL) {
      for (const u of t.units) {
        for (const line of [u.title, u.gate ?? "", ...u.objectives]) assert.doesNotMatch(line, OUTDATED, `${t.code}: ${line}`);
      }
    }
  });

  test("labs follow the hybrid density unit by unit, one lab per objective, both kinds", () => {
    const want: Record<string, number> = { PYAUTO: 16, PYDATA: 14, LINUXFUND: 16, LFCS: 11 };
    for (const t of ALL) {
      const set = LAB_SETS.find((s) => s.trackCode === t.code);
      assert.ok(set, `${t.code} has a lab set`);
      const units = activeUnits(t);
      const plan = unitPlan({ code: t.code, family: "general", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) }, "hybrid");
      assert.deepEqual(units.map((u) => set!.labs.filter((l) => u.objectives.includes(l.objective)).length), plan, t.code);
      assert.equal(set!.labs.length, want[t.code], t.code);
      const objectives = set!.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${t.code}: one lab per objective`);
      assert.ok(set!.labs.some((l) => l.kind === "build") && set!.labs.some((l) => l.kind === "case"), t.code);
      assert.ok(set!.labs.every((l) => l.slug.startsWith(`${t.code.toLowerCase()}-`)), t.code);
      for (const s of set!.sources) assert.equal(s.checkedAt, "2026-11-14", s.url);
    }
    const lfcsOutline = LAB_SETS.find((s) => s.trackCode === "LFCS")!.sources.find((s) => s.kind === "exam_outline");
    assert.match(lfcsOutline!.url, /linux-foundation-certified-sysadmin-lfcs/);
  });

  test("the LFCS labs leave the two sim objectives to the sims", () => {
    const labs = LAB_SETS.find((s) => s.trackCode === "LFCS")!.labs.map((l) => l.objective);
    assert.ok(!labs.includes(LFCS_SIM_OBJECTIVES.fstab));
    assert.ok(!labs.includes(LFCS_SIM_OBJECTIVES.lvm));
  });
});

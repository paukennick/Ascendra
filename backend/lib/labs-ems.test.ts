// REQ-174 (EMT, EMR) and REQ-182 (Paramedic, AEMT): the NREMT EMS courses' tracks and authored labs. The generic
// content, objective and slug checks run over every lab set in labs.test.ts;
// this file adds the clinical framing, the adopted density (hybrid,
// docs/labs.md "Density"), the dated value sources every EMS lab must carry,
// and the scope rules that differ by level, in its own file so parallel lab
// waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { EMS_TRACKS } from "../supabase/seed/tracks/ems";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";
import { SCHEMA_PROBES } from "./schema-status";

const CODES = EMS_TRACKS.map((t) => t.code);

describe("NREMT EMS courses (REQ-174)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  const setFor = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;
  const allText = (code: string) =>
    setFor(code)
      .labs.flatMap((l) => [l.brief, ...l.steps.flatMap((s) => [s.text, s.ask, ...s.parts.flatMap((p) => [p.criteria, p.modelAnswer])])])
      .join(" ");

  test("every EMS track is in the catalog, under the EMS subcategory, gated and weighted by its published ranges", () => {
    for (const t of EMS_TRACKS) {
      assert.ok(tracks.has(t.code), t.code);
      assert.equal(t.subcategorySlug, "emergency-medical-services", t.code);
      assert.equal(t.credential?.subcategorySlug, "emergency-medical-services", t.code);
      assert.equal(t.credential?.basis, "vendor_exam_unpublished_code", t.code);
      assert.equal(t.requiresAcknowledgement, true, t.code);
      for (const u of activeUnits(t)) {
        // weight is the midpoint of the published range shown in rangeLabel
        const m = /^(\d+)-(\d+)% of the exam$/.exec(u.rangeLabel ?? "");
        assert.ok(m, `${t.code}/${u.title}: rangeLabel`);
        assert.equal(u.weight, (Number(m![1]) + Number(m![2])) / 2, `${t.code}/${u.title}: weight is the range midpoint`);
      }
    }
  });

  test("credential text fits its columns (credential_exams exam_revision and objectives_revision are varchar(100))", () => {
    for (const t of EMS_TRACKS) {
      assert.ok((t.credential?.examRevision ?? "").length <= 100, `${t.code}: examRevision`);
      assert.ok((t.credential?.objectivesRevision ?? "").length <= 100, `${t.code}: objectivesRevision`);
    }
  });

  test("titles describe the exam rather than brand the course with NREMT's marks, and descriptions say so (NREMT trademark page)", () => {
    for (const t of EMS_TRACKS) {
      assert.match(t.title, /^Prep for the National Registry .+ Exam$/, t.code);
      assert.doesNotMatch(t.title, /\bNREMT\b|\bCoach\b/, t.code);
      assert.match(t.description, /not affiliated with or endorsed by the National Registry/, t.code);
      assert.match(t.description, /NREMT are trademarks of the National Registry of Emergency Medical Technicians/, t.code);
    }
  });

  test("migration 061 has a schema probe for the subcategory the seed resolves", () => {
    const probe = SCHEMA_PROBES.find((p) => p.migration === "061_ems_taxonomy.sql");
    assert.ok(probe && probe.sql.includes("emergency-medical-services"));
  });

  test("each course has a lab set citing its NREMT outline and the scope model", () => {
    for (const code of CODES) {
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has labs`);
      assert.ok(set!.sources.some((s) => s.kind === "exam_outline" && s.url.includes("nremt.org")), `${code} cites its outline`);
      assert.ok(set!.sources.every((s) => s.url.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt)), `${code}: dated https sources`);
    }
  });

  test("every lab carries the clinical safety note, calls its people fictional and never asks about a real patient", () => {
    for (const code of CODES) {
      for (const lab of setFor(code).labs) {
        assert.equal(lab.safetyNote, CLINICAL_SAFETY, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional/i, `${code}/${lab.slug}: the brief says the person is fictional`);
        const asks = lab.steps.map((s) => s.ask).join(" ");
        assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, `${code}/${lab.slug}`);
        if (lab.kind === "build") assert.equal(lab.steps[0].text, "", `${code}/${lab.slug}: a build lab's step has no text`);
      }
    }
  });

  test("every lab names the dated guideline its values rest on, or why it names none", () => {
    for (const code of CODES) {
      for (const lab of setFor(code).labs) {
        const own = lab.sources ?? [];
        assert.ok(own.length > 0 || (lab.noValueSource ?? "").length > 20, `${code}/${lab.slug}: cite a source or say why not`);
        assert.ok(!(own.length > 0 && lab.noValueSource), `${code}/${lab.slug}: not both`);
        for (const s of own) {
          assert.ok(s.kind === "clinical_guideline" || s.kind === "reference", `${code}/${lab.slug}: ${s.url}`);
          assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}/${lab.slug}: checkedAt`);
        }
      }
    }
  });

  test("each course follows the recommended density (hybrid) unit by unit, one lab per objective", () => {
    for (const code of CODES) {
      const units = activeUnits(tracks.get(code)!);
      const plan: PlanTrack = {
        code,
        family: "clinical",
        units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })),
      };
      const set = setFor(code);
      const got = units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, unitPlan(plan, "hybrid"), code);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
    }
  });

  test("case labs (an unfolding call) dominate each course", () => {
    for (const code of CODES) {
      const labs = setFor(code).labs;
      const cases = labs.filter((l) => l.kind === "case").length;
      assert.ok(cases > labs.length / 2 && labs.some((l) => l.kind === "build"), `${code}: ${cases} case of ${labs.length}`);
    }
  });

  test("EMT labs stay in EMT scope: nitroglycerin only as the patient's own, no IV, no advanced airway, no 12-lead interpretation", () => {
    const text = allText("NREMTEMT");
    assert.match(text, /patient's own nitroglycerin|her nitroglycerin|own nitroglycerin/i);
    assert.doesNotMatch(text, /\b(I|we) (start|place|insert) an? (IV|intravenous|IO|supraglottic|i-gel|King)\b/i);
    assert.match(text, /I don't read it myself|interpretation is by/i);
  });

  test("EMR labs stay in EMR scope: no pulse oximetry, glucose check, oral glucose, aspirin or transport by the EMR", () => {
    if (!CODES.includes("NREMTEMR")) return;
    const text = allText("NREMTEMR");
    assert.doesNotMatch(text, /\bI (check|measure) (her|his|the) (blood )?(glucose|sugar|saturation|SpO2)\b/i);
    assert.doesNotMatch(text, /\b(I|we) (give|gives) (oral glucose|aspirin)\b/i);
    assert.doesNotMatch(text, /\b(I|we) transport\b/i);
    assert.match(text, /transporting crew|arriving (EMS )?crew|ambulance crew/i);
  });

  test("AEMT labs stay in AEMT scope: no decompression, intubation, cardioversion, pacing or benzodiazepines by the AEMT, and they name the paramedic when one is needed", () => {
    if (!CODES.includes("NREMTAEMT")) return;
    const text = allText("NREMTAEMT");
    assert.doesNotMatch(text, /\b(I|we) (decompress|needle|intubate|cardiovert|pace)\b/i);
    assert.doesNotMatch(text, /\b(I|we) give (midazolam|diazepam|lorazepam|amiodarone|magnesium|dexamethasone|TXA|tranexamic)\b/i);
    assert.match(text, /isn't in my scope|not AEMT scope|outside AEMT scope|aren't ours|not ours to give/i);
    assert.match(text, /paramedic/i);
  });

  test("Paramedic and AEMT courses carry a Clinical Judgment unit with at least three labs", () => {
    for (const code of ["NREMTPARAMEDIC", "NREMTAEMT"].filter((c) => CODES.includes(c))) {
      const unit = activeUnits(tracks.get(code)!).find((u) => u.title === "Clinical Judgment");
      assert.ok(unit, code);
      assert.ok(setFor(code).labs.filter((l) => unit!.objectives.includes(l.objective)).length >= 3, code);
    }
  });
});

// REQ-162/REQ-190 (docs/sims.md 12, 4.7, 4.8): the authored scenario
// documents and their golden paths, in seed order. Phase 1a lists them for
// the tests; the seed reads the same list. A document is either a scenario
// source (`<slug>.sim.json`, which may splice modules) or a difficulty band
// (`<slug>.band.json`, a merge-patch over another scenario's source). Either
// way compileEntry() turns it into one plain ScenarioDoc, which is what the
// linter, the golden replays, the content hash and the app see.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyBand, thresholdProblems } from "./overlay.ts";
import type { BandFile } from "./overlay.ts";
import { spliceModules } from "./modules.ts";
import type { Problem, ScenarioDoc } from "./engine/v1/types.ts";

export interface DocumentEntry {
  course: string; // the track code the objective belongs to
  slug: string;
  file: string; // the source: <slug>.sim.json, or <slug>.band.json for a band
  golden: string | null;
  kind: "scenario" | "band";
  // REQ-236: where the content came from, written to sim_versions.source. A
  // document written by `npm run sims:generate` (REQ-230) and registered by
  // hand is "generated" (entry(course, slug, { source: "generated" }), as
  // its .register.md says); everything else is "authored".
  source: "authored" | "generated";
}

export interface EntryOptions {
  source?: "authored" | "generated";
}

const ROOT = join(__dirname, "..", "..", "supabase", "seed", "sims");

function entry(course: string, slug: string, opts: EntryOptions = {}): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.sim.json`), golden: join(ROOT, course, `${slug}.golden.json`), kind: "scenario", source: opts.source ?? "authored" };
}

function band(course: string, slug: string, opts: EntryOptions = {}): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.band.json`), golden: join(ROOT, course, `${slug}.golden.json`), kind: "band", source: opts.source ?? "authored" };
}

// Phase 1a step 5: the prototype ports. Tamponade after CABG (now hosting the
// code/ACLS module, REQ-190) and the TicketBurst launch day (AWSSAA), plus its
// SAP band (AWSSAP). The Lakeshore clinic app (PMP) and Dana's knee valgus
// (NASMCPT) are deferred. REQ-222 (batch S2a): three more CCRN Adult cases
// on the bedside renderer, authored without a prototype (golden paths from
// scripts/sim-golden/<slug>.steps.ts).
export const ALL_DOCUMENTS: readonly DocumentEntry[] = [
  entry("CCRNADULT", "tamponade-after-cabg"),
  entry("CCRNADULT", "sepsis-to-septic-shock"),
  entry("CCRNADULT", "dka-first-six-hours"),
  entry("CCRNADULT", "acute-ischemic-stroke-lvo"),
  entry("AWSSAA", "ticketburst-launch-day"),
  band("AWSSAP", "ticketburst-launch-day-sap"),
  // ---- REQ-223 (batch S2b): post-op hemorrhage (CCRN Adult), choking and a
  // fall (CNA, nurse-aide scope). Keep these entries together. ----
  entry("CCRNADULT", "bleeding-after-whipple"),
  entry("CNA", "resident-chokes-at-lunch"),
  entry("CNA", "resident-found-on-floor"),
  // ---- end REQ-223 (S2b) ----
  // ---- REQ-225 (EPPP-B): client-session scenarios, course EPPP ----------
  // The EPPP course and these objective titles come from the EPPP course
  // work (feature/eppp-course); the seed resolves each by course code and
  // exact objective title and stops with a clear error until it is seeded.
  // EPPP_SESSION_DOCUMENTS (below) lists the same entries for the tests.
  entry("EPPP", "suicide-risk-safety-plan"),
  entry("EPPP", "duty-to-protect-threat"),
  entry("EPPP", "diagnostic-intake-mood"),
  // ---- end REQ-225 (EPPP-B) -------------------------------------------
  // ---- REQ-231: security console incidents, course SECPLUS (SY0-701), and
  // each as a V8 band (SECPLUSV8, SY0-801: same incident, the V8 objective).
  entry("SECPLUS", "phish-to-account-takeover"),
  band("SECPLUSV8", "phish-to-account-takeover-v8"),
  entry("SECPLUS", "ransomware-file-server"),
  band("SECPLUSV8", "ransomware-file-server-v8"),
  entry("SECPLUS", "cloud-iam-backdoor"),
  band("SECPLUSV8", "cloud-iam-backdoor-v8"),
  // ---- end REQ-231 ------------------------------------------------------
  // ---- REQ-232: PT treatment-session scenarios, course DPT ------------
  entry("DPT", "icu-early-mobility"),
  entry("DPT", "tka-gait-dvt-red-flag"),
  entry("DPT", "stroke-balance-fall-risk"),
  // ---- end REQ-232 -----------------------------------------------------
  // ---- REQ-233 (bedside wave 1): CCRN Pediatric, CCRN Neonatal, NCLEX-RN
  // and NCLEX-PN bedside cases, and a second AWS SAA board case. Keep these
  // entries together. ----
  entry("CCRNPEDS", "pediatric-septic-shock-fluids"),
  entry("CCRNPEDS", "pediatric-dka-cerebral-edema"),
  entry("CCRNNEO", "neonatal-rds-escalating-support"),
  entry("CCRNNEO", "neonatal-sepsis-hypoglycemia"),
  entry("NCLEXRN", "med-surg-deterioration-sbar"),
  entry("NCLEXRN", "post-op-transfusion-reaction"),
  entry("NCLEXPN", "ltc-change-in-condition"),
  entry("NCLEXPN", "med-pass-error-caught"),
  entry("AWSSAA", "nat-gateway-bill-spike"),
  // ---- end REQ-233 ----
  // ---- REQ-242 (AWS board sims, wave 2): AWS MLA, Cloud Practitioner,
  // Developer and SysOps (CloudOps) board cases, learner-paced, set in
  // us-east-2. Keep these entries together. ----
  entry("AWSMLA", "fraud-model-drift"),
  // ---- end REQ-242 ----
];

// REQ-225: the EPPP client-session documents and the objective titles they
// are registered to (each must be an active objective of course EPPP).
export const EPPP_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "EPPP");
export const EPPP_OBJECTIVES = [
  "Assess suicide risk and plan safety in a clinical interview",
  "Apply duty-to-warn and duty-to-protect obligations",
  "Conduct a diagnostic intake using DSM-5-TR criteria",
] as const;

// REQ-232: the DPT treatment-session documents (the PT renderer) and the
// objective titles they are registered to (active objectives of course DPT).
export const DPT_TREATMENT_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "DPT");
export const DPT_OBJECTIVES = [
  "Selecting and performing interventions for cardiovascular and pulmonary conditions to achieve patient goals",
  "Total knee arthroplasty rehabilitation per the 2026 APTA guideline: range-of-motion work instead of continuous passive motion, progressive strengthening, motor function training, and early daily quadriceps NMES",
  "Selecting and performing interventions for neurological and musculoskeletal conditions",
] as const;

export interface Compiled {
  doc: ScenarioDoc | null; // null when the source, the band or a module failed
  problems: Problem[];
  band: BandFile | null;
  base: ScenarioDoc | null; // a band's compiled base
}

function readJson(path: string, label: string, problems: Problem[]): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch (e) {
    problems.push({ level: "error", path: label, message: `cannot read: ${(e as Error).message}` });
    return null;
  }
}

function compileSource(source: Record<string, unknown>, problems: Problem[]): ScenarioDoc | null {
  const s = spliceModules(source);
  problems.push(...s.problems);
  return s.doc as ScenarioDoc | null;
}

// Source -> band patch (on the base source) -> module splice -> document.
// Validation is the caller's (lint.ts), so a band is validated as its own
// document after the merge, as Nick decided (19.4 item 1).
export function compileEntry(e: DocumentEntry): Compiled {
  const problems: Problem[] = [];
  const raw = readJson(e.file, e.kind === "band" ? "band" : "document", problems);
  if (!raw) return { doc: null, problems, band: null, base: null };
  if (e.kind === "scenario") return { doc: compileSource(raw, problems), problems, band: null, base: null };
  const b = raw as unknown as BandFile;
  if (!b.base || typeof b.base.course !== "string" || typeof b.base.slug !== "string") {
    problems.push({ level: "error", path: "band.base", message: "a band names its base as { course, slug }" });
    return { doc: null, problems, band: b, base: null };
  }
  if (b.slug !== e.slug) problems.push({ level: "error", path: "band.slug", message: `band slug ${b.slug} does not match its file name ${e.slug}` });
  const baseEntry = entry(b.base.course, b.base.slug);
  const baseRaw = readJson(baseEntry.file, "band.base", problems);
  if (!baseRaw) return { doc: null, problems, band: b, base: null };
  const baseProblems: Problem[] = [];
  const base = compileSource(baseRaw, baseProblems);
  if (!base) problems.push({ level: "error", path: "band.base", message: `the base ${b.base.course}/${b.base.slug} does not compile` });
  const r = applyBand(baseRaw, b);
  problems.push(...r.problems);
  if (!r.source) return { doc: null, problems, band: b, base };
  const doc = compileSource(r.source, problems);
  if (doc && base) problems.push(...thresholdProblems(base, doc, b));
  return { doc, problems, band: b, base };
}

// The compiled document, or an error naming what failed. For tests and scripts.
export function loadDocument(e: DocumentEntry): ScenarioDoc {
  const c = compileEntry(e);
  const errors = c.problems.filter((p) => p.level === "error");
  if (!c.doc || errors.length) throw new Error(`${e.course}/${e.slug} does not compile: ${errors.map((p) => `${p.path}: ${p.message}`).join("; ")}`);
  return c.doc;
}

export { entry as documentEntry, band as bandEntry };

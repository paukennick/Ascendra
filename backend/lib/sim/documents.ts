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
}

const ROOT = join(__dirname, "..", "..", "supabase", "seed", "sims");

function entry(course: string, slug: string): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.sim.json`), golden: join(ROOT, course, `${slug}.golden.json`), kind: "scenario" };
}

function band(course: string, slug: string): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.band.json`), golden: join(ROOT, course, `${slug}.golden.json`), kind: "band" };
}

// Phase 1a step 5: the prototype ports. Tamponade after CABG (now hosting the
// code/ACLS module, REQ-190) and the TicketBurst launch day (AWSSAA), plus its
// SAP band (AWSSAP). The Lakeshore clinic app (PMP) and Dana's knee valgus
// (NASMCPT) are deferred.
export const ALL_DOCUMENTS: readonly DocumentEntry[] = [
  entry("CCRNADULT", "tamponade-after-cabg"),
  entry("AWSSAA", "ticketburst-launch-day"),
  band("AWSSAP", "ticketburst-launch-day-sap"),
  // ---- REQ-223 (batch S2b): post-op hemorrhage (CCRN Adult), choking and a
  // fall (CNA, nurse-aide scope). Keep these entries together. ----
  entry("CCRNADULT", "bleeding-after-whipple"),
  entry("CNA", "resident-chokes-at-lunch"),
  // ---- end REQ-223 (S2b) ----
];

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

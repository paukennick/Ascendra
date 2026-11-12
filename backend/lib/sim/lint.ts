// REQ-162 (docs/sims.md 4.4, 16): the content linter over the seeded
// documents, shared by `npm run sims:lint`, `npm run sims:validate` and the
// test that runs it under `npm test`. Layer 1 is the zod schema (document and
// golden file); layers 2-3 are the engine's lintScenario with the golden
// paths replayed, the bounded path search and the source re-check dates.
import { readFileSync } from "node:fs";
import { compileEntry } from "./documents.ts";
import type { DocumentEntry } from "./documents.ts";
import { goldenFileSchema, schemaProblems } from "./schema.ts";
import { lintScenario, replayGolden, replayGoldenPath } from "./engine/v1/validate.ts";
import { parseCached, parseTemplate, stateHash } from "./engine/v1/index.ts";
import { parseDuration } from "./engine/v1/engine.ts";
import type { Ast, TemplatePart } from "./engine/v1/parser.ts";
import { jsonbKeyOrder, reverseKeyOrder, withKeyOrder } from "./key-order.ts";
import type { GoldenFile, GoldenResult, SafetyFamily } from "./engine/v1/validate.ts";
import type { Problem, ScenarioDoc } from "./engine/v1/types.ts";

export interface DocumentReport {
  entry: DocumentEntry;
  doc: ScenarioDoc | null;
  golden: GoldenFile | null;
  problems: Problem[];
  goldenResults: GoldenResult[];
}

// REQ-232: a physical therapy treatment session is clinical (its course sits
// under healthcare, so the seed derives "clinical" too).
export function safetyFamilyOf(doc: ScenarioDoc): SafetyFamily {
  if (doc.outcome?.profile === "clinical" || doc.outcome?.profile === "physical-therapy") return "clinical";
  if (doc.outcome?.profile === "fitness") return "fitness";
  return "general";
}

function readJson(path: string, problems: Problem[], label: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    problems.push({ level: "error", path: label, message: `cannot read: ${(e as Error).message}` });
    return null;
  }
}

// REQ-227 (FAIL-1222): an ending set whose result depends on key order is an
// error. The engine checks endings in the document's `endingOrder` (minor 2),
// or, without one, in the key order of `endings`, which the server's jsonb
// column does not keep. So a document without `endingOrder` is replayed with
// its keys as written, reversed and in jsonb order, and every golden path
// must end the same way (ending, class, rating, score and state hash) in all
// three. A document with `endingOrder` cannot depend on key order (the engine
// reads the list), so it is not replayed here; the storage-order test replays
// it anyway. Only the golden paths are searched: an overlap no path reaches
// is not seen, which is why a new document declares `endingOrder` (the
// validator requires it from minor 2 whenever two endings have a `when`).
export function endingOrderProblems(doc: ScenarioDoc, golden: GoldenFile | null): Problem[] {
  if (doc.endingOrder !== undefined || !golden) return [];
  const orders: [string, (keys: string[]) => string[]][] = [
    ["as written", (k) => k],
    ["reversed", reverseKeyOrder],
    ["jsonb", jsonbKeyOrder],
  ];
  const problems: Problem[] = [];
  const copies = orders.map(([label, order]) => ({ label, doc: withKeyOrder(JSON.parse(JSON.stringify(doc)) as ScenarioDoc, order) }));
  for (const p of golden.paths) {
    const seen = copies.map((c) => {
      const r = replayGoldenPath(c.doc, structuredClone(p), (run) => stateHash(run.state));
      const d = r.debrief;
      return { label: c.label, key: r.error ? `error ${r.error}` : `${d.ending} / ${d.outcomeClass} / ${d.rating} / ${d.processScore} / ${r.stateHash}`, ending: r.error ? "error" : d.ending ?? "no ending" };
    });
    if (new Set(seen.map((x) => x.key)).size > 1) {
      problems.push({
        level: "error",
        path: `endings`,
        message: `golden path ${p.id} ends differently depending on key order (${seen.map((x) => `${x.label}: ${x.ending}`).join("; ")}); declare endingOrder (engine minor 2) so the order is explicit`,
      });
    }
  }
  return problems;
}

// REQ-236 (FAIL-1361): the engine reads some expressions as sim seconds
// whatever the unit a param declares (a unit is display and lint metadata
// only). A "1440 min" day given to `schedule.after` became 24 minutes. So a
// named value (param, state variable or derived value) that declares a time
// unit other than seconds may not be read where the engine reads seconds:
//   - `schedule.after` given as an expression (engine.ts scheduleTimer);
//   - a console alert's or event's `at` (sorted and shown as sim seconds);
//   - a template slot, table column or KPI with a format that takes seconds
//     (clock, clocks, date, dateShort, datetime, time, duration, min).
// Store the value in seconds (unit "s") and show it with |min or |duration.
// A rate (mL/min) or a non-time unit is not a duration, so it is not checked
// here (unitsLint in the engine warns about rates times dt). Lint layer only:
// the engine and its stepping are unchanged.
const SECONDS_UNITS = new Set(["s", "sec", "secs", "second", "seconds"]);
const OTHER_TIME_UNITS = new Set(["ms", "min", "mins", "minute", "minutes", "h", "hr", "hrs", "hour", "hours", "d", "day", "days", "wk", "week", "weeks"]);
export const SECONDS_FORMATS = new Set(["clock", "clocks", "date", "dateShort", "datetime", "time", "duration", "min"]);

export function isNonSecondTimeUnit(unit: string | undefined): boolean {
  if (typeof unit !== "string") return false;
  const u = unit.trim().toLowerCase();
  return !SECONDS_UNITS.has(u) && OTHER_TIME_UNITS.has(u);
}

function namesOf(ast: Ast, out: Set<string>): void {
  if (ast.k === "name") out.add(ast.name);
  for (const v of Object.values(ast)) {
    if (Array.isArray(v)) for (const x of v) if (x && typeof x === "object" && "k" in x) namesOf(x as Ast, out);
    if (v && typeof v === "object" && !Array.isArray(v) && "k" in v) namesOf(v as Ast, out);
  }
}

export function secondsUnitProblems(doc: ScenarioDoc): Problem[] {
  const problems: Problem[] = [];
  const unitOf = (n: string): string | undefined =>
    doc.params?.[n]?.unit ?? (doc.state?.[n] as { unit?: string } | undefined)?.unit ?? (doc.derived?.[n] as { unit?: string } | undefined)?.unit;
  const check = (path: string, expr: string, reads: string): void => {
    let ast: Ast;
    try {
      ast = parseCached(expr);
    } catch {
      return; // the validator reports a bad expression
    }
    const names = new Set<string>();
    namesOf(ast, names);
    for (const n of names) {
      const unit = unitOf(n);
      if (isNonSecondTimeUnit(unit)) {
        problems.push({
          level: "error",
          path,
          message: `"${n}" has unit "${unit}", but ${reads} is read in seconds whatever the unit says (FAIL-1361); store it in seconds with unit "s" and show it with |min or |duration`,
        });
      }
    }
  };
  const checkTemplate = (path: string, tpl: string): void => {
    if (tpl.indexOf("{") < 0) return;
    let parts: TemplatePart[];
    try {
      parts = parseTemplate(tpl);
    } catch {
      return; // not a template (a command pattern) or reported by the validator
    }
    for (const p of parts) if ("expr" in p && p.format && SECONDS_FORMATS.has(p.format)) check(path, p.src, `the |${p.format} format`);
  };
  const walk = (x: unknown, path: string): void => {
    if (typeof x === "string") return checkTemplate(path, x);
    if (Array.isArray(x)) return x.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    // an effect: { schedule, after }; a literal duration ("8min") carries its own unit
    if (typeof o.schedule === "string" && typeof o.after === "string" && parseDuration(o.after) === null) check(`${path}.after`, o.after, "schedule.after");
    // a table column or a KPI: { label, value, format } ("duration" KPIs)
    if (typeof o.value === "string" && typeof o.format === "string" && typeof o.label === "string" && SECONDS_FORMATS.has(o.format)) check(`${path}.value`, o.value, `a value with the "${o.format}" format`);
    for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k);
  };
  walk(doc, "");
  const con = doc.screen?.console;
  (con?.alerts ?? []).forEach((a, i) => check(`screen.console.alerts[${i}].at`, a.at, "a console alert's at"));
  (con?.events ?? []).forEach((e, i) => check(`screen.console.events[${i}].at`, e.at, "a console event's at"));
  // one problem per place and name
  const seen = new Set<string>();
  return problems.filter((p) => {
    const key = `${p.path}\u0000${p.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// `full` false = schema only (sims:validate); true adds the semantic and
// content layers, golden replays and the path search (sims:lint).
export function checkDocument(entry: DocumentEntry, opts: { full: boolean; now?: string; searchNodes?: number }): DocumentReport {
  const problems: Problem[] = [];
  const compiled = compileEntry(entry);
  problems.push(...compiled.problems);
  const raw = compiled.problems.some((p) => p.level === "error") ? null : compiled.doc;
  const rawGolden = entry.golden ? readJson(entry.golden, problems, "golden") : null;
  let doc: ScenarioDoc | null = null;
  let golden: GoldenFile | null = null;
  if (raw) {
    const sp = schemaProblems(raw);
    for (const m of sp) problems.push({ level: "error", path: "schema", message: m });
    if (!sp.length) doc = raw as ScenarioDoc;
    if (doc && doc.slug !== entry.slug) problems.push({ level: "error", path: "slug", message: `document slug ${doc.slug} does not match its file name ${entry.slug}` });
  }
  if (entry.golden && rawGolden) {
    const g = goldenFileSchema.safeParse(rawGolden);
    if (!g.success) for (const i of g.error.issues) problems.push({ level: "error", path: `golden.${i.path.join(".")}`, message: i.message });
    else golden = rawGolden as GoldenFile;
    if (golden && golden.slug !== entry.slug) problems.push({ level: "error", path: "golden.slug", message: `golden slug ${golden.slug} does not match ${entry.slug}` });
  }
  if (!entry.golden) problems.push({ level: "error", path: "golden", message: "every seeded document needs a golden file (9.2: Good, Mediocre and Bad paths)" });
  let goldenResults: GoldenResult[] = [];
  if (opts.full && doc) {
    goldenResults = golden ? replayGolden(doc, golden) : [];
    problems.push(...lintScenario(doc, { now: opts.now, safetyFamily: safetyFamilyOf(doc), golden, goldenResults, searchNodes: opts.searchNodes ?? 4000 }));
    problems.push(...endingOrderProblems(doc, golden));
    problems.push(...secondsUnitProblems(doc));
  }
  return { entry, doc, golden, problems, goldenResults };
}

export function formatReport(r: DocumentReport): string[] {
  const out: string[] = [];
  const errors = r.problems.filter((p) => p.level === "error").length;
  const warnings = r.problems.length - errors;
  out.push(`${r.entry.course}/${r.entry.slug}: ${errors} error(s), ${warnings} warning(s)`);
  for (const p of r.problems) out.push(`  ${p.level === "error" ? "ERROR" : "warn "} ${p.path}: ${p.message}`);
  for (const g of r.goldenResults) {
    const d = g.debrief;
    out.push(`  golden ${g.path.id}: ${d.ending} / ${d.outcomeClass} / ${d.rating} (score ${d.processScore})${g.mismatches.length ? `, ${g.mismatches.length} mismatch(es)` : ""}${g.error ? `, error ${g.error}` : ""}`);
  }
  return out;
}

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
import { stateHash } from "./engine/v1/index.ts";
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

export function safetyFamilyOf(doc: ScenarioDoc): SafetyFamily {
  if (doc.outcome?.profile === "clinical") return "clinical";
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

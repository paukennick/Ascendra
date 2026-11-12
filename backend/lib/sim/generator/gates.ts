// REQ-230 (docs/sims.md 12.2): the deterministic gates a generated draft
// must pass before the fact check is paid for. Every gate fails closed and
// says why in words the retry prompt can use. Order:
//
//   schema        the zod scenario schema (and the reply's own shape)
//   identity      the requested screen and objective, a new slug, the
//                 current engine minor (so endingOrder is required)
//   golden        each scripted path drives the engine and ends where the
//                 model said it would; expectations come from the engine
//   lint          lib/sim/lint.ts checkDocument in full: semantics, content
//                 rules, golden replays, ending order and the key-order
//                 rule (endingOrderProblems); the search runs in reachable
//   key order     every golden path ends the same with the document's keys
//                 as written, reversed and in jsonb order
//   reachable     the bounded path search: every terminal ending except
//                 time_up is reached by a golden path or the search, and no
//                 searched target ending misses a critical criterion
//   replay        each golden path replayed the way the sync route does it
//                 (straight, from a mid-run checkpoint, and as the client
//                 document) reaches the engine's state hash; and the engine
//                 bundle (the one script the app's runtimes run) agrees
//   sources       every number in params, timers and thresholds is sourced
//                 with a cite and a checkedAt date that is not in the future,
//                 and the document cites at least one of the course's own
//                 sources
//   duplicate     not too close to a sim the objective already has
//                 (similarity.ts)
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { z } from "zod";
import { checkDocument } from "../lint.ts";
import type { DocumentEntry } from "../documents.ts";
import { schemaProblems } from "../schema.ts";
import { clientDocument } from "../content-hash.ts";
import { replayRun } from "../server-run.ts";
import { jsonbKeyOrder, reverseKeyOrder, withKeyOrder } from "../key-order.ts";
import { engineBundleSource } from "../cross-runtime/engine-bundle.ts";
import { ENGINE_MINOR, pathSearch, replayGoldenPath, stateHash } from "../engine/v1/index.ts";
import type { GoldenFile } from "../engine/v1/validate.ts";
import type { ScenarioDoc, Source } from "../engine/v1/types.ts";
import type { ObjectiveContext } from "./course.ts";
import { buildGolden, goldenScriptSchema } from "./steps.ts";
import { DUPLICATE_THRESHOLD, duplicatesOf, type DuplicateHit } from "./similarity.ts";

export const GATES = ["reply", "schema", "identity", "golden", "lint", "keyOrder", "reachable", "replay", "sources", "duplicate", "factCheck"] as const;
export type GateName = (typeof GATES)[number];

export interface GateResult {
  gate: GateName;
  ok: boolean;
  problems: string[];
  notes?: string[]; // logged, never blocking (warnings, search coverage)
}

// What the writer returns (prompt.ts asks for exactly this).
export const writerReplySchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  uncertainClaims: z.array(z.string()).default([]),
  document: z.record(z.string(), z.unknown()),
  goldenPaths: z.array(goldenScriptSchema).min(1).max(12),
});
export type WriterReply = z.infer<typeof writerReplySchema>;

// The reply may come in a ```json fence; anything else is a failed gate.
export function parseWriterReply(text: string): { reply: WriterReply | null; problems: string[] } {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch (e) {
    return { reply: null, problems: [`the reply is not one JSON object (${(e as Error).message}); return only the JSON object`] };
  }
  const r = writerReplySchema.safeParse(raw);
  if (!r.success) return { reply: null, problems: r.error.issues.slice(0, 20).map((i) => `reply.${i.path.join(".")}: ${i.message}`) };
  return { reply: r.data, problems: [] };
}

export interface GateInput {
  ctx: ObjectiveContext;
  screen: string;
  now: string; // YYYY-MM-DD
  existingSlugs: Set<string>;
  existingSims: { label: string; doc: ScenarioDoc }[]; // seeded sims and earlier drafts
  searchNodes: number;
}

export interface DeterministicResult {
  results: GateResult[];
  doc: ScenarioDoc | null;
  golden: GoldenFile | null;
  duplicates: DuplicateHit[];
  passed: boolean;
}

function gate(name: GateName, problems: string[], notes?: string[]): GateResult {
  return { gate: name, ok: problems.length === 0, problems, ...(notes && notes.length ? { notes } : {}) };
}

export function identityProblems(doc: ScenarioDoc, input: GateInput): string[] {
  const p: string[] = [];
  if (doc.screen?.type !== input.screen) p.push(`screen.type is "${doc.screen?.type}"; this draft was asked for a "${input.screen}" screen`);
  if (doc.objective !== input.ctx.objective) p.push(`objective must be exactly the course's title "${input.ctx.objective}" (the seed registers a sim by course code and exact title)`);
  if (!/^[a-z][a-z0-9-]{2,79}$/.test(doc.slug ?? "")) p.push(`slug "${doc.slug}" must be lowercase words joined by hyphens`);
  else if (input.existingSlugs.has(doc.slug)) p.push(`slug "${doc.slug}" is already used by a seeded sim or an earlier draft; choose a new one`);
  if (doc.engine?.minor !== ENGINE_MINOR) p.push(`engine.minor must be ${ENGINE_MINOR}, the current engine (so endingOrder is explicit)`);
  return p;
}

export function storageKeyProblems(doc: ScenarioDoc, golden: GoldenFile): string[] {
  const orders: [string, (k: string[]) => string[]][] = [
    ["as written", (k) => k],
    ["reversed", reverseKeyOrder],
    ["jsonb", jsonbKeyOrder],
  ];
  const copies = orders.map(([label, order]) => {
    const stored = withKeyOrder(JSON.parse(JSON.stringify(doc)) as ScenarioDoc, order);
    // FAIL-1250 (open): teaching prompts are still offered in key order. The
    // app and the server both read the jsonb order, which is checked here, so
    // the reversal leaves that one map alone (as lib/sim/storage-order.test.ts).
    if (label === "reversed" && doc.teaching) stored.teaching = JSON.parse(JSON.stringify(doc.teaching));
    return { label, doc: stored };
  });
  const out: string[] = [];
  for (const p of golden.paths) {
    const seen = copies.map((c) => {
      const r = replayGoldenPath(c.doc, structuredClone(p), (run) => stateHash(run.state));
      return { label: c.label, key: r.error ? `error ${r.error}` : `${r.debrief.ending}/${r.debrief.outcomeClass}/${r.debrief.rating}/${r.debrief.processScore}/${r.stateHash}` };
    });
    if (new Set(seen.map((s) => s.key)).size > 1) out.push(`golden path ${p.id} ends differently by key order: ${seen.map((s) => `${s.label} ${s.key}`).join("; ")}`);
  }
  return out;
}

// The bounded path search runs once, here (lint is told not to repeat it):
// every terminal ending but time_up is reached by a golden path or the
// search, and, as the linter's own search rule (9.2), no searched path
// reaches a target ending with a critical criterion missed.
export function reachability(doc: ScenarioDoc, golden: GoldenFile, searchNodes: number): GateResult {
  const byGolden = new Set<string>();
  for (const p of golden.paths) {
    const r = replayGoldenPath(doc, structuredClone(p));
    if (!r.error && r.debrief.ending) byGolden.add(r.debrief.ending);
  }
  const search = pathSearch(doc, searchNodes);
  const bySearch = new Set(search.leaves.map((l) => l.ending).filter((e): e is string => !!e));
  const problems: string[] = [];
  const onlyGolden: string[] = [];
  for (const k of Object.keys(doc.endings)) {
    if (!doc.endings[k].terminal || k === "time_up") continue;
    if (!byGolden.has(k) && !bySearch.has(k)) problems.push(`ending ${k} is reached by no golden path and no searched path (${search.nodes} nodes): add a path that reaches it or remove it`);
    else if (!bySearch.has(k)) onlyGolden.push(k);
  }
  for (const leaf of search.leaves.filter((l) => l.class === "target" && l.criticalMissed.length).slice(0, 5)) {
    problems.push(`a target ending was reached with a critical criterion missed: [${leaf.trail.join(" > ")}] (missed: ${leaf.criticalMissed.join(", ")}); make the criterion part of the target condition or drop its critical flag`);
  }
  const notes = [`path search: ${search.nodes} nodes, ${search.leaves.length} endings found, ${search.exhausted ? "exhausted" : "bounded"}; reached by the search: ${[...bySearch].sort().join(", ") || "none"}`];
  if (onlyGolden.length) notes.push(`reached only by a golden path (deeper than the bounded search): ${onlyGolden.join(", ")}`);
  return gate("reachable", problems, notes);
}

export function serverReplayProblems(doc: ScenarioDoc, golden: GoldenFile): string[] {
  const out: string[] = [];
  const client = clientDocument(doc) as unknown as ScenarioDoc;
  for (const path of golden.paths) {
    const expected = replayGoldenPath(doc, structuredClone(path), (r) => stateHash(r.state));
    if (expected.error) {
      out.push(`path ${path.id}: ${expected.error}`);
      continue;
    }
    const straight = replayRun({ doc, seed: path.seed, from: null, commands: path.commands, toTick: expected.finalTick, budget: 1e12 });
    if (straight.rejected || stateHash(straight.run.state) !== expected.stateHash) out.push(`path ${path.id}: the server's replay ${straight.rejected ? `refused seq ${straight.rejected.seq} (${straight.rejected.reason})` : "reached a different state"}`);
    const half = Math.floor(path.commands.length / 2);
    const first = replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, half), every: 60, budget: 1e12 });
    if (first.checkpoint) {
      const cp = JSON.parse(JSON.stringify(first.checkpoint));
      const rest = path.commands.filter((c) => c.seq > cp.lastSeq);
      const resumed = replayRun({ doc, seed: path.seed, from: cp, commands: rest, toTick: expected.finalTick, budget: 1e12 });
      if (resumed.rejected || stateHash(resumed.run.state) !== expected.stateHash) out.push(`path ${path.id}: resumed from a checkpoint, the server reached a different state`);
    }
    const app = replayRun({ doc: client, seed: path.seed, from: null, commands: path.commands, toTick: expected.finalTick, budget: 1e12 });
    if (app.rejected || stateHash(app.run.state) !== expected.stateHash) out.push(`path ${path.id}: the client document (what the app runs) reached a different state`);
  }
  return out;
}

// The engine is transpiled once per process; only the data line changes.
const EMPTY_DATA = { corpus: [] as unknown[], documents: [] as { slug: string; doc: unknown; golden: unknown }[] };
let bundleBase: string | null = null;
function bundleWith(data: typeof EMPTY_DATA): string {
  bundleBase ??= engineBundleSource(EMPTY_DATA);
  const line = `var __DATA = ${JSON.stringify(EMPTY_DATA)};`;
  if (!bundleBase.includes(line)) throw new Error("the engine bundle's data line changed (lib/sim/cross-runtime/engine-bundle.ts); update bundleWith");
  return bundleBase.replace(line, () => `var __DATA = ${JSON.stringify(data)};`);
}

// The engine bundle: engine major 1 transpiled to one plain script, the
// program Hermes and the browsers run (cross-runtime/engine-bundle.ts), with
// only this draft in it. Each golden line must match Node's direct replay.
export function bundleReplayProblems(doc: ScenarioDoc, golden: GoldenFile): string[] {
  const slug = `draft/${doc.slug}`;
  const source = bundleWith({ corpus: [], documents: [{ slug, doc, golden }] });
  const sandbox = {} as { simCrossRuntimeEngine: () => string };
  runInNewContext(source, sandbox, { filename: "sim-engine-bundle.js" });
  const lines = sandbox.simCrossRuntimeEngine().split("\n");
  const out: string[] = [];
  for (const path of golden.paths) {
    const r = replayGoldenPath(doc, structuredClone(path), (run) => stateHash(run.state));
    const line = lines.find((l) => l.startsWith(`golden ${slug}/${path.id} `));
    const want = `hash=${r.stateHash} final=${r.finalTick} ending=${r.debrief.ending} class=${r.debrief.outcomeClass} rating=${r.debrief.rating} score=${r.debrief.processScore} mismatches=0`;
    if (!line) out.push(`path ${path.id}: the engine bundle printed no result`);
    else if (!line.includes(want)) out.push(`path ${path.id}: the engine bundle disagrees with the server engine (bundle: ${line.slice(0, 300)})`);
  }
  return out;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function allSources(doc: ScenarioDoc): { path: string; source: Source | undefined }[] {
  const out: { path: string; source: Source | undefined }[] = [];
  (doc.sources ?? []).forEach((s, i) => out.push({ path: `sources[${i}]`, source: s }));
  for (const [k, p] of Object.entries(doc.params ?? {})) if (typeof p.value === "number") out.push({ path: `params.${k}`, source: p.source });
  for (const [k, t] of Object.entries(doc.timers ?? {})) out.push({ path: `timers.${k}`, source: t.source });
  for (const [k, t] of Object.entries(doc.outcome?.thresholds ?? {})) out.push({ path: `outcome.thresholds.${k}`, source: t.source });
  if (doc.outcome?.noProgress) out.push({ path: "outcome.noProgress", source: doc.outcome.noProgress.source });
  if (doc.focusedStart) out.push({ path: "focusedStart", source: doc.focusedStart.source });
  for (const [k, t] of Object.entries(doc.teaching ?? {})) out.push({ path: `teaching.${k}`, source: t.source });
  for (const [k, c] of Object.entries(doc.catalogs ?? {})) out.push({ path: `catalogs.${k}`, source: c.source });
  return out;
}

export function sourceProblems(doc: ScenarioDoc, ctx: ObjectiveContext, now: string): string[] {
  const out: string[] = [];
  for (const { path, source } of allSources(doc)) {
    if (!source) {
      out.push(`${path}: a number with no source; cite where it comes from with a checkedAt date`);
      continue;
    }
    if (!source.cite || !source.cite.trim()) out.push(`${path}: the source has no cite`);
    if (!ISO.test(source.checkedAt ?? "")) out.push(`${path}: the source has no ISO checkedAt date`);
    else if (source.checkedAt > now) out.push(`${path}: checkedAt ${source.checkedAt} is in the future (today is ${now})`);
    if (!source.url && !source.note) out.push(`${path}: give the source a url or a note saying where in it the number is`);
  }
  const own = new Set(ctx.courseSources.map((s) => s.url));
  if (!(doc.sources ?? []).some((s) => s.url && own.has(s.url))) out.push(`sources: cite at least one of the course's own sources by its exact url (${[...own].slice(0, 4).join(", ")})`);
  return out;
}

// Every deterministic gate, in order. A gate whose input is missing (no
// schema-valid document, no golden file) stops the ones after it.
export function runDeterministicGates(reply: WriterReply, input: GateInput): DeterministicResult {
  const results: GateResult[] = [];
  const done = (doc: ScenarioDoc | null, golden: GoldenFile | null, duplicates: DuplicateHit[] = []): DeterministicResult => ({ results, doc, golden, duplicates, passed: results.every((r) => r.ok) });
  const sp = schemaProblems(reply.document);
  results.push(gate("schema", sp));
  if (sp.length) return done(null, null);
  const doc = reply.document as unknown as ScenarioDoc;
  const idp = identityProblems(doc, input);
  results.push(gate("identity", idp));
  if (idp.length) return done(doc, null);
  const built = buildGolden(doc, reply.goldenPaths);
  results.push(gate("golden", built.problems));
  if (!built.golden || built.problems.length) return done(doc, built.golden);
  const golden = built.golden;

  const dir = mkdtempSync(join(tmpdir(), "sim-draft-"));
  try {
    const entry: DocumentEntry = { course: input.ctx.course, slug: doc.slug, file: join(dir, `${doc.slug}.sim.json`), golden: join(dir, `${doc.slug}.golden.json`), kind: "scenario" };
    writeFileSync(entry.file, JSON.stringify(doc));
    writeFileSync(entry.golden!, JSON.stringify(golden));
    // searchNodes 0: the search runs once, in the reachable gate below.
    const lint = checkDocument(entry, { full: true, now: input.now, searchNodes: 0 });
    results.push(
      gate(
        "lint",
        lint.problems.filter((p) => p.level === "error").map((p) => `${p.path}: ${p.message}`),
        lint.problems.filter((p) => p.level !== "error").map((p) => `warning ${p.path}: ${p.message}`)
      )
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!results[results.length - 1].ok) return done(doc, golden);
  results.push(gate("keyOrder", storageKeyProblems(doc, golden)));
  results.push(reachability(doc, golden, input.searchNodes));
  results.push(gate("replay", [...serverReplayProblems(doc, golden), ...bundleReplayProblems(doc, golden)]));
  results.push(gate("sources", sourceProblems(doc, input.ctx, input.now)));
  const dups = duplicatesOf(doc, input.existingSims);
  results.push(
    gate(
      "duplicate",
      dups.map((d) => `too close to ${d.against} on the same objective (story ${d.similarity.story.toFixed(2)}, decisions ${d.similarity.decisions.toFixed(2)}; limit ${DUPLICATE_THRESHOLD}): write a different case, not a variant`)
    )
  );
  return done(doc, golden, dups);
}

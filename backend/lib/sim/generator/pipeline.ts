// REQ-230 (docs/sims.md 12.2): one draft, end to end. Write, run every
// deterministic gate, fact-check only a draft that passed them, retry once
// steered with the reasons, then hold. Nothing here registers a sim: a ready
// draft is files for a person to move into the seed and list in
// lib/sim/documents.ts.
import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_DOCUMENTS, loadDocument } from "../documents.ts";
import type { GoldenFile } from "../engine/v1/validate.ts";
import type { ScenarioDoc } from "../engine/v1/types.ts";
import type { ObjectiveContext } from "./course.ts";
import { costOf, totals, upperBoundUsd, type CallCost, type LedgerLine } from "./cost.ts";
import { checkerPrompt, claimsOf, judgeCheck, parseCheckerReply, type CheckOutcome } from "./fact-check.ts";
import { parseWriterReply, runDeterministicGates, type GateResult } from "./gates.ts";
import type { ModelRequest, SimModelClient } from "./model.ts";
import { steerFrom, writerPrompt, type GenScreen } from "./prompt.ts";
import type { SelectionRow } from "./selection.ts";

export const WRITER_ATTEMPTS = 2;
export const CHECK_CALL_ATTEMPTS = 2;

export interface GenerateOptions {
  ctx: ObjectiveContext;
  screen: GenScreen;
  idea?: string | null;
  now: string; // YYYY-MM-DD
  writerModel: string;
  checkModel: string;
  maxUsd: number;
  searchNodes: number;
  existingSims: { label: string; doc: ScenarioDoc }[];
  existingSlugs: Set<string>;
  selection: SelectionRow;
  allowUnselected?: boolean;
  writerMaxTokens?: number;
  checkMaxTokens?: number;
  docText?: string; // tests: the rules text
  example?: string; // tests: a smaller example document
}

export interface AttemptRecord {
  attempt: number;
  confidence: string | null;
  uncertainClaims: string[];
  gates: GateResult[];
  factCheck: CheckOutcome | null;
  passed: boolean;
  raw: string; // the writer's reply, kept for a held draft
}

export type HoldKind = "failed_twice" | "check_did_not_run" | "budget";

export interface GenerateResult {
  outcome: "ready" | "held";
  holdKind: HoldKind | null;
  reasons: string[];
  doc: ScenarioDoc | null;
  golden: GoldenFile | null;
  attempts: AttemptRecord[];
  calls: CallCost[];
}

export class NotSelectedError extends Error {
  constructor(row: SelectionRow) {
    super(`"${row.objective}" does not meet the selection rule (${row.reason}); pass --allow-unselected to generate anyway, and the report will say so. Nothing was sent.`);
    this.name = "NotSelectedError";
  }
}

export async function generateSim(o: GenerateOptions, client: SimModelClient): Promise<GenerateResult> {
  if (!o.selection.qualifies && !o.allowUnselected) throw new NotSelectedError(o.selection);
  const calls: CallCost[] = [];
  const attempts: AttemptRecord[] = [];
  const writerMax = o.writerMaxTokens ?? 48_000;
  const checkMax = o.checkMaxTokens ?? 8_000;
  const spent = () => calls.reduce((a, c) => a + c.usd, 0);
  const held = (holdKind: HoldKind, reasons: string[]): GenerateResult => ({ outcome: "held", holdKind, reasons, doc: null, golden: null, attempts, calls });

  const call = async (req: ModelRequest, attempt: number): Promise<{ text: string; stop: string | null } | "budget"> => {
    const bound = upperBoundUsd(req.model, `${req.system}\n${req.user}`, req.maxTokens);
    if (spent() + bound > o.maxUsd) return "budget";
    const res = await client.call(req);
    calls.push(costOf(req.purpose, attempt, res.model || req.model, res.usage));
    return { text: res.text, stop: res.stopReason };
  };

  let steer: string | null = null;
  let lastReasons: string[] = [];
  for (let attempt = 1; attempt <= WRITER_ATTEMPTS; attempt++) {
    const p = writerPrompt({ ctx: o.ctx, screen: o.screen, idea: o.idea, steer, now: o.now, docText: o.docText, example: o.example });
    const w = await call({ purpose: "write", model: o.writerModel, system: p.system, user: p.user, maxTokens: writerMax }, attempt);
    if (w === "budget") return held("budget", [`stopped before writer attempt ${attempt}: it could take the run past --max-usd $${o.maxUsd} (spent $${spent().toFixed(4)})`, ...lastReasons]);
    const rec: AttemptRecord = { attempt, confidence: null, uncertainClaims: [], gates: [], factCheck: null, passed: false, raw: w.text };
    attempts.push(rec);

    const replyProblems: string[] = [];
    const parsed = parseWriterReply(w.text);
    if (w.stop === "max_tokens") replyProblems.push(`the reply was cut off at ${writerMax} output tokens; write a shorter document`);
    replyProblems.push(...parsed.problems);
    if (parsed.reply) {
      rec.confidence = parsed.reply.confidence;
      rec.uncertainClaims = parsed.reply.uncertainClaims;
      if (parsed.reply.confidence === "low") replyProblems.push(`the writer rated its own confidence low (${parsed.reply.uncertainClaims.join("; ") || "no claims listed"}): leave those claims out or source them`);
    }
    rec.gates.push({ gate: "reply", ok: replyProblems.length === 0, problems: replyProblems, ...(rec.uncertainClaims.length && rec.confidence !== "low" ? { notes: rec.uncertainClaims.map((c) => `listed by the writer: ${c}`) } : {}) });
    if (replyProblems.length || !parsed.reply) {
      lastReasons = replyProblems.map((r) => `attempt ${attempt} reply: ${r}`);
      steer = steerFrom(replyProblems);
      continue;
    }

    const det = runDeterministicGates(parsed.reply, { ctx: o.ctx, screen: o.screen, now: o.now, existingSlugs: o.existingSlugs, existingSims: o.existingSims, searchNodes: o.searchNodes });
    rec.gates.push(...det.results);
    if (!det.passed || !det.doc || !det.golden) {
      const failed = det.results.filter((r) => !r.ok).flatMap((r) => r.problems.map((x) => `${r.gate}: ${x}`));
      lastReasons = failed.map((r) => `attempt ${attempt} ${r}`);
      steer = steerFrom(failed);
      continue;
    }

    // The fact check: only for a draft that passed everything else.
    const claims = claimsOf(det.doc);
    const cp = checkerPrompt(det.doc, o.ctx, claims);
    let outcome: CheckOutcome = judgeCheck(claims, null);
    let callError: string | null = null;
    for (let c = 1; c <= CHECK_CALL_ATTEMPTS && outcome.status === "unchecked"; c++) {
      try {
        const r = await call({ purpose: "fact_check", model: o.checkModel, system: cp.system, user: cp.user, maxTokens: checkMax }, attempt);
        if (r === "budget") return held("budget", [`stopped before the fact check of attempt ${attempt}: it could take the run past --max-usd $${o.maxUsd}`]);
        outcome = judgeCheck(claims, parseCheckerReply(r.text));
        callError = outcome.status === "unchecked" ? "the checker's reply was unusable or skipped claims" : null;
      } catch (e) {
        callError = `the fact-check call failed: ${(e as Error).message}`;
      }
    }
    rec.factCheck = outcome;
    if (outcome.status === "unchecked") {
      rec.gates.push({ gate: "factCheck", ok: false, problems: [`the check did not run (${callError ?? "no result"}; claims with no answer: ${outcome.missing.slice(0, 10).join(", ")}). This is not a verdict on the draft: rerun it.`] });
      return held("check_did_not_run", [`attempt ${attempt}: the fact check did not run after ${CHECK_CALL_ATTEMPTS} calls; rerun the command. The draft passed every other gate.`]);
    }
    if (outcome.status === "disagree") {
      rec.gates.push({ gate: "factCheck", ok: false, problems: outcome.disagreements, notes: outcome.unsure.map((u) => `unsure: ${u}`) });
      lastReasons = outcome.disagreements.map((d) => `attempt ${attempt} factCheck disagrees: ${d}`);
      steer = steerFrom(outcome.disagreements.map((d) => `fact check disagrees: ${d}`));
      continue;
    }
    rec.gates.push({ gate: "factCheck", ok: true, problems: [], notes: outcome.unsure.map((u) => `unsure: ${u}`) });
    rec.passed = true;
    return { outcome: "ready", holdKind: null, reasons: [], doc: det.doc, golden: det.golden, attempts, calls };
  }
  return held("failed_twice", lastReasons);
}

// ---- files ----

export function readyDrafts(outDir: string): { label: string; doc: ScenarioDoc }[] {
  const root = join(outDir, "ready");
  if (!existsSync(root)) return [];
  const out: { label: string; doc: ScenarioDoc }[] = [];
  for (const course of readdirSync(root)) {
    for (const f of readdirSync(join(root, course)).filter((x) => x.endsWith(".sim.json"))) {
      out.push({ label: `draft ready/${course}/${f}`, doc: JSON.parse(readFileSync(join(root, course, f), "utf8")) as ScenarioDoc });
    }
  }
  return out;
}

// The seeded sims and the ready drafts: what a new draft must not duplicate
// or reuse a slug of.
export function existingFor(outDir: string): { sims: { label: string; doc: ScenarioDoc }[]; slugs: Set<string> } {
  const seeded = ALL_DOCUMENTS.map((e) => ({ label: `${e.course}/${e.slug}`, doc: loadDocument(e) }));
  const sims = [...seeded, ...readyDrafts(outDir)];
  return { sims, slugs: new Set([...ALL_DOCUMENTS.map((e) => e.slug), ...sims.map((s) => s.doc.slug)]) };
}

export interface RunMeta {
  at: string; // ISO timestamp
  course: string;
  objective: string;
  unitTitle: string;
  screen: string;
  idea: string | null;
  selection: SelectionRow;
  allowUnselected: boolean;
  writerModel: string;
  checkModel: string;
  maxUsd: number;
}

function stampOf(at: string): string {
  return at.replace(/[:.]/g, "-");
}

export function registerNote(course: string, slug: string, outDir: string): string {
  return [
    `# Register ${course}/${slug}`,
    "",
    "Generated by `npm run sims:generate` (REQ-230). It passed every gate and the fact check, and is NOT registered.",
    "A person reads it first (docs/sims.md 12.2). To register, from backend/:",
    "",
    "```",
    `mv ${join(outDir, "ready", course, `${slug}.sim.json`)} supabase/seed/sims/${course}/`,
    `mv ${join(outDir, "ready", course, `${slug}.golden.json`)} supabase/seed/sims/${course}/`,
    "```",
    "",
    "Then add this line to ALL_DOCUMENTS in lib/sim/documents.ts:",
    "",
    "```",
    `  entry("${course}", "${slug}"),`,
    "```",
    "",
    "and run `npm run sims:lint`, `npm test` and `npm run sim:cross-runtime -- engine-print`. It seeds as needs_expert_review.",
    "",
  ].join("\n");
}

export interface WrittenFiles {
  report: string;
  ready: string[];
  held: string[];
}

export function writeOutputs(result: GenerateResult, meta: RunMeta, outDir: string): WrittenFiles {
  const stamp = stampOf(meta.at);
  const slug = result.doc?.slug ?? null;
  const t = totals(result.calls);
  const written: WrittenFiles = { report: "", ready: [], held: [] };
  if (result.outcome === "ready" && result.doc && result.golden) {
    const dir = join(outDir, "ready", meta.course);
    mkdirSync(dir, { recursive: true });
    const files: [string, string][] = [
      [join(dir, `${result.doc.slug}.sim.json`), `${JSON.stringify(result.doc, null, 2)}\n`],
      [join(dir, `${result.doc.slug}.golden.json`), `${JSON.stringify(result.golden, null, 2)}\n`],
      [join(dir, `${result.doc.slug}.register.md`), registerNote(meta.course, result.doc.slug, outDir)],
    ];
    for (const [p, body] of files) {
      writeFileSync(p, body);
      written.ready.push(p);
    }
  } else {
    const dir = join(outDir, "held", meta.course, `${stamp}-${slug ?? "draft"}`);
    mkdirSync(dir, { recursive: true });
    for (const a of result.attempts) {
      const p = join(dir, `attempt-${a.attempt}.reply.txt`);
      writeFileSync(p, a.raw);
      written.held.push(p);
    }
    const p = join(dir, "reasons.json");
    writeFileSync(p, `${JSON.stringify({ holdKind: result.holdKind, reasons: result.reasons, attempts: result.attempts.map(({ raw: _raw, ...rest }) => rest) }, null, 2)}\n`);
    written.held.push(p);
  }
  const reports = join(outDir, "reports");
  mkdirSync(reports, { recursive: true });
  written.report = join(reports, `${stamp}-${meta.course}-${slug ?? "held"}.json`);
  const report = {
    ...meta,
    slug,
    outcome: result.outcome,
    holdKind: result.holdKind,
    reasons: result.reasons,
    attempts: result.attempts.map(({ raw: _raw, ...rest }) => rest),
    cost: { calls: result.calls, totals: t },
  };
  writeFileSync(written.report, `${JSON.stringify(report, null, 2)}\n`);
  const line: LedgerLine = {
    at: meta.at,
    course: meta.course,
    objective: meta.objective,
    screen: meta.screen,
    slug,
    outcome: result.outcome,
    usd: t.usd,
    inputTokens: t.inputTokens,
    outputTokens: t.outputTokens,
    retries: t.retries,
    factChecks: t.factChecks,
  };
  appendFileSync(join(reports, "costs.jsonl"), `${JSON.stringify(line)}\n`);
  return written;
}

// REQ-230 (docs/sims.md 12.2; runbook "Generating sims"): the sim generator.
//
//   npm run sims:generate -- --select --course CCRNADULT
//       sub-objectives that meet the selection rule, with the reason, ranked
//       by exam weight (objectives that already have a sim last)
//   npm run sims:generate -- --course CCRNADULT --objective "<exact title>" --screen bedside [--idea "..."]
//       estimate only (the default): builds the prompt, writes it to
//       <out>/prompts/, prints its size and an upper-bound cost. No call.
//   ... --run [--max-usd 3]
//       writes one draft, runs every gate and the fact check, retries once,
//       and writes it to <out>/ready/ (files to register by hand) or
//       <out>/held/ (with the reasons), plus a cost report
//   npm run sims:generate -- --cost-summary
//       the per-draft and per-ready-sim cost over every run so far
//
// Key: ANTHROPIC_PREGEN_API_KEY only (never the app's key); with none, --run
// refuses before any call. Prints counts, gate results and file paths --
// never the key.
import "../supabase/seed/env-local";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getModel } from "../lib/anthropic";
import { ALL_DOCUMENTS, loadDocument } from "../lib/sim/documents.ts";
import { parseGenArgs } from "../lib/sim/generator/args.ts";
import { courseObjectives, objectiveContext } from "../lib/sim/generator/course.ts";
import { formatSummary, parseLedger, summarize, upperBoundUsd } from "../lib/sim/generator/cost.ts";
import { anthropicClient, pregenKey } from "../lib/sim/generator/model.ts";
import { existingFor, generateSim, writeOutputs } from "../lib/sim/generator/pipeline.ts";
import { writerPrompt } from "../lib/sim/generator/prompt.ts";
import { formatSelection, rankSelection, selectionFor } from "../lib/sim/generator/selection.ts";

function simsByObjective(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of ALL_DOCUMENTS) {
    const d = loadDocument(e);
    m.set(d.objective, [...(m.get(d.objective) ?? []), `${e.course}/${e.slug}`]);
  }
  return m;
}

async function main(): Promise<number> {
  const args = parseGenArgs(process.argv.slice(2));
  const out = resolve(args.out ?? join(__dirname, "..", "sim-drafts"));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (args.mode === "costSummary") {
    const ledger = join(out, "reports", "costs.jsonl");
    if (!existsSync(ledger)) {
      console.log(`No drafts yet (${ledger} does not exist).`);
      return 0;
    }
    for (const l of formatSummary(summarize(parseLedger(readFileSync(ledger, "utf8"))))) console.log(l);
    return 0;
  }

  const sims = simsByObjective();
  if (args.mode === "select") {
    const rows = rankSelection(courseObjectives(args.course!), sims);
    console.log(`${args.course}: ${rows.length} sub-objective(s) meet the selection rule (at least two of: time matters, cues to read, choices with consequences, competing priorities). A keyword screen of each title; a person confirms.`);
    for (const l of formatSelection(rows)) console.log(l);
    return 0;
  }

  const ctx = objectiveContext(args.course!, args.objective!);
  const selection = selectionFor(ctx, sims.get(ctx.objective) ?? []);
  const writerModel = args.model ?? getModel();
  const checkModel = args.checkModel ?? writerModel; // REQ-187: never a weaker checker
  console.log(`${ctx.course} / ${ctx.unitTitle} / "${ctx.objective}" on the ${args.screen} screen.`);
  console.log(`Selection rule: ${selection.qualifies ? "meets it" : "does NOT meet it"} -- ${selection.reason}${selection.existingSims.length ? `; already has ${selection.existingSims.join(", ")}` : ""}.`);

  if (args.mode === "estimate") {
    const p = writerPrompt({ ctx, screen: args.screen!, idea: args.idea, now: today });
    const dir = join(out, "prompts");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${now.toISOString().replace(/[:.]/g, "-")}-${ctx.course}-${args.screen}.txt`);
    writeFileSync(file, `SYSTEM\n${p.system}\n\nUSER\n${p.user}\n`);
    const one = upperBoundUsd(writerModel, `${p.system}\n${p.user}`, 48_000);
    console.log(`Prompt: ${(p.system.length + p.user.length).toLocaleString("en-US")} characters, written to ${file}`);
    console.log(`Writer ${writerModel}, checker ${checkModel}. Upper bound per writer call $${one.toFixed(2)}; with the retry and the fact checks, under --max-usd $${args.maxUsd} the run stops before any call that could pass it.`);
    console.log("Nothing was sent. Add --run to generate (needs ANTHROPIC_PREGEN_API_KEY).");
    return 0;
  }

  pregenKey(); // refuses here, before anything is sent, when the key is missing
  const existing = existingFor(out);
  const result = await generateSim(
    {
      ctx,
      screen: args.screen!,
      idea: args.idea,
      now: today,
      writerModel,
      checkModel,
      maxUsd: args.maxUsd,
      searchNodes: args.searchNodes,
      existingSims: existing.sims,
      existingSlugs: existing.slugs,
      selection,
      allowUnselected: args.allowUnselected,
    },
    anthropicClient()
  );
  const written = writeOutputs(
    result,
    { at: now.toISOString(), course: ctx.course, objective: ctx.objective, unitTitle: ctx.unitTitle, screen: args.screen!, idea: args.idea, selection, allowUnselected: args.allowUnselected, writerModel, checkModel, maxUsd: args.maxUsd },
    out
  );
  for (const a of result.attempts) {
    console.log(`Attempt ${a.attempt}: ${a.gates.map((g) => `${g.gate} ${g.ok ? "ok" : "FAILED"}`).join(", ")}`);
  }
  const usd = result.calls.reduce((s, c) => s + c.usd, 0);
  if (result.outcome === "ready") {
    console.log(`READY: ${result.doc!.slug} passed every gate and the fact check. Not registered: read ${written.ready.find((p) => p.endsWith(".register.md"))}.`);
  } else {
    console.log(`HELD (${result.holdKind}): ${result.reasons.slice(0, 8).join(" | ")}`);
    console.log(`Drafts and reasons: ${written.held[written.held.length - 1]}`);
  }
  console.log(`Cost $${usd.toFixed(4)} over ${result.calls.length} call(s). Report: ${written.report}`);
  return result.outcome === "ready" ? 0 : 2;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
);

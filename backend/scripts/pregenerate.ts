// REQ-132 / REQ-208: pre-generate shared catalog lessons through the Message
// Batches API (50% off), so a learner's first visit to an objective is a cache
// hit instead of a 13-20 second wait.
//
// Nothing here runs on its own and nothing spends money unless asked. In
// production it runs from the "Pre-generate lessons" workflow
// (.github/workflows/pregenerate.yml); nobody handles the key or the database
// URL. The logic is in lib/pregen.ts.
//
//   npm run pregen                                   # estimate (the default), every track
//   npm run pregen -- --tracks DPT,PTPREREQ,CCRNADULT --max-usd 110
//                                                    # estimate in PRIORITY order with the
//                                                    # budget cutoff
//   npm run pregen -- --submit --tracks ... --max-usd 110        # create the intro batch
//   npm run pregen -- --submit ... --dry-run         # build every request, send nothing
//   npm run pregen -- --collect <batch> --tracks ... --max-usd 110
//        an ENDED intro batch -> checks the teaching texts, starts the practice batch
//   npm run pregen -- --collect <practice batch> --intro-batch <intro batch> --tracks ... --max-usd 110
//        an ENDED practice batch -> fact-check, save, report the actual cost
//   --summary <file>   write a counts-only JSON summary (the workflow's artifact)
//   --limit N          at most N objectives
//   --allow-concurrent skip the "a batch is already running" refusal
//   --confirm-full-run a submit without --limit (a full run); refused without
//                      it, so a trial (--limit 25) comes first (REQ-248)
//
// --tracks is a priority order: lessons are made track by track in the order
// given, unit by unit, and the cap (--max-usd, an UPPER BOUND on the cost)
// cuts off whole units from the end. Saving is insert-if-absent: it never
// replaces a lesson (or a pulled/voided/fixed one) or a learner's override.
//
// Key: ANTHROPIC_PREGEN_API_KEY, a key from a dedicated Console workspace
// with its own spend limit. Never the app's key: in GitHub Actions nothing
// else is accepted; locally ANTHROPIC_API_KEY (backend/.env.local) works.
// Prints counts, the estimate and batch ids only -- never prompts or content.

import "../supabase/seed/env-local";
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { closePool } from "../lib/db";
import { flushAiCallLog } from "../lib/ai-calls";
import { collectRun, estimateRun, submitRun, type BatchInfo, type BatchesClient, type Summary } from "../lib/pregen";
import { parseArgs } from "./pregenerate-lib";

function apiKey(): string {
  const dedicated = process.env.ANTHROPIC_PREGEN_API_KEY;
  if (dedicated) return dedicated;
  if (process.env.GITHUB_ACTIONS === "true") {
    throw new Error("ANTHROPIC_PREGEN_API_KEY is not set. In GitHub Actions pre-generation never falls back to another key.");
  }
  const local = process.env.ANTHROPIC_API_KEY;
  if (!local) throw new Error("No key: set ANTHROPIC_PREGEN_API_KEY (or ANTHROPIC_API_KEY in backend/.env.local for a local run).");
  return local;
}

let real: Anthropic | null = null;
function client(): Anthropic {
  if (!real) {
    const key = apiKey();
    // The live fact-check (lib/anthropic.ts) reads ANTHROPIC_API_KEY: point it
    // at the same dedicated key, so every call of the run is in one workspace.
    process.env.ANTHROPIC_API_KEY = key;
    real = new Anthropic({ apiKey: key });
  }
  return real;
}

// Created lazily: an estimate or a --dry-run submit never needs a key.
const batches: BatchesClient = {
  create: (p) => client().messages.batches.create(JSON.parse(JSON.stringify(p))) as unknown as Promise<{ id: string }>,
  retrieve: (id) => client().messages.batches.retrieve(id) as unknown as Promise<BatchInfo>,
  results: (id) => client().messages.batches.results(id) as unknown as Promise<AsyncIterable<unknown>>,
  list: (p) => client().messages.batches.list(p) as unknown as AsyncIterable<never>,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ctx = { batches, log: (m: string) => console.log(m) };
  let summary: Summary;
  try {
    if (args.mode === "collect") {
      summary = await collectRun(
        { batchId: args.batchId!, introBatchId: args.introBatchId, tracks: args.tracks, maxUsd: args.maxUsd, dryRun: args.dryRun, allowConcurrent: args.allowConcurrent },
        ctx
      );
    } else if (args.mode === "submit") {
      summary = await submitRun(
        { tracks: args.tracks, limit: args.limit, maxUsd: args.maxUsd!, dryRun: args.dryRun, allowConcurrent: args.allowConcurrent },
        ctx
      );
    } else {
      summary = await estimateRun({ tracks: args.tracks, limit: args.limit, maxUsd: args.maxUsd }, ctx);
    }
    if (args.summaryPath) writeFileSync(args.summaryPath, JSON.stringify({ ...summary, finishedAt: new Date().toISOString() }, null, 2));
  } finally {
    await flushAiCallLog();
    await closePool();
  }
}

main().catch((err) => {
  // The message only: never a request or a response body.
  console.error(err instanceof Error ? err.message.slice(0, 500) : "pregenerate failed");
  process.exit(1);
});

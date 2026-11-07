// REQ-094: pre-generate shared catalog lessons through the Message Batches
// API (50% off), so a learner's first visit to an objective is a cache hit
// instead of a 13-20 second wait.
//
// Nothing here runs on its own and nothing spends money unless asked:
//
//   npm run pregen                          # estimate only (the default): how many
//                                           # objectives lack a lesson, and the cost
//   npm run pregen -- --tracks SY0-701,SAA-C03 --limit 200   # narrow the estimate
//   npm run pregen -- --submit [same filters]                # create the batch
//   npm run pregen -- --collect <batch id>                   # check it; when it has
//                                                            # ended, save the lessons
//
// Saving is insert-if-absent into lesson_content (lib/lesson-store saveLesson,
// shared scope): it never replaces a lesson a learner may already have seen,
// and never touches anyone's per-learner override.
//
// Requests are built by the same code the app uses (lessonIntroPrompt /
// lessonPracticePrompt + buildRequest), so a pre-generated lesson is made
// exactly as an on-demand one would be.

import "../supabase/seed/env-local";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { query, closePool } from "../lib/db";
import { buildRequest, getModel } from "../lib/anthropic";
import { lessonIntroPrompt, lessonPracticePrompt, lessonIntroSchema, lessonPracticeSchema } from "../lib/prompts";
import { loadObjective } from "../lib/lesson-generation";
import { saveLesson } from "../lib/lesson-store";
import {
  estimateCost,
  pairBatchResults,
  requestIds,
  parseArgs,
  type BatchResultLine,
} from "./pregenerate-lib";

async function missingObjectives(tracks: string[], limit: number | null): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `select o.id
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where st.user_id is null
        and not exists (select 1 from lesson_content lc where lc.objective_id = o.id)
        and ($1::text[] is null or st.code = any($1::text[]))
      order by st.code, cu.sort_order, o.sort_order
      ${limit ? "limit " + Math.floor(limit) : ""}`,
    [tracks.length ? tracks : null]
  );
  return rows.map((r) => r.id);
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set (backend/.env.local). Needed for --submit and --collect.");
  return new Anthropic({ apiKey });
}

async function estimate(ids: string[]) {
  const e = estimateCost(ids.length);
  console.log(`Objectives in the shared catalog without a lesson: ${ids.length}`);
  console.log(`Model: ${getModel()} via the Batch API (2 requests per lesson)`);
  console.log(
    `Estimated cost: about $${e.totalUsd.toFixed(2)} ` +
      `(~$${e.perLessonUsd.toFixed(4)} per lesson; see the pricing note in pregenerate-lib.ts)`
  );
  console.log(`Nothing was sent. Add --submit to create the batch.`);
}

async function submit(ids: string[]) {
  if (!ids.length) {
    console.log("Every shared objective already has a lesson. Nothing to submit.");
    return;
  }
  const model = getModel();
  const requests: { custom_id: string; params: Record<string, unknown> }[] = [];
  for (const id of ids) {
    const obj = await loadObjective(id);
    if (!obj) continue;
    const base = { trackTitle: obj.track_title, unitTitle: obj.unit_title, objectiveTitle: obj.title, ctx: obj.ctx ?? undefined };
    const intro = lessonIntroPrompt(base);
    const practice = lessonPracticePrompt(base);
    const ridIds = requestIds(id);
    const common = { model, effort: "medium" as const, thinking: "off" as const, purpose: "lesson_intro" as const };
    requests.push({
      custom_id: ridIds.intro,
      params: buildRequest(
        { ...common, system: intro.system, messages: [{ role: "user", content: intro.user }], maxTokens: 4000 },
        zodOutputFormat(lessonIntroSchema)
      ),
    });
    requests.push({
      custom_id: ridIds.practice,
      params: buildRequest(
        { ...common, purpose: "lesson_practice", system: practice.system, messages: [{ role: "user", content: practice.user }], maxTokens: 6000 },
        zodOutputFormat(lessonPracticeSchema)
      ),
    });
  }
  // JSON round-trip drops the zod helper's functions; the API takes plain JSON.
  const batch = await client().messages.batches.create({ requests: JSON.parse(JSON.stringify(requests)) });
  const dir = join(__dirname, "..", "pregen-state");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${batch.id}.json`), JSON.stringify({ id: batch.id, model, objectives: ids.length, createdAt: new Date().toISOString() }, null, 2));
  console.log(`Submitted batch ${batch.id}: ${ids.length} lessons, ${requests.length} requests.`);
  console.log(`Most batches finish within an hour. Then run: npm run pregen -- --collect ${batch.id}`);
}

async function collect(batchId: string) {
  const c = client();
  const batch = await c.messages.batches.retrieve(batchId);
  console.log(`Batch ${batchId}: ${batch.processing_status}`, batch.request_counts);
  if (batch.processing_status !== "ended") {
    console.log("Not finished yet. Run --collect again later.");
    return;
  }
  const lines: BatchResultLine[] = [];
  for await (const r of await c.messages.batches.results(batchId)) lines.push(r as unknown as BatchResultLine);
  const { lessons, failed } = pairBatchResults(lines, lessonIntroSchema, lessonPracticeSchema);
  const model = getModel();
  let saved = 0;
  let kept = 0;
  for (const l of lessons) {
    const before = await query(`select 1 from lesson_content where objective_id = $1`, [l.objectiveId]);
    await saveLesson({ kind: "shared" }, l.objectiveId, { ...l.intro, ...l.practice }, model);
    if (before.length) kept++;
    else saved++;
  }
  console.log(`Saved ${saved} new lessons; ${kept} already had one and were left alone; ${failed.length} failed.`);
  for (const f of failed.slice(0, 20)) console.log(`  failed ${f.objectiveId}: ${f.reason}`);
  if (failed.length) console.log("Failed objectives are simply still missing; the app generates them on first visit, or re-run --submit.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    if (args.mode === "collect") return await collect(args.batchId!);
    const ids = await missingObjectives(args.tracks, args.limit);
    if (args.mode === "submit") return await submit(ids);
    return await estimate(ids);
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

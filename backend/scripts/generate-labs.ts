// REQ-123: generate verifiable labs for the shared catalog through the
// Message Batches API (50% off), for scale-out beyond the authored pilot.
//
// Nothing here spends money unless asked:
//
//   npm run labs:generate                         # estimate only (the default): which
//                                                 # objectives the density policy picks
//                                                 # that have no lab yet, and the cost
//   npm run labs:generate -- --compare            # compare the four density policies over
//                                                 # the whole seeded catalog (no database)
//   npm run labs:generate -- --tracks AWSSAA,PMP --policy hybrid --limit 40
//   npm run labs:generate -- --submit [filters]   # create the batch
//   npm run labs:generate -- --collect <batch id> # when it has ended: check and store
//
// Storing goes through lib/lab-generation.ts saveGeneratedLab, the REQ-216 gate:
// a lab is held only when the writer rated its confidence low, it broke a content
// rule, or the independent check found a wrong reference answer or something
// unsafe. A held lab is written once more (live, steered with what held it back);
// held twice, the outcome line says why in plain words. A failed check call is
// retryable and holds nothing back. Then insert-if-absent as source 'generated',
// review_status 'needs_expert_review' -- never served in production until a
// person approves it (docs/labs.md).

import "../supabase/seed/env-local";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { query, queryOne, closePool } from "../lib/db";
import { isActive } from "../lib/progress-sql";
import { buildRequest, getModel } from "../lib/anthropic";
import { coachContextForObjective } from "../lib/coach-context";
import { describeSaveOutcome, labGenerationPrompt, labGenerationSchema, modelLabWriter, saveGeneratedLab, type SaveOutcome } from "../lib/lab-generation";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { NURSING_TRACKS } from "../supabase/seed/tracks/nursing";
import { PT_TRACKS } from "../supabase/seed/tracks/pt";
import { CCRN_TRACKS } from "../supabase/seed/tracks/ccrn";
import { CCRN_PEDS_NEO_TRACKS } from "../supabase/seed/tracks/ccrn-peds-neo";
import { FITNESS_TRACKS } from "../supabase/seed/tracks/fitness";
import { EMS_TRACKS } from "../supabase/seed/tracks/ems";
import {
  formatSummary,
  isPerformanceObjective,
  kindFor,
  labRequestId,
  parseLabGenArgs,
  parseLabRequestId,
  perLabGenerationUsd,
  summarize,
  unitPlan,
  type LabFamily,
  type PlanTrack,
} from "./generate-labs-lib";

// REQ-174: the NREMT tracks sit under healthcare-nursing too, so they are clinical.
const CLINICAL = new Set([...NURSING_TRACKS, ...PT_TRACKS, ...CCRN_TRACKS, ...CCRN_PEDS_NEO_TRACKS, ...EMS_TRACKS].map((t) => t.code));
const FITNESS = new Set(FITNESS_TRACKS.map((t) => t.code));

function familyOf(code: string): LabFamily {
  return CLINICAL.has(code) ? "clinical" : FITNESS.has(code) ? "fitness" : "general";
}

function planTracks(filter: string[]): PlanTrack[] {
  return CATALOG_TRACKS.filter((t) => !filter.length || filter.includes(t.code)).map((t) => ({
    code: t.code,
    family: familyOf(t.code),
    units: activeUnits(t).map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })),
  }));
}

interface Target {
  objectiveId: string;
  trackCode: string;
  trackTitle: string;
  unitTitle: string;
  objectiveTitle: string;
  kind: "build" | "case";
}

// Per unit: the policy's count, minus labs the unit already has, filled with
// performance objectives that have no lab yet, in course order.
async function targets(tracks: PlanTrack[], policy: ReturnType<typeof parseLabGenArgs>["policy"], limit: number | null): Promise<Target[]> {
  const out: Target[] = [];
  for (const t of tracks) {
    const plan = unitPlan(t, policy);
    const rows = await query<{ unit_sort: number; unit_title: string; track_title: string; id: string; title: string; labs: number; unit_labs: number }>(
      `select cu.sort_order as unit_sort, cu.title as unit_title, st.title as track_title, o.id, o.title,
              (select count(*)::int from labs l where l.objective_id = o.id and l.retired_at is null) as labs,
              (select count(*)::int from labs l join objectives o2 on o2.id = l.objective_id
                where o2.unit_id = cu.id and l.retired_at is null) as unit_labs
         from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where st.code = $1 and st.user_id is null and ${isActive("cu")} and ${isActive("o")}
        order by cu.sort_order, o.sort_order`,
      [t.code]
    );
    const units = [...new Set(rows.map((r) => r.unit_sort))];
    units.forEach((sort, i) => {
      const inUnit = rows.filter((r) => r.unit_sort === sort);
      const want = Math.max(0, (plan[i] ?? 0) - (inUnit[0]?.unit_labs ?? 0));
      inUnit
        .filter((r) => r.labs === 0 && isPerformanceObjective(r.title, t.family))
        .slice(0, want)
        .forEach((r) =>
          out.push({
            objectiveId: r.id,
            trackCode: t.code,
            trackTitle: r.track_title,
            unitTitle: r.unit_title,
            objectiveTitle: r.title,
            kind: kindFor(t.family),
          })
        );
    });
    if (limit && out.length >= limit) return out.slice(0, limit);
  }
  return limit ? out.slice(0, limit) : out;
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set (backend/.env.local). Needed for --submit and --collect.");
  return new Anthropic({ apiKey });
}

async function submit(list: Target[]) {
  if (!list.length) return console.log("Nothing to generate under this policy. Nothing submitted.");
  const model = getModel();
  const requests: { custom_id: string; params: Record<string, unknown> }[] = [];
  for (const t of list) {
    const ctx = (await coachContextForObjective(t.objectiveId)) ?? undefined;
    const { system, user } = labGenerationPrompt({
      trackTitle: t.trackTitle,
      unitTitle: t.unitTitle,
      objectiveTitle: t.objectiveTitle,
      kind: t.kind,
      family: familyOf(t.trackCode),
      ctx,
    });
    requests.push({
      custom_id: labRequestId(t.objectiveId, t.kind),
      params: buildRequest(
        { model, effort: "medium", thinking: "off", purpose: "lab_generate", userId: null, system, messages: [{ role: "user", content: user }], maxTokens: 4000 },
        zodOutputFormat(labGenerationSchema)
      ),
    });
  }
  const batch = await client().messages.batches.create({ requests: JSON.parse(JSON.stringify(requests)) });
  const dir = join(__dirname, "..", "pregen-state");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${batch.id}.labs.json`), JSON.stringify({ id: batch.id, model, labs: list.length, createdAt: new Date().toISOString() }, null, 2));
  console.log(`Submitted batch ${batch.id}: ${list.length} labs. Then run: npm run labs:generate -- --collect ${batch.id}`);
}

async function collect(batchId: string) {
  const c = client();
  const batch = await c.messages.batches.retrieve(batchId);
  console.log(`Batch ${batchId}: ${batch.processing_status}`, batch.request_counts);
  if (batch.processing_status !== "ended") return console.log("Not finished yet. Run --collect again later.");
  const model = getModel();
  const tally: Record<string, number> = {};
  for await (const r of await c.messages.batches.results(batchId)) {
    const line = r as unknown as { custom_id: string; result: { type: string; message?: { content: { type: string; text?: string }[]; stop_reason?: string } } };
    const id = parseLabRequestId(line.custom_id);
    const text = line.result.type === "succeeded" && line.result.message?.stop_reason !== "max_tokens"
      ? line.result.message?.content.find((b) => b.type === "text")?.text
      : undefined;
    let parsed: ReturnType<typeof labGenerationSchema.safeParse> | null = null;
    try {
      parsed = id && text ? labGenerationSchema.safeParse(JSON.parse(text)) : null;
    } catch {
      parsed = null;
    }
    if (!id || !parsed?.success) {
      tally.failed = (tally.failed ?? 0) + 1;
      continue;
    }
    const ctx = (await coachContextForObjective(id.objectiveId)) ?? undefined;
    const where = await queryOne<{ track_code: string; track_title: string; unit_title: string; title: string }>(
      `select st.code as track_code, st.title as track_title, cu.title as unit_title, o.title
         from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where o.id = $1`,
      [id.objectiveId]
    );
    let outcome: SaveOutcome | "error";
    try {
      outcome = await saveGeneratedLab({
        objectiveId: id.objectiveId,
        kind: id.kind,
        generated: parsed.data,
        model,
        ctx,
        regenerate: where
          ? modelLabWriter({ trackTitle: where.track_title, unitTitle: where.unit_title, objectiveTitle: where.title, kind: id.kind, family: familyOf(where.track_code), ctx })
          : undefined,
      });
    } catch (err) {
      // the steered retry or the database failed: nothing was stored for this one
      console.log(`  ${id.objectiveId}: error, run --collect again: ${err instanceof Error ? err.message : err}`);
      outcome = "error";
    }
    tally[outcome] = (tally[outcome] ?? 0) + 1;
    if (outcome !== "error" && outcome !== "saved" && outcome !== "exists") console.log(`  ${id.objectiveId}: ${describeSaveOutcome(outcome)}`);
  }
  console.log("Outcome:", tally, "-- every saved lab is needs_expert_review until a person approves it.");
}

async function main() {
  const args = parseLabGenArgs(process.argv.slice(2));
  const tracks = planTracks(args.tracks);
  if (args.mode === "compare") {
    console.log(`Density policies over ${tracks.length} courses (seeded catalog, active units):`);
    for (const p of ["fixed", "weighted", "per_objective", "hybrid"] as const) console.log("  " + formatSummary(summarize(tracks, p)));
    return;
  }
  try {
    if (args.mode === "collect") return await collect(args.batchId!);
    const list = await targets(tracks, args.policy, args.limit);
    if (args.mode === "submit") return await submit(list);
    const per = perLabGenerationUsd();
    console.log(`Policy ${args.policy}: ${list.length} objectives would get a new lab (${tracks.length} courses).`);
    console.log(`Model: ${getModel()} via the Batch API, plus one fast-model check per lab.`);
    console.log(`Estimated cost: about $${(list.length * per).toFixed(2)} (~$${per.toFixed(4)} per lab, a quarter extra for regenerations).`);
    console.log("Nothing was sent. Add --submit to create the batch.");
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

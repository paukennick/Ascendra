import { query } from "@/lib/db";
import { coachContextForObjective } from "@/lib/coach-context";
import { factCheckCallText, factCheckMaxTokens, factCheckModel, modelFactChecker, type CheckItem, type CheckVerdict, type FactChecker } from "@/lib/fact-check";
import { lessonItemId, loadCheckItem, servableSql, type ItemKind, type ItemRef } from "@/lib/item-quality";
import { alreadyStagedSql, stageForReview } from "@/lib/staging";
import { BudgetStop, estimateCall, type RunBudget } from "@/lib/run-budget";

// REQ-187 (audit 2026-11-09 R6): re-check content stored before the
// fact-check gate. REQ-196: sandboxed -- it runs only in GitHub Actions, as
// a staging-only database role, under a dollar cap, and changes nothing a
// learner sees.
//
// The gate (REQ-114) went live on 2026-11-07; 24 of the 32 stored lessons,
// and every older exam, review, Quiz-me and comparison item, were generated
// before it and never checked. This job answers each still-served item again
// with the current checker (the writer's own model with thinking,
// lib/fact-check.ts), without its key. Every item it does not agree with is
// STAGED: an item_holdbacks row (lib/staging.ts) with its content and the
// checker's claims. It is not pulled: the item keeps being served until a
// person runs `npm run items -- confirm` (pulled, answers voided) or
// `clear` (fine; never staged again). The job's role cannot write
// item_status at all (migration 064, lib/recheck-guard.ts).
//
// Lessons: the shared lesson and every learner's regenerated copy, both
// checks. Authored and corrected lessons (model 'authored:...' /
// 'corrected:...') are skipped: a person wrote or reviewed them. Labs, PBQs
// and unit checks have no key the checker can answer. Items a person has
// already decided (any item_status row) or already staged are skipped.
//
// Modes: "estimate" (default) makes no model call and writes nothing; it
// prints how many items and batches there are and what they would cost.
// "check" makes the calls and writes nothing. "apply" makes the calls and
// stages. Cost: one writer-model call per batch of up to BATCH items from
// one objective, each started only if the run's budget can cover the most
// it could cost (lib/run-budget.ts).

export const GATE_DATE = "2026-11-07";
export const BATCH = 8;
export const RECHECK_REASON = "recheck_pre_gate";

export interface StoredRef {
  ref: ItemRef;
  source: string; // where it came from, for the log
}

const PERSON_MADE = `(model like 'authored:%' or model like 'corrected:%')`;

// Every still-served keyed item stored before `before`.
export async function storedBefore(before: string, kinds: readonly ItemKind[] = ["lesson", "review", "quiz", "exam", "comparison"]): Promise<StoredRef[]> {
  const out: StoredRef[] = [];
  const add = (kind: ItemKind, rows: { id: string; objective_id: string | null; question: string }[], source: string) => {
    for (const r of rows) out.push({ ref: { kind, itemId: r.id, objectiveId: r.objective_id, question: r.question }, source });
  };
  if (kinds.includes("lesson")) {
    for (const table of ["lesson_content", "lesson_content_overrides", "lesson_content_variants"]) {
      const rows = await query<{ objective_id: string; fade_problem: string; solo_check: string }>(
        `select objective_id, fade_problem, solo_check from ${table} t
          where generated_at < $1::date and not ${PERSON_MADE}`,
        [before]
      );
      for (const r of rows) {
        for (const [stage, q] of [["fade", r.fade_problem], ["solo", r.solo_check]] as const) {
          out.push({ ref: { kind: "lesson", itemId: lessonItemId(r.objective_id, stage, q), objectiveId: r.objective_id, question: q }, source: table });
        }
      }
    }
  }
  if (kinds.includes("review")) {
    add("review", await query(`select id::text, objective_id, question from review_items where generated_at < $1::date and ${servableSql("review", "id")}`, [before]), "review_items");
  }
  if (kinds.includes("quiz")) {
    add("quiz", await query(`select id::text, objective_id, question from coach_quiz_items where generated_at < $1::date and ${servableSql("quiz", "id")}`, [before]), "coach_quiz_items");
  }
  if (kinds.includes("exam")) {
    // FAIL-885: and a lesson check copied into the bank (source 'lesson'),
    // which is a different item from the lesson check it was copied from and
    // was skipped here. It is as old as the stored lesson it came from, not
    // as its own row, and is skipped when a person wrote or corrected that
    // lesson (the same rule as the lesson branch above).
    add(
      "exam",
      await query(
        `select e.id::text, e.objective_id, e.stem as question from exam_items e
          where ${servableSql("exam", "e.id")}
            and ((e.source = 'generated' and e.created_at < $1::date)
              or (e.source = 'lesson' and exists (
                    select 1 from lesson_content lc
                     where lc.objective_id = e.objective_id and (lc.fade_problem = e.stem or lc.solo_check = e.stem)
                       and lc.generated_at < $1::date and not (lc.model like 'authored:%' or lc.model like 'corrected:%'))))`,
        [before]
      ),
      "exam_items"
    );
  }
  if (kinds.includes("comparison")) {
    add(
      "comparison",
      await query(
        `select d.id::text, null::uuid as objective_id, d.scenario as question from discrimination_items d where d.created_at < $1::date and ${servableSql("comparison", "d.id")}`,
        [before]
      ),
      "discrimination_items"
    );
  }
  // One entry per item (a learner's copy can repeat the shared check), and
  // nothing a person already decided (any item_status row: pulled, confirmed
  // or cleared) or already staged.
  const seen = new Set<string>();
  const pulled = new Set(
    (await query<{ k: string }>(
      `select item_kind || '|' || item_id as k from item_status
       union
       select (content->>'itemKind') || '|' || (content->>'itemId') from item_holdbacks hb
        where ${alreadyStagedSql("hb.content->>'itemKind'", "hb.content->>'itemId'")}`
    )).map((r) => r.k)
  );
  return out.filter((s) => {
    const k = `${s.ref.kind}|${s.ref.itemId}`;
    if (seen.has(k) || pulled.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export type RecheckMode = "estimate" | "check" | "apply";

export interface RecheckOutcome {
  mode: RecheckMode;
  items: number; // stored items found
  batches: number;
  estimate: { upperUsd: number; typicalUsd: number }; // for every batch
  checked: number;
  agreed: number;
  // staged in item_holdbacks ("apply"), or would be ("check")
  staged: { ref: ItemRef; verdict: CheckVerdict | null; source: string }[];
  skipped: number; // could not be loaded or answered
  errors: string[];
  // set when the budget stopped the run before every batch was checked
  stoppedAtBudget: string | null;
}

async function stage(ref: ItemRef, verdict: CheckVerdict | null, item: CheckItem): Promise<void> {
  const claims = verdict?.unsupportedClaims.length
    ? verdict.unsupportedClaims
    : [`re-check of content stored before ${GATE_DATE}: ${verdict ? `independent answer ${JSON.stringify(verdict.answer)} vs key ${JSON.stringify(item.expected)}` : "no answer"}`];
  await stageForReview({
    source: "recheck",
    kind: ref.kind,
    itemId: ref.itemId,
    objectiveId: ref.objectiveId,
    question: ref.question,
    claims,
    detail: { reason: RECHECK_REASON, outcome: verdict?.outcome ?? "missing", answer: verdict?.answer ?? null, item },
  });
}

export async function recheckStored(opts: {
  before?: string;
  mode: RecheckMode;
  kinds?: readonly ItemKind[];
  limit?: number;
  checker?: FactChecker;
  // required for "check" and "apply": the run's dollar cap
  budget?: RunBudget;
  model?: string; // for the estimate; the checker's model
  log?: (msg: string) => void;
}): Promise<RecheckOutcome> {
  const log = opts.log ?? (() => {});
  const checker = opts.checker ?? modelFactChecker;
  const model = opts.model ?? factCheckModel();
  if (opts.mode !== "estimate" && !opts.budget) throw new Error("a budget is required to make model calls");
  const refs = (await storedBefore(opts.before ?? GATE_DATE, opts.kinds)).slice(0, opts.limit ?? Infinity);
  const out: RecheckOutcome = {
    mode: opts.mode, items: refs.length, batches: 0, estimate: { upperUsd: 0, typicalUsd: 0 },
    checked: 0, agreed: 0, staged: [], skipped: 0, errors: [], stoppedAtBudget: null,
  };
  // Batches per objective, so each call has the right course context.
  const byObjective = new Map<string, { ref: StoredRef; item: CheckItem }[]>();
  for (const s of refs) {
    const item = await loadCheckItem(s.ref);
    if (!item) {
      out.skipped++;
      continue;
    }
    const k = s.ref.objectiveId ?? "-";
    if (!byObjective.has(k)) byObjective.set(k, []);
    byObjective.get(k)!.push({ ref: s, item });
  }
  type Planned = { objectiveId: string; ctx: Awaited<ReturnType<typeof coachContextForObjective>> | undefined; batch: { ref: StoredRef; item: CheckItem }[]; upperUsd: number };
  const plan: Planned[] = [];
  for (const [objectiveId, list] of byObjective) {
    const ctx = objectiveId !== "-" ? (await coachContextForObjective(objectiveId)) ?? undefined : undefined;
    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH).map((x, j) => ({ ...x, item: { ...x.item, key: `i${j + 1}` } }));
      const est = estimateCall({ model, promptText: factCheckCallText(batch.map((b) => b.item), ctx), maxTokens: factCheckMaxTokens(batch.length), thinking: "default", items: batch.length });
      out.estimate.upperUsd += est.upperUsd;
      out.estimate.typicalUsd += est.typicalUsd;
      plan.push({ objectiveId, ctx, batch, upperUsd: est.upperUsd });
    }
  }
  out.batches = plan.length;
  if (opts.mode === "estimate") return out;
  for (const p of plan) {
    try {
      opts.budget!.reserve(p.upperUsd);
    } catch (err) {
      if (!(err instanceof BudgetStop)) throw err;
      out.stoppedAtBudget = err.message;
      log(err.message);
      break;
    }
    let verdicts: CheckVerdict[];
    try {
      verdicts = await checker(p.batch.map((b) => b.item), { ctx: p.ctx ?? undefined, purpose: "item_recheck" });
    } catch (err) {
      out.errors.push(`${p.objectiveId}: ${(err as Error)?.message ?? "check failed"}`);
      continue; // nothing is staged on a failed call; a re-run picks it up
    }
    for (const b of p.batch) {
      out.checked++;
      const v = verdicts.find((x) => x.key === b.item.key) ?? null;
      if (v?.publish) {
        out.agreed++;
        continue;
      }
      out.staged.push({ ref: b.ref.ref, verdict: v, source: b.ref.source });
      log(`${opts.mode === "apply" ? "staged" : "would stage"} ${b.ref.ref.kind} ${b.ref.ref.itemId} (${b.ref.source}): ${v?.outcome ?? "missing"}`);
      if (opts.mode === "apply") await stage(b.ref.ref, v, b.item);
    }
  }
  return out;
}

import { query } from "@/lib/db";
import { coachContextForObjective } from "@/lib/coach-context";
import { modelFactChecker, type CheckItem, type CheckVerdict, type FactChecker } from "@/lib/fact-check";
import { lessonItemId, loadCheckItem, recordHoldback, servableSql, type ItemKind, type ItemRef } from "@/lib/item-quality";
import { AUTHORED_ADVISING_MODEL } from "@/lib/degree-advising";

// REQ-187 (audit 2026-11-09 R6): re-check content stored before the
// fact-check gate.
//
// The gate (REQ-114) went live on 2026-11-07; 24 of the 32 stored lessons,
// and every older exam, review, Quiz-me and comparison item, were generated
// before it and never checked. This job answers each still-served item again
// with the current checker (the writer's own model with thinking,
// lib/fact-check.ts), without its key, and pulls every one it does not agree
// with: an item_status row 'quarantined' (reason 'recheck_pre_gate'), so it
// is never served or graded again until a person clears or confirms it
// (npm run items), plus an item_holdbacks row with its content and the
// checker's claims. A pulled lesson check makes the lesson unservable, and
// the next visit generates a replacement through the hardened pipeline.
// Nothing is voided: a person decides that (confirm), as for any flag.
//
// Lessons: the shared lesson and every learner's regenerated copy, both
// checks. Authored and corrected lessons (model 'authored:...' /
// 'corrected:...') are skipped: a person wrote or reviewed them. Labs, PBQs
// and unit checks have no key the checker can answer.
//
// Cost: one writer-model call per batch of up to BATCH items from one
// objective. Dry run (the default) still makes the calls -- it is the check
// -- but writes nothing.

export const GATE_DATE = "2026-11-07";
export const BATCH = 8;
export const RECHECK_REASON = "recheck_pre_gate";

export interface StoredRef {
  ref: ItemRef;
  source: string; // where it came from, for the log
}

const PERSON_MADE = `(model like 'authored:%' or model like 'corrected:%' or model = '${AUTHORED_ADVISING_MODEL}')`;

// Every still-served keyed item stored before `before`.
export async function storedBefore(before: string, kinds: readonly ItemKind[] = ["lesson", "review", "quiz", "exam", "comparison"]): Promise<StoredRef[]> {
  const out: StoredRef[] = [];
  const add = (kind: ItemKind, rows: { id: string; objective_id: string | null; question: string }[], source: string) => {
    for (const r of rows) out.push({ ref: { kind, itemId: r.id, objectiveId: r.objective_id, question: r.question }, source });
  };
  if (kinds.includes("lesson")) {
    for (const table of ["lesson_content", "lesson_content_overrides"]) {
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
    add("exam", await query(`select id::text, objective_id, stem as question from exam_items where source = 'generated' and created_at < $1::date and ${servableSql("exam", "id")}`, [before]), "exam_items");
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
  // nothing already pulled.
  const seen = new Set<string>();
  const pulled = new Set(
    (await query<{ k: string }>(`select item_kind || '|' || item_id as k from item_status where status <> 'cleared'`)).map((r) => r.k)
  );
  return out.filter((s) => {
    const k = `${s.ref.kind}|${s.ref.itemId}`;
    if (seen.has(k) || pulled.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface RecheckOutcome {
  checked: number;
  agreed: number;
  pulled: { ref: ItemRef; verdict: CheckVerdict | null; source: string }[];
  skipped: number; // could not be loaded or answered
  errors: string[];
}

// Pulls one item from rotation (quarantine) and logs it. Idempotent.
async function pull(ref: ItemRef, verdict: CheckVerdict | null, item: CheckItem): Promise<void> {
  await query(
    `insert into item_status (item_kind, item_id, objective_id, question, status, reason, flag_count)
     values ($1, $2, $3, $4, 'quarantined', $5, 0)
     on conflict (item_kind, item_id) do nothing`,
    [ref.kind, ref.itemId, ref.objectiveId, ref.question, RECHECK_REASON]
  );
  const claims = verdict?.unsupportedClaims.length
    ? verdict.unsupportedClaims
    : [`re-check of content stored before ${GATE_DATE}: ${verdict ? `independent answer ${JSON.stringify(verdict.answer)} vs key ${JSON.stringify(item.expected)}` : "no answer"}`];
  await recordHoldback({ kind: ref.kind, objectiveId: ref.objectiveId, reason: "fact_check", claims, content: item, model: null });
}

export async function recheckStored(opts: {
  before?: string;
  apply: boolean;
  kinds?: readonly ItemKind[];
  limit?: number;
  checker?: FactChecker;
  log?: (msg: string) => void;
}): Promise<RecheckOutcome> {
  const log = opts.log ?? (() => {});
  const checker = opts.checker ?? modelFactChecker;
  const refs = (await storedBefore(opts.before ?? GATE_DATE, opts.kinds)).slice(0, opts.limit ?? Infinity);
  const out: RecheckOutcome = { checked: 0, agreed: 0, pulled: [], skipped: 0, errors: [] };
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
  for (const [objectiveId, list] of byObjective) {
    const ctx = objectiveId !== "-" ? (await coachContextForObjective(objectiveId)) ?? undefined : undefined;
    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH).map((x, j) => ({ ...x, item: { ...x.item, key: `i${j + 1}` } }));
      let verdicts: CheckVerdict[];
      try {
        verdicts = await checker(batch.map((b) => b.item), { ctx, purpose: "item_recheck" });
      } catch (err) {
        out.errors.push(`${objectiveId}: ${(err as Error)?.message ?? "check failed"}`);
        continue; // nothing is pulled on a failed call; a re-run picks it up
      }
      for (const b of batch) {
        out.checked++;
        const v = verdicts.find((x) => x.key === b.item.key) ?? null;
        if (v?.publish) {
          out.agreed++;
          continue;
        }
        out.pulled.push({ ref: b.ref.ref, verdict: v, source: b.ref.source });
        log(`${opts.apply ? "pulled" : "would pull"} ${b.ref.ref.kind} ${b.ref.ref.itemId} (${b.ref.source}): ${v?.outcome ?? "missing"}`);
        if (opts.apply) await pull(b.ref.ref, v, b.item);
      }
    }
  }
  return out;
}

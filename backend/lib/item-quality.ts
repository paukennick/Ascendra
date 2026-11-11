import { createHash } from "node:crypto";
import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { coachContextForObjective } from "@/lib/coach-context";
import { factCheckEnabled, modelFactChecker, orderingForCheck, type CheckItem, type FactChecker } from "@/lib/fact-check";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";

// REQ-114 (Audit 3 H1/H2/H3): what keeps a wrong shared item from reaching
// every learner. Migration 042.
//
//   Held back      generated content that never goes live: the generator
//                  listed uncertain claims (or low confidence), or the
//                  second-model fact-check disagreed (lib/fact-check.ts).
//                  Logged with its full content in item_holdbacks.
//   Flagged        a learner reported it ("Report a problem with this
//                  question"), or the free-response grader judged the
//                  reference answer wrong (classification 'key-suspect').
//   Quarantined    pulled from rotation: N independent flags (distinct
//                  learners; item_quality_params.quarantine_flag_threshold,
//                  default 3), or one flag plus a failed automated re-check.
//                  Never served again unless a person clears it.
//   Confirmed wrong  a person confirmed the key is wrong: every answer graded
//                  against it is voided (kept, left out of mastery) and the
//                  learners' mastery is recomputed.

// REQ-123: "lab" (migration 050) -- a verifiable lab, by labs.id.
// REQ-199: "sim" (migration 067) -- one simulation VERSION, by sim_versions.id.
export const ITEM_KINDS = ["lesson", "review", "exam", "quiz", "comparison", "lab", "sim"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const FLAG_REASONS = ["wrong_answer", "unclear", "outdated", "offensive", "other"] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const DEFAULT_QUARANTINE_THRESHOLD = 3;

export interface ItemRef {
  kind: ItemKind;
  itemId: string;
  objectiveId: string | null;
  question: string;
}

// Kinds with no automated re-check: nothing for the choice checker to answer
// without a key, so a flag goes to a person (REQ-123 labs, REQ-199 sims).
const NO_RECHECK: readonly ItemKind[] = ["lab", "sim"];

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

// A lesson check has no row of its own; it is identified by objective, stage
// and the question text, so a regenerated lesson's new check is a new item.
export function lessonItemId(objectiveId: string, stage: "fade" | "solo", question: string): string {
  return `${objectiveId.toLowerCase()}:${stage}:${md5(question)}`;
}

// SQL: true when the item is not pulled (no status row, or cleared). Used in
// every query that picks an item to serve. `idExpr` is a SQL expression for
// the item id (cast to text here).
export function servableSql(kind: ItemKind, idExpr: string): string {
  return `not exists (select 1 from item_status qs where qs.item_kind = '${kind}' and qs.item_id = (${idExpr})::text and qs.status <> 'cleared')`;
}

// SQL: true when the lesson check an exam_items copy (source 'lesson') was
// made from is not pulled. The copy has no stage, and a lesson check's id is
// '<objective>:<stage>:<md5(question)>', so both stages are tried. `alias` is
// the exam_items alias. FAIL-885.
export function lessonCopyServableSql(alias: string): string {
  return `not exists (select 1 from item_status qs
     where qs.item_kind = 'lesson' and qs.status <> 'cleared'
       and qs.item_id in (${alias}.objective_id::text || ':fade:' || md5(${alias}.stem),
                          ${alias}.objective_id::text || ':solo:' || md5(${alias}.stem)))`;
}

// SQL: true when neither of a lesson row's two checks is pulled. `alias` is
// the lesson_content / lesson_content_overrides alias (or table name).
export function lessonServableSql(alias: string): string {
  return `not exists (select 1 from item_status qs
     where qs.item_kind = 'lesson' and qs.status <> 'cleared'
       and qs.item_id in (${alias}.objective_id::text || ':fade:' || md5(${alias}.fade_problem),
                          ${alias}.objective_id::text || ':solo:' || md5(${alias}.solo_check)))`;
}

// ---------------------------------------------------------------------------
// Generator uncertainty (H1)
// ---------------------------------------------------------------------------

export interface UncertaintyFields {
  confidence?: unknown;
  uncertainClaims?: unknown;
}

// The claims that hold an item back, or null when it may be published.
// Absent fields (a local model, an older generator) hold nothing back: the
// schema makes the API return them, and the fact-check still runs.
export function uncertaintyOf(o: UncertaintyFields | null | undefined): string[] | null {
  if (!o) return null;
  const claims = (Array.isArray(o.uncertainClaims) ? o.uncertainClaims : [])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean);
  if (claims.length) return claims;
  if (o.confidence === "low") return ["(the writer rated its own confidence low)"];
  return null;
}

export interface HoldbackInput {
  kind: ItemKind | "lesson_intro" | "pbq" | "unit_check";
  objectiveId?: string | null;
  unitId?: string | null;
  trackId?: string | null;
  reason: "uncertain" | "fact_check" | "fact_check_error" | "served_after_retry";
  claims: string[];
  content: unknown;
  model?: string | null;
  // FAIL-882 (migration 069): set when the generation was one learner's own
  // regenerate, so its refusal cools down for that learner only. Absent for
  // a shared generation.
  scopeUserId?: string | null;
}

// Logs content that was not published. Never throws: a failed log must not
// turn a held-back item into a failed request.
export async function recordHoldback(h: HoldbackInput): Promise<void> {
  // eslint-disable-next-line no-console
  console.warn(`[item-quality] held back ${h.kind} (${h.reason}): ${h.claims.slice(0, 3).join("; ") || "-"}`);
  await query(
    // scope_user_id (069) is named only when set, so a shared holdback is
    // logged on a database that has not applied 069 yet.
    `insert into item_holdbacks (item_kind, objective_id, unit_id, track_id, reason, claims, content, model${h.scopeUserId ? ", scope_user_id" : ""})
     values ($1, $2, $3, $4, $5, $6, $7, $8${h.scopeUserId ? ", $9" : ""})`,
    [
      h.kind,
      h.objectiveId ?? null,
      h.unitId ?? null,
      h.trackId ?? null,
      h.reason,
      JSON.stringify(h.claims),
      JSON.stringify(h.content ?? null),
      h.model ?? null,
      ...(h.scopeUserId ? [h.scopeUserId] : []),
    ]
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn(`[item-quality] could not log a holdback: ${(err as Error).message}`);
  });
}

// ---------------------------------------------------------------------------
// Flags and quarantine (H2, H3)
// ---------------------------------------------------------------------------

export async function quarantineThreshold(): Promise<number> {
  const r = await queryOne<{ value: string }>(
    `select value from item_quality_params where name = 'quarantine_flag_threshold'`
  ).catch(() => null);
  const n = r ? Number(r.value) : DEFAULT_QUARANTINE_THRESHOLD;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_QUARANTINE_THRESHOLD;
}

export interface FlagResult {
  // false when this learner had already flagged the item (nothing new)
  recorded: boolean;
  // independent flags on the item now (distinct learners)
  flags: number;
  quarantined: boolean;
}

// Records one flag and pulls the item when the threshold is reached. The
// per-item advisory lock serializes concurrent flags, so the count each one
// reads includes every flag committed before it: five learners flagging at
// once give one quarantine row and a count of five.
export async function recordFlag(
  ref: ItemRef,
  f: { userId: string; source: "learner" | "key_suspect"; reason?: FlagReason | "key_suspect"; note?: string | null; context?: Record<string, unknown> | null }
): Promise<FlagResult> {
  const threshold = await quarantineThreshold();
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext('item_flag:' || $1 || ':' || $2))`, [ref.kind, ref.itemId]);
    const ins = await tx.queryOne<{ id: string }>(
      `insert into item_flags (item_kind, item_id, objective_id, question, user_id, source, reason, note${f.context ? ", context" : ""})
       values ($1, $2, $3, $4, $5, $6, $7, $8${f.context ? ", $9" : ""})
       on conflict do nothing returning id`,
      [
        ref.kind,
        ref.itemId,
        ref.objectiveId,
        ref.question,
        f.userId,
        f.source,
        f.reason ?? (f.source === "key_suspect" ? "key_suspect" : "other"),
        f.note ?? null,
        // Only a sim report carries context (migration 067); every other
        // kind's insert names no new column, so it runs before 067 too.
        ...(f.context ? [JSON.stringify(f.context)] : []),
      ]
    );
    const c = await tx.queryOne<{ n: number }>(
      `select count(distinct user_id)::int as n from item_flags
        where item_kind = $1 and item_id = $2 and user_id is not null and source in ('learner', 'key_suspect')`,
      [ref.kind, ref.itemId]
    );
    const flags = c?.n ?? 0;
    const existing = await tx.queryOne<{ status: string }>(
      `select status from item_status where item_kind = $1 and item_id = $2`,
      [ref.kind, ref.itemId]
    );
    let quarantined = !!existing && existing.status !== "cleared";
    if (existing && existing.status === "cleared") {
      // FAIL-886: a person cleared this item, which used to switch the safety
      // net off for good: later flags only bumped flag_count. The person's
      // decision stands for the flags they weighed, so only learners who
      // flagged AFTER the clear count, and when they reach the threshold the
      // item is pulled again (clearItem / confirmItemWrong can decide again).
      const since = await tx.queryOne<{ n: number }>(
        `select count(distinct f.user_id)::int as n from item_flags f, item_status s
          where f.item_kind = $1 and f.item_id = $2 and s.item_kind = $1 and s.item_id = $2
            and f.user_id is not null and f.source in ('learner', 'key_suspect')
            and f.created_at > coalesce(s.resolved_at, s.quarantined_at)`,
        [ref.kind, ref.itemId]
      );
      const after = since?.n ?? 0;
      if (after >= threshold) {
        await tx.query(
          `update item_status set status = 'quarantined', reason = 'flags', flag_count = $3, resolved_at = null,
                  resolved_note = null, quarantined_at = now()
            where item_kind = $1 and item_id = $2 and status = 'cleared'`,
          [ref.kind, ref.itemId, after]
        );
        quarantined = true;
      } else {
        await tx.query(`update item_status set flag_count = $3 where item_kind = $1 and item_id = $2`, [ref.kind, ref.itemId, flags]);
      }
    } else if (existing) {
      await tx.query(`update item_status set flag_count = $3 where item_kind = $1 and item_id = $2`, [ref.kind, ref.itemId, flags]);
    } else if (flags >= threshold) {
      await tx.query(
        `insert into item_status (item_kind, item_id, objective_id, question, status, reason, flag_count)
         values ($1, $2, $3, $4, 'quarantined', 'flags', $5)
         on conflict (item_kind, item_id) do nothing`,
        [ref.kind, ref.itemId, ref.objectiveId, ref.question, flags]
      );
      quarantined = true;
    }
    return { recorded: !!ins, flags, quarantined };
  });
}

// What the re-check needs to answer an item without its key.
export async function loadCheckItem(ref: ItemRef): Promise<CheckItem | null> {
  const objectiveTitle = ref.objectiveId
    ? (await queryOne<{ title: string }>(`select title from objectives where id = $1`, [ref.objectiveId]))?.title ?? ""
    : "";
  const base = { key: "i1", objectiveTitle, question: ref.question };
  switch (ref.kind) {
    case "lesson": {
      const [objectiveId, stage] = ref.itemId.split(":");
      if (stage !== "fade" && stage !== "solo") return null;
      const col = stage === "fade" ? "fade" : "solo";
      const q = stage === "fade" ? "fade_problem" : "solo_check";
      const row = await queryOne<{ choices: string[]; ci: number }>(
        `select ${col}_choices as choices, ${col}_correct_index as ci from (
           select ${col}_choices, ${col}_correct_index, ${q} from lesson_content where objective_id = $1
           union all
           select ${col}_choices, ${col}_correct_index, ${q} from lesson_content_overrides where objective_id = $1
         ) l where ${q} = $2 limit 1`,
        [objectiveId, ref.question]
      );
      if (!row || !Array.isArray(row.choices)) return null;
      return { ...base, format: "single", options: row.choices, expected: [row.ci] };
    }
    case "review": {
      const row = await queryOne<{ choices: string[]; correct_index: number }>(
        `select choices, correct_index from review_items where id = $1`,
        [ref.itemId]
      );
      return row ? { ...base, format: "single", options: row.choices, expected: [row.correct_index] } : null;
    }
    case "quiz": {
      const row = await queryOne<{ choices: string[]; correct_index: number }>(
        `select choices, correct_index from coach_quiz_items where id = $1`,
        [ref.itemId]
      );
      return row ? { ...base, format: "single", options: row.choices, expected: [row.correct_index] } : null;
    }
    case "comparison": {
      const row = await queryOne<{ scenario: string; answer_position: number; options: string[] }>(
        `select d.scenario, d.answer_position,
                (select jsonb_agg(m.name order by m.position) from concept_set_members m where m.set_id = d.set_id) as options
           from discrimination_items d where d.id = $1`,
        [ref.itemId]
      );
      return row
        ? { ...base, question: `Which concept fits this scenario? ${row.scenario}`, format: "single", options: row.options ?? [], expected: [row.answer_position] }
        : null;
    }
    case "exam": {
      const row = await queryOne<{ item_format: string; stem: string; body: any; answer_key: any }>(
        `select item_format, stem, body, answer_key from exam_items where id = $1`,
        [ref.itemId]
      );
      if (!row) return null;
      return examCheckItem("i1", objectiveTitle, row.item_format, row.stem, row.body, row.answer_key);
    }
    case "lab":
    case "sim":
      // REQ-123: an open-ended lab has no key the choice checker can answer;
      // a flagged lab goes to a person (flagItem skips the re-check). REQ-199:
      // the same for a sim, whose "key" is a whole scored scenario.
      return null;
  }
}

// An exam-bank item in the checker's terms.
export function examCheckItem(
  key: string,
  objectiveTitle: string,
  format: string,
  stem: string,
  body: { choices?: string[]; steps?: string[]; prompts?: string[]; responses?: string[] },
  answerKey: { correct?: number[]; order?: number[]; matches?: number[] }
): CheckItem | null {
  if (format === "multiple_choice" || format === "multiple_response") {
    if (!body.choices || !answerKey.correct) return null;
    return { key, objectiveTitle, question: stem, format: format === "multiple_choice" ? "single" : "multi", options: body.choices, expected: answerKey.correct };
  }
  if (format === "ordering") {
    if (!body.steps) return null;
    const { options, expected } = orderingForCheck(body.steps);
    return { key, objectiveTitle, question: stem, format: "ordering", options, expected };
  }
  if (format === "matching") {
    if (!body.prompts || !body.responses || !answerKey.matches) return null;
    return { key, objectiveTitle, question: stem, format: "matching", prompts: body.prompts, responses: body.responses, expected: answerKey.matches };
  }
  return null;
}

export interface RecheckResult {
  ran: boolean;
  agreed: boolean | null;
  quarantined: boolean;
}

// The one automated re-check of a flagged item: an independent fast-model
// answer without the key (lib/fact-check.ts). Claimed by inserting the
// 'recheck' flag row, so it runs once per item however many flags arrive.
// If the check disagrees with the key or finds an unsupported claim, the
// item is quarantined ("one flag + a failed re-check"). If the call fails the
// claim is released so a later flag can try again.
//
// REQ-202 (audit finding 3): the re-check used to carry no userId, so no
// budget saw it, and a learner could send up to 20 reports an hour
// (480 a day) and start a Sonnet re-check for each. It is now charged to the
// learner whose report started it (their spend gate applies inside the model
// call), and each learner may START at most RECHECK_LIMIT.max a day; past
// that the report is still recorded and the item waits for another reporter
// or a person. `userId` is null only for an operator script.
export const RECHECK_EVENT = "item_recheck";
export const RECHECK_LIMIT = { max: 10, windowMinutes: 24 * 60 };
// REQ-218: a claim whose check never finished (the process died between the
// claim and its result) is taken over after this long. It used to stay for
// good, so the item could never be re-checked again.
export const RECHECK_CLAIM_MINUTES = 15;

export async function recheckItem(ref: ItemRef, checker: FactChecker, userId: string | null): Promise<RecheckResult> {
  if (!factCheckEnabled()) return { ran: false, agreed: null, quarantined: false };
  // A claim that never recorded a result and is older than the expiry belongs
  // to a check that died; drop it so this flag can claim the item. Two flags
  // doing this at once still claim once (item_flags_one_recheck).
  await query(
    `delete from item_flags
      where item_kind = $1 and item_id = $2 and source = 'recheck'
        and recheck_agreed is null and recheck_detail is null
        and created_at < now() - make_interval(mins => $3::int)`,
    [ref.kind, ref.itemId, RECHECK_CLAIM_MINUTES]
  );
  const claim = await queryOne<{ id: string }>(
    `insert into item_flags (item_kind, item_id, objective_id, question, source)
     values ($1, $2, $3, $4, 'recheck') on conflict do nothing returning id`,
    [ref.kind, ref.itemId, ref.objectiveId, ref.question]
  );
  if (!claim) return { ran: false, agreed: null, quarantined: false };
  if (userId) {
    try {
      await consumeRateLimit(RECHECK_EVENT, userId, RECHECK_LIMIT, { userId });
    } catch (err) {
      // Give the claim back: the one re-check is still unspent.
      await query(`delete from item_flags where id = $1`, [claim.id]).catch(() => undefined);
      if (err instanceof RateLimitError) return { ran: false, agreed: null, quarantined: false };
      throw err;
    }
  }
  try {
    const item = await loadCheckItem(ref);
    if (!item) {
      await query(`update item_flags set recheck_detail = '{"error":"item not found"}' where id = $1`, [claim.id]);
      return { ran: false, agreed: null, quarantined: false };
    }
    const ctx = ref.objectiveId ? (await coachContextForObjective(ref.objectiveId)) ?? undefined : undefined;
    const [v] = await checker([item], { ctx, purpose: "item_recheck", userId });
    const agreed = !!v && v.publish;
    await query(`update item_flags set recheck_agreed = $2, recheck_detail = $3 where id = $1`, [
      claim.id,
      agreed,
      JSON.stringify(v ?? null),
    ]);
    if (agreed) return { ran: true, agreed, quarantined: false };
    const flags = await queryOne<{ n: number }>(
      `select count(distinct user_id)::int as n from item_flags
        where item_kind = $1 and item_id = $2 and user_id is not null and source in ('learner', 'key_suspect')`,
      [ref.kind, ref.itemId]
    );
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason, flag_count)
       values ($1, $2, $3, $4, 'quarantined', 'flag_and_recheck', $5)
       on conflict (item_kind, item_id) do nothing`,
      [ref.kind, ref.itemId, ref.objectiveId, ref.question, flags?.n ?? 0]
    );
    return { ran: true, agreed, quarantined: true };
  } catch (err) {
    await query(`delete from item_flags where id = $1`, [claim.id]).catch(() => undefined);
    // eslint-disable-next-line no-console
    console.warn(`[item-quality] re-check of ${ref.kind} ${ref.itemId} failed: ${(err as Error).message}`);
    return { ran: false, agreed: null, quarantined: false };
  }
}

// A flag plus, when it is new and the item is still live, the re-check. The
// re-check is returned as a promise so a route can run it after responding
// (lib/understanding-ai.ts inBackground) and a test can await it.
export async function flagItem(
  ref: ItemRef,
  f: { userId: string; source: "learner" | "key_suspect"; reason?: FlagReason | "key_suspect"; note?: string | null; context?: Record<string, unknown> | null },
  checker?: FactChecker
): Promise<FlagResult & { recheck: Promise<RecheckResult> | null }> {
  const r = await recordFlag(ref, f);
  // REQ-123: labs have no automated re-check (loadCheckItem has nothing to
  // ask); running it would only spend the item's one re-check on an error.
  const recheck = r.recorded && !r.quarantined && !NO_RECHECK.includes(ref.kind) ? recheckItem(ref, checker ?? modelFactChecker, f.userId) : null;
  return { ...r, recheck };
}

// ---------------------------------------------------------------------------
// Resolution (a person decides) and voiding
// ---------------------------------------------------------------------------

// The attempts that were graded against this item.
function attemptsSql(ref: ItemRef): { sql: string; params: unknown[] } {
  switch (ref.kind) {
    case "lesson": {
      const [objectiveId, stage] = ref.itemId.split(":");
      return {
        sql: `kind = 'lesson' and objective_id = $1 and stage = $2 and question = $3`,
        params: [objectiveId, stage, ref.question],
      };
    }
    case "review":
      return {
        sql: `id in (select attempt_id from review_session_items where review_item_id = $1::uuid and attempt_id is not null)`,
        params: [ref.itemId],
      };
    case "exam":
      return {
        sql: `id in (select attempt_id from exam_session_items where item_id = $1::uuid and attempt_id is not null)`,
        params: [ref.itemId],
      };
    case "quiz":
      return {
        sql: `assessment_type = 'coach_quiz' and objective_id = $1 and question = $2`,
        params: [ref.objectiveId, ref.question],
      };
    case "comparison":
      // Scoped to the card's objective: two cards can share scenario text.
      return { sql: `assessment_type = 'discrimination' and ($1::uuid is null or objective_id = $1::uuid) and question = $2`, params: [ref.objectiveId, ref.question] };
    case "lab":
      // REQ-123: every finished run of the lab (attempts.lab_id, migration 050).
      return { sql: `lab_id = $1::uuid`, params: [ref.itemId] };
    case "sim":
      // REQ-199: every scored run of that sim version (sim_runs.attempt_id).
      return { sql: `id in (select attempt_id from sim_runs where sim_version_id = $1::uuid and attempt_id is not null)`, params: [ref.itemId] };
  }
}

// A person confirmed the item's key is wrong. The item stays out of rotation,
// every answer graded against it is voided (kept, with the reason, but no
// longer counted by mastery_detail()), and each affected learner's mastery on
// the objective is recomputed. Returns how many attempts were voided.
export async function confirmItemWrong(ref: ItemRef, note: string): Promise<number> {
  return withTransaction(async (tx) => {
    const voided = await confirmWrongIn(tx, ref, note);
    // FAIL-885: a lesson check can be copied into the exam bank
    // (exam_items source 'lesson', lib/exam-items.ts copyAnsweredLessonChecks).
    // The copy has the same wrong key. It is pulled too and the answers given
    // to it in mocks and sprints are voided; before, the wrong key came back
    // in the next mock exam.
    if (ref.kind === "lesson" && ref.objectiveId) {
      const copies = await tx.query<{ id: string }>(
        `select id from exam_items where source = 'lesson' and objective_id = $1 and stem = $2`,
        [ref.objectiveId, ref.question]
      );
      for (const c of copies) {
        voided.push(...(await confirmWrongIn(tx, { kind: "exam", itemId: c.id, objectiveId: ref.objectiveId, question: ref.question }, note)));
      }
    }
    const pairs = new Set(voided.filter((v) => v.user_id && v.objective_id).map((v) => `${v.user_id}|${v.objective_id}`));
    for (const p of pairs) {
      const [u, o] = p.split("|");
      await tx.query(`select recompute_mastery_pair($1, $2)`, [u, o]);
    }
    return voided.length;
  });
}

// Pulls one item as confirmed wrong and voids its attempts; the caller
// recomputes mastery for the pairs returned.
async function confirmWrongIn(tx: TxClient, ref: ItemRef, note: string): Promise<{ id: string; user_id: string; objective_id: string | null }[]> {
  // REQ-218 (M2): an exam submit holds this row FOR SHARE while it decides
  // which answers become attempts (lib/exam-sessions.ts submitSession). Taking
  // the conflicting lock first means a confirm either waits for the submit and
  // then voids what it recorded, or goes first and the submit sees the item
  // pulled and records nothing. NO KEY UPDATE: starting a session (a foreign
  // key share lock on the row) is not blocked.
  if (ref.kind === "exam") await tx.query(`select 1 from exam_items where id = $1::uuid for no key update`, [ref.itemId]);
  await tx.query(
    `insert into item_status (item_kind, item_id, objective_id, question, status, reason, resolved_at, resolved_note)
     values ($1, $2, $3, $4, 'confirmed_wrong', 'review', now(), $5)
     on conflict (item_kind, item_id) do update
       set status = 'confirmed_wrong', resolved_at = now(), resolved_note = excluded.resolved_note`,
    [ref.kind, ref.itemId, ref.objectiveId, ref.question, note]
  );
  const { sql, params } = attemptsSql(ref);
  const voided = await tx.query<{ id: string; user_id: string; objective_id: string | null }>(
    `update attempts set voided_at = now(), void_reason = $${params.length + 1}
      where voided_at is null and (${sql})
      returning id, user_id, objective_id`,
    [...params, `item ${ref.kind}:${ref.itemId} confirmed wrong: ${note}`.slice(0, 500)]
  );
  // REQ-218 (M4): what the wrong key taught the learner's other surfaces goes
  // with the answer: the error-log entries a miss opened stop being asked
  // back, and the "misconception" the grader read from a miss is deleted
  // (the answer was marked down by a wrong key, so the diagnosis is not true).
  if (voided.length) {
    const ids = voided.map((v) => v.id);
    await tx.query(`update error_log set resolved = true where attempt_id = any($1::uuid[]) and not resolved`, [ids]);
    await tx.query(`delete from learner_misconceptions where attempt_id = any($1::uuid[])`, [ids]);
  }
  await tx.query(`update item_status set voided_attempts = voided_attempts + $3 where item_kind = $1 and item_id = $2`, [
    ref.kind,
    ref.itemId,
    voided.length,
  ]);
  return voided;
}

// A person checked a quarantined item and it is fine: served again.
export async function clearItem(ref: Pick<ItemRef, "kind" | "itemId">, note: string): Promise<boolean> {
  const r = await queryOne<{ item_id: string }>(
    `update item_status set status = 'cleared', resolved_at = now(), resolved_note = $3
      where item_kind = $1 and item_id = $2 and status = 'quarantined' returning item_id`,
    [ref.kind, ref.itemId, note]
  );
  return !!r;
}

// REQ-196: a person checked a STAGED finding (re-check or sandbox job; never
// pulled) and the item is fine. Recorded as 'cleared' so the jobs skip it
// from now on; serving is unchanged (a cleared item is served).
export async function clearStaged(ref: ItemRef, note: string): Promise<void> {
  await query(
    `insert into item_status (item_kind, item_id, objective_id, question, status, reason, resolved_at, resolved_note)
     values ($1, $2, $3, $4, 'cleared', 'staged_review', now(), $5)
     on conflict (item_kind, item_id) do nothing`,
    [ref.kind, ref.itemId, ref.objectiveId, ref.question, note]
  );
}

export async function itemStatus(kind: ItemKind, itemId: string): Promise<string | null> {
  const r = await queryOne<{ status: string }>(`select status from item_status where item_kind = $1 and item_id = $2`, [kind, itemId]);
  return r?.status ?? null;
}

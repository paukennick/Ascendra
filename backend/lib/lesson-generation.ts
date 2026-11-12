import { randomUUID } from "node:crypto";
import { queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { presentationOrder, presentationSeed, shuffleForPresentation } from "@/lib/choice-order";
import { callClaudeStructured, getModel, type CallOptions } from "@/lib/anthropic";
import { AiResponseError } from "@/lib/ai-calls";
import { fixFor, generateValid, lessonIntroProblems, lessonPracticeHardProblems, lessonPracticeLint, shufflePractice } from "@/lib/content-validator";
import { coachContextForObjective, type CoachContext } from "@/lib/coach-context";
import {
  lessonIntroPrompt,
  lessonPracticePrompt,
  lessonIntroSchema,
  lessonPracticeSchema,
  introFromModel,
  parseTeachCards,
  type LessonAvoid,
  type LessonIntroContent,
  type LessonPracticeContent,
} from "@/lib/prompts";
import {
  clearLessonProgress,
  getLessonFor,
  getOverrideLesson,
  getServableSharedLesson,
  isClaimLive,
  releaseClaim,
  renewClaim,
  CLAIM_LEASE_SECONDS,
  saveLesson,
  scopeKey,
  SHARED,
  tryClaim,
  type LessonRow,
  type LessonScope,
} from "@/lib/lesson-store";
import { factCheckGate, modelFactChecker, verdictClaims, verdictHolds, verdictUnchecked, type CheckItem, type FactChecker } from "@/lib/fact-check";
import { lessonItemId, lowConfidenceOf, noteListedClaims, recordHoldback, type ItemRef } from "@/lib/item-quality";
import { FactCheckUnavailableError, reasonPhrase, type HoldReason } from "@/lib/generation-gate";
import { AUTHORED_LESSON_MODEL, authoredLesson, authoredRefFor, type AuthoredRef } from "@/lib/authored-lessons";
import { snippetProblems, wantsVerification, type VerifySnippet } from "@/lib/verify-execution";
import { queueExecCheck } from "@/lib/exec-checks";
import { recordHintReveal } from "@/lib/grading-service";
import { isActive } from "@/lib/progress-sql";

export type { LessonRow, LessonScope } from "@/lib/lesson-store";

// Shared by both the lesson route (app/api/objectives/[id]/lesson/route.ts)
// and the prefetch route (.../lesson/prefetch-next/route.ts) -- extracted
// here rather than duplicated so both import the *same* `pendingGeneration`
// map instance below. Two separate copies of that map (one per route file)
// would silently defeat the in-flight de-dup: a prefetch started here and a
// GET landing moments later for the same objective would each think nothing
// was in flight and generate independently.

export interface ObjectiveRow {
  title: string;
  unit_title: string;
  track_title: string;
  // REQ-076: taxonomy/credential framing for the prompts. Null only for an
  // objective whose track has no taxonomy row at all (user-created tracks).
  ctx: CoachContext | null;
  // REQ-195 (was REQ-187 R1's degree-advising context): set for an objective
  // with an authored lesson (lib/authored-lessons.ts); never generated.
  authored?: AuthoredRef | null;
  // REQ-195: the objective (or its unit) is retired. Nothing is generated
  // for it; the lesson route answers 404 before getting here.
  retired?: boolean;
}

// REQ-134: what the app is sent for a lesson. Grading is server-side, so the
// answer keys (*_correct_index) and the explanations of the right answer
// (*_why) never leave the server before the learner answers; /api/grade
// returns them with the verdict. Guided choices come in this learner's fixed
// shuffled order (lib/choice-order.ts). Solo choices are not sent (the field
// is an empty list): they are a hint, fetched from
// POST /api/objectives/:id/hint, which records that the hint was used. App
// builds without the hint flow are served by lessonForClient (REQ-146).
export function rowToLesson(row: LessonRow, viewer: { userId: string; objectiveId: string }) {
  const fadeChoices = Array.isArray(row.fade_choices) && row.fade_problem
    ? shuffleForPresentation(
        row.fade_choices,
        presentationOrder(
          presentationSeed(viewer.userId, viewer.objectiveId, "fade", row.fade_problem),
          row.fade_choices.length
        )
      )
    : row.fade_choices;
  return {
    guessPrompt: row.guess_prompt,
    teach: row.teach,
    // REQ-106: absent for lessons cached before teach cards; the app then
    // shows `teach` as one block, as before. The self-explanation's model
    // answer is sent with it: it is not graded and not mastery evidence, and
    // the app shows it only after the learner answers or skips.
    ...teachCardsField(row.teach_cards),
    fadeProblem: row.fade_problem,
    fadeChoices,
    soloCheck: row.solo_check,
    // Always empty: the real choices come from the hint route. App builds
    // from before REQ-134 do `lesson.soloChoices!.map(...)` when the learner
    // opens the hint, and crashed on a missing field; an empty list leaves
    // them with free response only (FAIL-039).
    soloChoices: [] as string[],
    model: row.model,
    generatedAt: row.generated_at,
  };
}

// REQ-146 (FAIL-530): the lesson payload for the app that asked. App builds
// from before the release (no X-Ascendra-Client header, lib/client-protocol.ts)
// have no hint flow: their Solo step defaults to multiple choice and rendered
// the empty soloChoices as no options at all, so the learner was stuck. Such
// a caller gets the Solo choices in the lesson, in this learner's fixed
// shuffled order (the order the hint route returns and /api/grade maps a
// chosenIndex back through), and the hint reveal is recorded first, exactly
// as POST /api/objectives/:id/hint does. It is recorded when the choices are
// sent, not when an answer arrives, because sending them is what lets the
// learner see them: a later Solo answer to this item in any format is graded
// as assisted and can't lift mastery above Guided. A hint-aware app (the
// header present) gets rowToLesson unchanged and nothing is recorded.
// `viewer.objectiveId` must be the canonical id (visibleObjective's).
export async function lessonForClient(
  row: LessonRow,
  viewer: { userId: string; objectiveId: string },
  hintAware: boolean
) {
  const lesson = rowToLesson(row, viewer);
  if (hintAware) return lesson;
  const question = row.solo_check;
  const choices = row.solo_choices;
  // Same readiness test as lessonCheckFor: the practice half must be there
  // (it is whenever rowToLesson is used, but a malformed row sends nothing).
  if (!question || !Array.isArray(choices) || !Number.isInteger(row.solo_correct_index)) return lesson;
  await recordHintReveal(viewer.userId, viewer.objectiveId, "solo", question);
  const order = presentationOrder(presentationSeed(viewer.userId, viewer.objectiveId, "solo", question), choices.length);
  return { ...lesson, soloChoices: shuffleForPresentation(choices as string[], order) };
}

export function teachCardsField(v: unknown) {
  const teachCards = parseTeachCards(v);
  return teachCards ? { teachCards } : {};
}

// The guess+teach half handed back before the practice half exists.
export function introToLesson(intro: LessonIntroContent) {
  return {
    guessPrompt: intro.guessPrompt,
    teach: intro.teach,
    ...(intro.teachCards ? { teachCards: intro.teachCards } : {}),
  };
}

export function rowToAvoid(row: LessonRow): LessonAvoid {
  return { teach: row.teach, fadeProblem: row.fade_problem, soloCheck: row.solo_check };
}

export async function loadObjective(objectiveId: string): Promise<ObjectiveRow | null> {
  const [row, ctx, authored] = await Promise.all([
    queryOne<Omit<ObjectiveRow, "ctx" | "authored">>(
      `select o.title, cu.title as unit_title, st.title as track_title,
              not (${isActive("o")} and ${isActive("cu")}) as retired
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       where o.id = $1`,
      [objectiveId]
    ),
    coachContextForObjective(objectiveId),
    authoredRefFor(objectiveId).catch(() => null),
  ]);
  return row ? { ...row, ctx, authored } : null;
}


// What a generation produces. Injected so the storage, claim and selection
// rules can be tested without the model (lib/lesson-regen.dbtest.ts).
export interface LessonGenerator {
  intro(objRow: ObjectiveRow, avoid?: LessonAvoid, meta?: GenerateMeta): Promise<LessonIntroContent>;
  practice(objRow: ObjectiveRow, avoid?: LessonAvoid, meta?: GenerateMeta): Promise<LessonPracticeContent>;
  model(): string;
  // REQ-114: the second-model fact-check of a lesson's two checks (shared,
  // and since REQ-187 a learner's regenerate too). Production sets it; a
  // test generator without one skips the gate (the writer's own
  // uncertainClaims are still honoured).
  factCheck?: FactChecker;
  // REQ-196: records a served check's verification program as
  // exec_unverified for the sandbox job (lib/exec-checks.ts). Nothing is
  // executed in the request path. Production sets it; if it throws, the
  // practice half is held back (fail closed). A test generator without one
  // stores nothing.
  queueExec?: (ref: ItemRef, snippet: VerifySnippet) => Promise<void>;
}

// Who a generation is charged to, for ai_calls and the spend gate (REQ-202).
// A regenerate is the learner's own. The first (shared) generation serves
// everyone, but it is charged to the learner whose request started it
// (GenerationOptions.triggeredBy): it used to carry no userId, so no budget
// ever saw it and one account could walk the catalog's first generations for
// free (audit finding 3).
export interface GenerateMeta {
  // Who the model calls are charged to (REQ-202): the learner whose regenerate
  // this is, or whoever started a shared generation.
  userId?: string;
  // FAIL-967: set for a shared (first) generation. A holdback's scope is the
  // scope of the generation, not the learner it was charged to, or the shared
  // cooldown (scope_user_id null, FAIL-882) would never see it.
  sharedScope?: boolean;
  // REQ-114: set on the one retry of a practice half that was held back --
  // the claims to leave out or state as uncertain.
  steer?: string;
  // REQ-139 (line B's REQ-089 rule): the teaching text the learner has just
  // read, so the practice half tests it and does not contradict it. Set on
  // every practice call of a generation, its held-back retry included.
  teach?: string;
  // REQ-187 (P8): set on the one retry of teaching text that was held back.
  introSteer?: string;
}

// Lessons: Sonnet. The teaching text (intro): effort "medium", thinking off.
// See lib/anthropic.ts (modelParams) for why thinking was turned off --
// adaptive thinking ate the max_tokens budget on a verbose real objective (no
// text block at all, stop_reason max_tokens, blocks=[thinking]; FAIL-008).
//
// REQ-251 (Nick, 2026-11-12: "Let the model think"): the practice half
// thinks, bounded. Its options must meet exact length and cue-word rules
// (lib/item-style.ts), and with thinking off the model cannot check an option
// set before writing it: the 2026-11-12 trial had style findings on 22 of 25
// first drafts. The 5.5 models take no thinking-only budget (budget_tokens is
// a 400), so the bound is the two levers the API has (lib/anthropic.ts):
//  - effort "low" ("Claude minimizes thinking"), a soft limit; and
//  - max_tokens = PRACTICE_OUTPUT_TOKENS + PRACTICE_THINKING_BUDGET_TOKENS,
//    the hard cap: the answer keeps its whole 6,000 (a practice answer is
//    about 4,800 output tokens today) however much of the allowance thinking
//    uses, so FAIL-008's shared, answer-sized ceiling cannot recur.
// If thinking still runs past its allowance and the reply stops on
// max_tokens, the live writer asks once more with thinking off
// (PRACTICE_NO_THINKING_CALL, the configuration that ran before REQ-251), so
// a learner never gets FAIL-008 back as a failed lesson.
// The teaching text stays thinking off: it has no length or cue-word rules
// to check, and its first drafts were not the problem the trial found.
//
// One definition for every practice writer: the app's generator, its
// steered retry (generateValid's second attempt), pre-generation's batch
// request (lib/pregen.ts practiceParams) and its live retry
// (liveRetryWriter), and the live eval -- the parity DB test
// (lib/pregen.dbtest.ts) pins that batch and live send the same.

// The answer's own room: the most a practice reply's JSON may take.
export const PRACTICE_OUTPUT_TOKENS = 6000;
// Thinking allowance for one practice call, added to max_tokens on top of
// PRACTICE_OUTPUT_TOKENS (never taken out of it). 4,000 is the app's general
// thinking headroom (THINKING_HEADROOM_TOKENS) and, at effort "low", well over
// what checking a few option sets needs; it is also the planning figure for
// cost (lib/pregen.ts prices every request at its full max_tokens). Raising it
// raises every practice call's cost ceiling: $0.01 per 1,000 tokens live on
// Sonnet 5.5, half that in a batch.
export const PRACTICE_THINKING_BUDGET_TOKENS = 4000;

export const PRACTICE_CALL = {
  maxTokens: PRACTICE_OUTPUT_TOKENS,
  thinkingBudgetTokens: PRACTICE_THINKING_BUDGET_TOKENS,
  effort: "low",
  thinking: "default",
} as const satisfies Pick<CallOptions, "maxTokens" | "thinkingBudgetTokens" | "effort" | "thinking">;

// The fallback when a thinking practice call stopped on max_tokens: the
// pre-REQ-251 configuration, which never thinks.
export const PRACTICE_NO_THINKING_CALL = {
  maxTokens: PRACTICE_OUTPUT_TOKENS,
  effort: "medium",
  thinking: "off",
} as const satisfies Pick<CallOptions, "maxTokens" | "effort" | "thinking">;

// A structured call whose reply ran out of max_tokens (no text, or JSON cut
// off): lib/anthropic.ts callClaudeStructured puts the stop reason in the
// message of both errors.
export function stoppedAtMaxTokens(err: unknown): boolean {
  return err instanceof AiResponseError && /stop_reason=max_tokens\b/.test(err.message);
}

// One practice draft: with bounded thinking, then -- only if that reply ran
// out of max_tokens -- once more without thinking. Both calls go through the
// spend gate on their own (each reserves its own max_tokens).
export async function writePracticeDraft<T>(call: (cfg: typeof PRACTICE_CALL | typeof PRACTICE_NO_THINKING_CALL) => Promise<T>): Promise<T> {
  try {
    return await call(PRACTICE_CALL);
  } catch (err) {
    if (!stoppedAtMaxTokens(err)) throw err;
    console.warn("[lesson-generation] practice draft stopped at max_tokens with thinking on; writing it again with thinking off");
    return call(PRACTICE_NO_THINKING_CALL);
  }
}
// REQ-187: a retry after failed content checks is told what failed (the
// distractor lint, lib/content-validator.ts), and the stored answer position
// of both checks is shuffled.
export const claudeGenerator: LessonGenerator = {
  async intro(objRow, avoid, meta) {
    // REQ-106: the model writes the cards; the flat teach text is derived.
    // Audit 3 M2: checked before it can be stored; regenerated once, then a
    // clean 503 (lib/content-validator.ts).
    return generateValid("lesson", async (_attempt, previous) => {
      const steer = [meta?.introSteer, fixFor(previous)].filter(Boolean).join("\n\n") || undefined;
      const { system, user } = lessonIntroPrompt({
        trackTitle: objRow.track_title,
        unitTitle: objRow.unit_title,
        objectiveTitle: objRow.title,
        avoid,
        ctx: objRow.ctx ?? undefined,
        steer,
      });
      return introFromModel(await callClaudeStructured({
        system,
        messages: [{ role: "user", content: user }],
        schema: lessonIntroSchema,
        maxTokens: 4000,
        model: getModel(),
        effort: "medium",
        thinking: "off",
        purpose: "lesson_intro",
        userId: meta?.userId ?? null,
      }));
    }, lessonIntroProblems);
  },
  async practice(objRow, avoid, meta) {
    const made = await generateValid("lesson", (_attempt, previous) => {
      const steer = [meta?.steer, fixFor(previous)].filter(Boolean).join("\n\n") || undefined;
      const { system, user } = lessonPracticePrompt({
        trackTitle: objRow.track_title,
        unitTitle: objRow.unit_title,
        objectiveTitle: objRow.title,
        teach: meta?.teach,
        avoid,
        ctx: objRow.ctx ?? undefined,
        steer,
        verify: wantsVerification(objRow.ctx),
      });
      return writePracticeDraft((cfg) =>
        callClaudeStructured({
          system,
          messages: [{ role: "user", content: user }],
          schema: lessonPracticeSchema,
          ...cfg,
          model: getModel(),
          purpose: "lesson_practice",
          userId: meta?.userId ?? null,
        })
      );
    }, lessonPracticeHardProblems, undefined, lessonPracticeLint);
    return shufflePractice(made);
  },
  model: getModel,
  factCheck: modelFactChecker,
  queueExec: queueExecCheck,
};

// REQ-195 (was REQ-187 R1's advising generator): an authored lesson
// (lib/authored-lessons.ts). No model call, nothing to fact-check.
export function authoredGenerator(ref: AuthoredRef): LessonGenerator {
  const lesson = () => {
    const l = authoredLesson(ref);
    if (!l) throw new Error(`no authored lesson for ${ref.trackCode} "${ref.objectiveTitle}"`);
    return l;
  };
  return {
    async intro() {
      const l = lesson();
      return { guessPrompt: l.guessPrompt, teach: l.teach, teachCards: l.teachCards ?? null };
    },
    async practice() {
      const { guessPrompt: _g, teach: _t, teachCards: _c, ...practice } = lesson();
      return practice;
    },
    model: () => AUTHORED_LESSON_MODEL,
  };
}

// REQ-187 (R3/P1): what a learner is told when a lesson's content failed the
// accuracy checks twice. Nothing is stored or served; the item is in
// item_holdbacks for a person. The practice for the objective is still
// there in the lab and in review. REQ-216: the words name the reason when it
// is known (heldBackMessage); this is the form for a cooldown, where the
// refusal was a moment ago and its reason is in the log.
export const HELD_BACK_MESSAGE =
  "This lesson didn't pass our accuracy checks, so we're not showing it yet. It has been held for review. " +
  "In the meantime, try this objective's lab or your review questions, and check back in a few minutes.";

export function heldBackMessage(reasons: Iterable<HoldReason>): string {
  const set = new Set(reasons);
  if (!set.size) return HELD_BACK_MESSAGE;
  return (
    `This lesson didn't pass our accuracy checks (${reasonPhrase(set)}), so we're not showing it yet. It has been held for review. ` +
    "In the meantime, try this objective's lab or your review questions, and check back in a few minutes."
  );
}

// REQ-195: asked to generate a lesson for a retired objective.
export class RetiredObjectiveError extends Error {
  constructor() {
    super("This objective has been retired and is no longer taught.");
    this.name = "RetiredObjectiveError";
  }
}

// FAIL-884: a 409, not a 503. The app shows a 5xx as "something went wrong on
// our side" (mobile/src/lib/errorMessage.ts), so the held-back guidance above
// never reached a learner. `held` says the lesson was refused by the accuracy
// checks (a person will look; trying again now will not help), `retryable`
// that waiting a moment will not change the answer.
export class ContentHeldBackError extends UserFacingError {
  constructor(reasons: Iterable<HoldReason> = []) {
    super(heldBackMessage(reasons), 409, { held: true, retryable: false });
    this.name = "ContentHeldBackError";
  }
}

// FAIL-883: the lesson's verification program could not be queued (a database
// blip). Nothing was wrong with the content, so nothing is recorded as held
// back and no cooldown starts: the next request tries again.
export const EXEC_QUEUE_UNAVAILABLE =
  "We couldn't finish preparing this lesson just now. Please try again in a moment.";
export class ExecQueueUnavailableError extends UserFacingError {
  constructor() {
    // REQ-216 (H3): a 409, not a 503 -- the app hides a 5xx's words.
    super(EXEC_QUEUE_UNAVAILABLE, 409, { retryable: true });
    this.name = "ExecQueueUnavailableError";
  }
}

// The first claim of a holdback that was NOT served (after its one retry).
// The reason column's check constraint (migration 042) has no value for it,
// and no migration is wanted, so it is marked in the claims instead.
export const NOT_SERVED_MARK = "[not served: failed again after one retry]";

// After a lesson is held back twice, a new attempt waits this long, so a
// learner reopening the objective does not spend another four model calls
// on content the checks just refused. REQ-216 (M5): ten minutes, down from six
// hours. Only a verdict on the content starts it (never our own failure,
// FAIL-883), and with the gate narrowed to low confidence or a disagreeing
// check (H2) a refusal is rare enough that a long lockout cost more than the
// calls it saved.
export const HELD_BACK_COOLDOWN_MINUTES = 10;

// FAIL-882: the cooldown is per scope. It used to filter by objective only, so
// one learner's failed regenerate locked the objective for every learner for
// six hours. A learner's regenerate is held back by that learner's own
// holdbacks; a shared (first) generation by shared holdbacks only
// (item_holdbacks.scope_user_id null, migration 069; rows from before it are
// all null and so count as shared).
export async function recentlyHeldBack(objectiveId: string, scope: LessonScope = SHARED): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `select count(*)::int as n from item_holdbacks
      where objective_id = $1 and item_kind in ('lesson', 'lesson_intro')
        and claims ? $2 and created_at > now() - make_interval(mins => $3)
        and scope_user_id is not distinct from $4::uuid`,
    [objectiveId, NOT_SERVED_MARK, HELD_BACK_COOLDOWN_MINUTES, scope.kind === "user" ? scope.userId : null]
  ).catch(() => null);
  return (r?.n ?? 0) > 0;
}

// REQ-187 (P8): teaching text is held back on the writer's own doubt the same
// way the checks are. A first draft that lists uncertain claims (or rates
// its confidence low) is logged and regenerated once, steered away from
// them; if the retry is unsure too, the lesson is not shown.
function holdbackScopeUserId(meta: GenerateMeta, shared = false): string | undefined {
  return shared || meta.sharedScope ? undefined : meta.userId;
}

export async function checkedIntro(
  objectiveId: string,
  objRow: ObjectiveRow,
  opts: { gen: LessonGenerator; avoid?: LessonAvoid; meta: GenerateMeta }
): Promise<LessonIntroContent> {
  const first = await opts.gen.intro(objRow, opts.avoid, opts.meta);
  // REQ-216 (H2): only the writer's LOW confidence holds the teaching text
  // back; claims it merely lists are logged (3 of 9 intros in production were
  // held for disclaimers).
  const unsure = lowConfidenceOf(first);
  if (!unsure) {
    noteListedClaims(`lesson_intro (${objectiveId})`, first);
    return first;
  }
  await recordHoldback({ kind: "lesson_intro", objectiveId, reason: "uncertain", claims: unsure, content: first, model: opts.gen.model(), scopeUserId: holdbackScopeUserId(opts.meta) });
  const introSteer = `A previous draft of this teaching text was held back because the writer was not sure of these claims. Leave each out, or state plainly that it may differ for this version:\n${unsure.map((c) => `- ${c}`).join("\n")}`;
  const retry = await opts.gen.intro(objRow, opts.avoid, { ...opts.meta, introSteer });
  const again = lowConfidenceOf(retry);
  if (!again) {
    noteListedClaims(`lesson_intro (${objectiveId})`, retry);
    return retry;
  }
  await recordHoldback({ kind: "lesson_intro", objectiveId, reason: "uncertain", claims: [NOT_SERVED_MARK, ...again], content: retry, model: opts.gen.model(), scopeUserId: holdbackScopeUserId(opts.meta) });
  throw new ContentHeldBackError(["uncertain"]);
}

// REQ-114 (Audit 3 H1 + recommendation 1), changed by REQ-187 (audit
// 2026-11-09 R3/P1, R4/P3). A lesson's two checks are items with answer
// keys. A held-back practice half is regenerated ONCE, steered away from the
// claims that held it back. If the retry is held back too it is NOT served:
// it is logged (marked NOT_SERVED_MARK) and the generation fails with
// ContentHeldBackError, so no learner is ever graded against a key the
// checker disputed. (Before REQ-187 it was kept and served, 'served_after_
// retry'.) The fact-check now runs for a learner's own regenerate too, as
// well as the shared lesson. REQ-196: when the writer included a
// soloVerification program, nothing runs here. A practice half that passed
// the fact-check is served and its program is queued (exec_unverified) for
// the sandbox job; if it cannot be queued, the half is held back like a
// failed check, so nothing is served that would never be verified.
export async function checkedPractice(
  objectiveId: string,
  objRow: ObjectiveRow,
  first: LessonPracticeContent,
  opts: { shared: boolean; gen: LessonGenerator; avoid?: LessonAvoid; meta: GenerateMeta }
): Promise<LessonPracticeContent> {
  const problems = async (p: LessonPracticeContent): Promise<{ reason: "uncertain" | "fact_check"; claims: string[] } | null> => {
    // REQ-216 (H2): the writer's LOW confidence, or a fact-check whose
    // independent answer differs from a key, holds the half back. Listed
    // claims, and claims the checker could not confirm while agreeing with the
    // key, are logged. A fact-check that could not run is not a verdict on the
    // content: it is a retryable refusal, logged as no holdback and starting no
    // cooldown (FAIL-883's rule, applied to the checker).
    const unsure = lowConfidenceOf(p);
    if (unsure) return { reason: "uncertain", claims: unsure };
    noteListedClaims(`lesson (${objectiveId})`, p);
    if (!opts.gen.factCheck) return null;
    const items: CheckItem[] = [
      { key: "fade", objectiveTitle: objRow.title, question: p.fadeProblem, format: "single", options: p.fadeChoices, expected: [p.fadeCorrectIndex] },
      { key: "solo", objectiveTitle: objRow.title, question: p.soloCheck, format: "single", options: p.soloChoices, expected: [p.soloCorrectIndex] },
    ];
    const gate = await factCheckGate(items, { ctx: objRow.ctx ?? undefined, userId: opts.meta.userId }, opts.gen.factCheck);
    const verdicts = items.map((i) => gate.verdicts.get(i.key));
    if (gate.error || verdicts.some((v) => verdictUnchecked(v))) {
      // eslint-disable-next-line no-console
      console.warn(`[lesson-generation] fact-check did not run for ${objectiveId}: ${gate.error ?? "no result"}`);
      throw new FactCheckUnavailableError("lesson");
    }
    const failed = verdicts.filter((v) => verdictHolds(v));
    for (const v of verdicts) {
      if (!verdictHolds(v) && v?.unsupportedClaims.length) {
        // eslint-disable-next-line no-console
        console.warn(`[item-quality] lesson (${objectiveId}) ${v.key} agreed with the key; checker could not confirm: ${v.unsupportedClaims.join(" | ").slice(0, 500)}`);
      }
    }
    if (!failed.length) return null;
    return { reason: "fact_check", claims: failed.flatMap((v) => verdictClaims(v).map((c) => (v?.unsupportedClaims.length ? c : `${v?.key}: ${c}`))) };
  };
  // REQ-196: queue the solo check's program for the sandbox job. A
  // malformed program is not queued (there is nothing to run) and does not
  // hold the half back; the fact-check already passed it.
  const queued = async (p: LessonPracticeContent): Promise<LessonPracticeContent> => {
    const snip = p.soloVerification;
    if (!snip || !opts.gen.queueExec || snippetProblems(snip)) return p;
    const ref: ItemRef = { kind: "lesson", itemId: lessonItemId(objectiveId, "solo", p.soloCheck), objectiveId, question: p.soloCheck };
    try {
      await opts.gen.queueExec(ref, snip);
    } catch (err) {
      // FAIL-883: this is our failure, not the content's. It used to be
      // recorded as a holdback marked NOT_SERVED_MARK, which started the six
      // hour cooldown for the objective. Now it is logged and refused as
      // retryable, and the next request tries again.
      // eslint-disable-next-line no-console
      console.warn(`[lesson-generation] ${EXEC_QUEUE_FAILED}: ${(err as Error)?.message ?? "error"}`);
      throw new ExecQueueUnavailableError();
    }
    return p;
  };
  const firstProblem = await problems(first);
  if (!firstProblem) return queued(first);
  await recordHoldback({ kind: "lesson", objectiveId, reason: firstProblem.reason, claims: firstProblem.claims, content: first, model: opts.gen.model(), scopeUserId: holdbackScopeUserId(opts.meta, opts.shared) });
  const steer = `A previous draft was held back because of these claims. Leave each out, or state plainly that it may differ for this exam version, and make sure each check has exactly one defensible answer:\n${firstProblem.claims.map((c) => `- ${c}`).join("\n")}`;
  const retry = await opts.gen.practice(objRow, opts.avoid, { ...opts.meta, steer });
  const retryProblem = await problems(retry);
  if (retryProblem) {
    await recordHoldback({ kind: "lesson", objectiveId, reason: retryProblem.reason, claims: [NOT_SERVED_MARK, ...retryProblem.claims], content: retry, model: opts.gen.model(), scopeUserId: holdbackScopeUserId(opts.meta, opts.shared) });
    throw new ContentHeldBackError([firstProblem, retryProblem].map((p): HoldReason => (p.reason === "fact_check" ? "disagree" : "uncertain")));
  }
  return queued(retry);
}

// REQ-196: the claim logged when a verification program could not be queued.
export const EXEC_QUEUE_FAILED = "verification program could not be queued for the sandbox";

export interface GenerationHandle {
  // The guess+teach half as soon as it exists. null when ANOTHER server
  // instance holds the generation lease (or finished it first): this caller
  // has no intro of its own to show, so wait on `fullPromise` instead.
  introPromise: Promise<LessonIntroContent | null>;
  // The lesson as stored once generation is complete -- ours, or the other
  // instance's if we lost the lease. Never a mix of the two.
  fullPromise: Promise<LessonRow>;
}

export interface GenerationOptions {
  scope: LessonScope;
  // REQ-202: the learner whose request starts a SHARED generation (the lesson
  // GET or prefetch-next). Their spend gate applies to its model calls. A
  // second learner who joins a generation already in flight is not charged.
  triggeredBy?: string;
  avoid?: LessonAvoid;
  // Test seams; production uses the defaults.
  keptIntros?: typeof keptIntros;
  generator?: LessonGenerator;
  pending?: Map<string, GenerationHandle>;
  waitMs?: number;
  pollMs?: number;
  heartbeatMs?: number;
}

// Lease renewal interval: a quarter of the lease, so two missed beats in a
// row still leave the lease live.
const HEARTBEAT_MS = (CLAIM_LEASE_SECONDS * 1000) / 4;

const DEFAULT_WAIT_MS = 90_000;
const DEFAULT_POLL_MS = 1_000;

// A full generation (intro, then practice from its teaching text, then save) already in flight IN THIS
// PROCESS, keyed by objective and scope (shared first generation, or one
// learner's regenerate) so ANY second caller -- a real GET/POST, a second
// prefetch call, a double-tapped regenerate -- awaits the same generation
// instead of starting a redundant, and possibly inconsistent, second one.
// Claimed synchronously in `ensureGeneration` below, before any await, so
// this covers the intro phase too, not just the practice phase.
//
// An earlier version of this only tracked the practice half (set once intro
// had already resolved), which left the entire intro-generation window --
// often 10+ seconds -- where two callers could each run their own
// independent intro generation for the same objective, produce two
// different guessPrompt/teach texts, and have whichever's practice phase
// happened to call generatePracticeAndSave first silently determine what
// actually got cached, while the other caller's own response showed content
// that was never persisted.
//
// Per-process only. Across server instances the same guarantee comes from a
// database lease (lesson_generation_claims, taken in `runGeneration`).
export const pendingGeneration = new Map<string, GenerationHandle>();

export function pendingKey(objectiveId: string, scope: LessonScope): string {
  // REQ-135: lowercased so an uppercase copy of the id shares the entry.
  return `${objectiveId.toLowerCase()}:${scopeKey(scope)}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// REQ-216 (M5): the teaching text a learner was handed, kept while the
// practice half that follows it is not stored. The intro goes out with
// `practicePending` the moment it passes its checks; if the practice half is
// then refused or fails, the learner's next request used to write a NEW intro
// (and pay for it, and show different words) before trying practice again.
// Now a retry reuses the accepted intro and writes only the practice half.
// Per process and short-lived on purpose (no table): another server instance,
// or a restart, falls back to writing a new intro, as before. A stored lesson,
// or a regenerate that ends, forgets it.
const KEPT_INTRO_MS = 30 * 60 * 1000;
const KEPT_INTRO_MAX = 200;
export const keptIntros = new Map<string, { intro: LessonIntroContent; at: number }>();

function keepIntro(key: string, intro: LessonIntroContent, store: typeof keptIntros): void {
  const now = Date.now();
  for (const [k, v] of store) if (now - v.at > KEPT_INTRO_MS) store.delete(k);
  while (store.size >= KEPT_INTRO_MAX) store.delete(store.keys().next().value as string);
  store.set(key, { intro, at: now });
}

function keptIntro(key: string, store: typeof keptIntros): LessonIntroContent | null {
  const v = store.get(key);
  if (!v) return null;
  if (Date.now() - v.at > KEPT_INTRO_MS) {
    store.delete(key);
    return null;
  }
  return v.intro;
}

// Waits for another instance's generation to land, then returns its result;
// null means the other instance released its lease without storing anything
// (it failed) and the caller may try to take the lease itself.
async function waitForOtherGeneration(
  objectiveId: string,
  scope: LessonScope,
  deadline: number,
  pollMs: number
): Promise<LessonRow | null> {
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const live = await isClaimLive(objectiveId, scope);
    if (scope.kind === "shared") {
      // A first generation only ever creates the row, so it is final as soon
      // as it exists.
      const row = await getServableSharedLesson(objectiveId);
      if (row) return row;
      if (!live) return null;
    } else if (!live) {
      // An override may already exist from an earlier regenerate, so it is
      // only final once the lease is released.
      return getOverrideLesson(scope.userId, objectiveId);
    }
  }
  throw new UserFacingError("Lesson generation is taking longer than expected. Please try again in a moment.");
}

async function runGeneration(
  objectiveId: string,
  objRow: ObjectiveRow,
  opts: GenerationOptions,
  gen: LessonGenerator,
  settleIntro: (intro: LessonIntroContent | null) => void
): Promise<LessonRow> {
  const { scope, avoid } = opts;
  const deadline = Date.now() + (opts.waitMs ?? DEFAULT_WAIT_MS);
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const token = randomUUID();

  for (;;) {
    if (await tryClaim(objectiveId, scope, token)) {
      // REQ-135: renew the lease while generating (see renewClaim), so a
      // generation that runs past CLAIM_LEASE_SECONDS while this instance is
      // alive is not taken over. The heartbeat stops in `finally`.
      let leaseLost = false;
      const heartbeat = setInterval(() => {
        renewClaim(objectiveId, scope, token)
          .then((held) => {
            if (!held) leaseLost = true;
          })
          .catch(() => {});
      }, opts.heartbeatMs ?? HEARTBEAT_MS);
      try {
        if (scope.kind === "shared") {
          // Another instance may have finished between the caller's read of
          // the cache and our claim. The stored lesson wins; do not generate
          // a competing one.
          const done = await getServableSharedLesson(objectiveId);
          if (done) {
            settleIntro(null);
            return done;
          }
        }
        // REQ-139 (FAIL-527): teach first, then practice from it. Line B's
        // REQ-089 rule -- the practice questions see the teaching text they
        // test -- was lost when the 2026-11-07 merge kept line A's parallel
        // calls. The intro is still handed to the caller the moment it
        // exists, so the learner reads guess and teach while the practice
        // half generates (the GET returns practicePending), and
        // .../lesson/prefetch-next starts the next objective's generation
        // while the learner is still on this one. Cost: no extra calls; the
        // practice prompt is longer by the teaching text.
        // REQ-187: an objective whose lesson was just refused twice waits
        // out the cooldown instead of paying for the same refusal again.
        if (await recentlyHeldBack(objectiveId, scope)) throw new ContentHeldBackError();
        const meta: GenerateMeta = scope.kind === "user" ? { userId: scope.userId } : { userId: opts.triggeredBy, sharedScope: true };
        // REQ-187 (P8): the teaching text is checked for the writer's own
        // doubt BEFORE the learner sees it (retried once, then held back).
        const introKey = pendingKey(objectiveId, scope);
        const store = opts.keptIntros ?? keptIntros;
        const intro = keptIntro(introKey, store) ?? (await checkedIntro(objectiveId, objRow, { gen, avoid, meta }));
        keepIntro(introKey, intro, store);
        settleIntro(intro);
        const practiceMeta: GenerateMeta = { ...meta, teach: intro.teach };
        const practice = await checkedPractice(objectiveId, objRow, await gen.practice(objRow, avoid, practiceMeta), {
          shared: scope.kind === "shared",
          gen,
          avoid,
          meta: practiceMeta,
        });
        // A learner's override is an upsert, so a holder that lost its lease
        // (stalled past it; another instance took over) must not overwrite
        // the successor's result. A shared save is insert-if-absent, so the
        // first one stored wins either way and the check is not needed there.
        if (scope.kind === "user" && (leaseLost || !(await renewClaim(objectiveId, scope, token)))) {
          throw new UserFacingError("The lesson regeneration did not complete. Please try again.");
        }
        const saved = await saveLesson(scope, objectiveId, { ...intro, ...practice }, gen.model());
        store.delete(introKey);
        return saved;
      } finally {
        clearInterval(heartbeat);
        // Success or failure: release so a waiter can proceed immediately
        // rather than after the lease times out.
        await releaseClaim(objectiveId, scope, token).catch(() => {});
      }
    }

    // Another instance is generating this lesson. Use its result.
    settleIntro(null);
    const row = await waitForOtherGeneration(objectiveId, scope, deadline, pollMs);
    if (row) return row;
    if (scope.kind !== "shared") {
      // The in-flight regenerate failed. Do not silently start another one:
      // that would be a second regenerate the learner did not ask for.
      throw new UserFacingError("The lesson regeneration did not complete. Please try again.");
    }
    // Shared first generation whose owner failed: loop and claim it ourselves.
  }
}

// Starts a full generation for an objective if nothing is already in flight
// in this process, or returns the existing handle. The map slot is claimed
// synchronously -- before anything is awaited -- so a second caller checking
// `pendingGeneration` at any point after this function returns (including on
// the very next microtask) sees the claim and reuses the same handle.
//
// Across processes, `runGeneration` takes a database lease first. Whichever
// instance gets it generates; the others wait for its stored result, so one
// learner never sees teach text from one generation and fade/solo from
// another.
//
// scope shared: first generation, stored in lesson_content for everyone and
//   never overwriting an existing row.
// scope user:   a regenerate, stored only as that learner's override.
export function ensureGeneration(objectiveId: string, objRow: ObjectiveRow, opts: GenerationOptions): GenerationHandle {
  const pending = opts.pending ?? pendingGeneration;
  const key = pendingKey(objectiveId, opts.scope);
  const existing = pending.get(key);
  if (existing) return existing;

  let settle!: (intro: LessonIntroContent | null) => void;
  let failIntro!: (err: unknown) => void;
  const introPromise = new Promise<LessonIntroContent | null>((resolve, reject) => {
    settle = resolve;
    failIntro = reject;
  });
  // Callers that never await the intro (prefetch) must not leave a failure
  // unhandled; callers that do await it still see the rejection.
  introPromise.catch(() => {});

  // REQ-195: a retired objective is not taught, so nothing is generated for
  // it (a model call here would write a lesson for degree-plan content that
  // was removed). The routes check first; this is the backstop.
  if (objRow.retired) throw new RetiredObjectiveError();
  // REQ-195 (was REQ-187 R1): an objective with an authored lesson is never generated.
  const gen = opts.generator ?? (objRow.authored ? authoredGenerator(objRow.authored) : claudeGenerator);
  const fullPromise = runGeneration(objectiveId, objRow, opts, gen, settle).catch(
    (err) => {
      failIntro(err); // no-op if the intro already settled
      throw err;
    }
  );
  const handle: GenerationHandle = { introPromise, fullPromise };
  pending.set(key, handle);

  // Cleanup runs whether the generation succeeds or fails, and handling the
  // rejection here keeps fullPromise from ever being a fully-unhandled one.
  const cleanup = () => {
    if (pending.get(key) === handle) pending.delete(key);
  };
  fullPromise.then(cleanup, cleanup);

  return handle;
}

// Regenerate for one learner: writes only their override, steered away from
// whatever they currently see (their override if they have one, else the
// shared lesson). Their saved place in the old lesson is cleared once the new
// lesson is STORED (FAIL-887): it used to go as soon as the new intro existed,
// so a regenerate whose practice half was then held back or failed left the
// learner with their old lesson and no saved place in it. Nobody else's lesson
// text or saved position is touched.
export async function startRegeneration(
  userId: string,
  objectiveId: string,
  objRow: ObjectiveRow,
  opts: Omit<GenerationOptions, "scope" | "avoid"> = {}
): Promise<GenerationHandle> {
  const current = await getLessonFor(userId, objectiveId);
  // Database time, so a saved position is compared with the clock that
  // stamped it (lesson_progress.updated_at).
  const startedAt = (await queryOne<{ t: Date }>(`select clock_timestamp() as t`))?.t;
  const handle = ensureGeneration(objectiveId, objRow, {
    ...opts,
    scope: { kind: "user", userId },
    avoid: current ? rowToAvoid(current.row) : undefined,
  });
  const fullPromise = handle.fullPromise.then(async (row) => {
    // The new lesson is stored. A failure to tidy the old position must not
    // fail a regenerate that worked: the app drops a position whose
    // lesson_key no longer matches anyway.
    await clearLessonProgress(userId, objectiveId, startedAt).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(`[lesson-generation] could not clear the old saved position: ${(err as Error).message}`);
    });
    return row;
  });
  fullPromise.catch(() => {});
  return { introPromise: handle.introPromise, fullPromise };
}

// FAIL-888: gives a regenerate's counted use back when the regenerate ends
// without storing a lesson (the practice half was held back or failed). Settles
// when the generation does; a stored lesson keeps the use. Never rejects.
export async function releaseUseUnlessStored(handle: GenerationHandle, use: { release(): Promise<void> }): Promise<void> {
  try {
    await handle.fullPromise;
  } catch {
    await use.release();
  }
}

// What GET serves: the learner's own lesson if they have one, else the shared
// one. If this learner's regenerate is running on another instance, wait for
// it first, so a follow-up GET cannot return the pre-regenerate lesson in the
// middle of a regenerate. (A regenerate running in THIS process is handled by
// the caller via pendingGeneration.)
export async function readLessonForUser(
  userId: string,
  objectiveId: string,
  opts: { waitMs?: number; pollMs?: number } = {}
): Promise<{ row: LessonRow; source: "override" | "shared" } | null> {
  const scope: LessonScope = { kind: "user", userId };
  if (await isClaimLive(objectiveId, scope)) {
    const deadline = Date.now() + (opts.waitMs ?? DEFAULT_WAIT_MS);
    while (Date.now() < deadline && (await isClaimLive(objectiveId, scope))) {
      await sleep(opts.pollMs ?? DEFAULT_POLL_MS);
    }
  }
  return getLessonFor(userId, objectiveId);
}

// "Regenerate lesson" spends two model calls. A handful per window is plenty
// for a learner who wants a different explanation, and stops a loop of taps
// (or a script) from running up the bill. Same mechanism as grade, pbq, chat
// and guess-feedback (lib/auth/rateLimit.ts).
// REQ-135: a FIRST (shared) generation also spends two model calls, and
// prefetch-next starts one for whatever objective comes next -- so walking
// prefetch-next through the catalog generated every lesson in it with no
// limit. Starting a new shared generation now counts against this per-learner
// budget, on the lesson GET and on prefetch. Serving a cached lesson, or
// joining a generation already in flight, is free. A learner opening one
// lesson every few minutes, with a prefetch each, stays well inside it.
export const GENERATE_RATE_EVENT = "lesson_generate";
// REQ-202: 20 an hour, down from 20 every 10 minutes (2,880 first generations
// a day). A learner opens a new objective a few minutes apart at the fastest,
// and prefetch-next covers the one after, so 20 an hour is far above any real
// use and an order of magnitude under what a walk through the catalog needs.
export const GENERATE_LIMIT = { max: 20, windowMinutes: 60 };

export const REGEN_RATE_EVENT = "lesson_regenerate";
export const REGEN_LIMIT = { max: 5, windowMinutes: 10 };

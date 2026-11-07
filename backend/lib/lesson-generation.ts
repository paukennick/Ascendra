import { randomUUID } from "node:crypto";
import { queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { presentationOrder, presentationSeed, shuffleForPresentation } from "@/lib/choice-order";
import { callClaudeStructured, getModel } from "@/lib/anthropic";
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
  tryClaim,
  type LessonRow,
  type LessonScope,
} from "@/lib/lesson-store";
import { factCheckGate, modelFactChecker, type CheckItem, type FactChecker } from "@/lib/fact-check";
import { recordHoldback, uncertaintyOf } from "@/lib/item-quality";

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
}

// REQ-097: what the app is sent for a lesson. Grading is server-side, so the
// answer keys (*_correct_index) and the explanations of the right answer
// (*_why) never leave the server before the learner answers; /api/grade
// returns them with the verdict. Guided choices come in this learner's fixed
// shuffled order (lib/choice-order.ts). Solo choices are not sent (the field
// is an empty list for old app builds): they are a hint, fetched from
// POST /api/objectives/:id/hint, which records that the hint was used.
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
    // from before REQ-097 do `lesson.soloChoices!.map(...)` when the learner
    // opens the hint, and crashed on a missing field; an empty list leaves
    // them with free response only (FAIL-039).
    soloChoices: [] as string[],
    model: row.model,
    generatedAt: row.generated_at,
  };
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
  const [row, ctx] = await Promise.all([
    queryOne<Omit<ObjectiveRow, "ctx">>(
      `select o.title, cu.title as unit_title, st.title as track_title
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       where o.id = $1`,
      [objectiveId]
    ),
    coachContextForObjective(objectiveId),
  ]);
  return row ? { ...row, ctx } : null;
}


// What a generation produces. Injected so the storage, claim and selection
// rules can be tested without the model (lib/lesson-regen.dbtest.ts).
export interface LessonGenerator {
  intro(objRow: ObjectiveRow, avoid?: LessonAvoid, meta?: GenerateMeta): Promise<LessonIntroContent>;
  practice(objRow: ObjectiveRow, avoid?: LessonAvoid, meta?: GenerateMeta): Promise<LessonPracticeContent>;
  model(): string;
  // REQ-114: the second-model fact-check of a SHARED lesson's two checks.
  // Production sets it; a test generator without one skips the gate (the
  // writer's own uncertainClaims are still honoured).
  factCheck?: FactChecker;
}

// Who a generation is for, for ai_calls. Only a regenerate is attributable to
// one learner; the first (shared) generation serves everyone.
export interface GenerateMeta {
  userId?: string;
  // REQ-114: set on the one retry of a practice half that was held back --
  // the claims to leave out or state as uncertain.
  steer?: string;
}

// Lessons: Sonnet, effort "medium", thinking off. See lib/anthropic.ts
// (modelParams) for why thinking is off -- adaptive thinking ate the
// max_tokens budget on a verbose real objective (no text block at all,
// stop_reason max_tokens, blocks=[thinking]). This is content generation
// against a fixed schema, not a reasoning task.
export const claudeGenerator: LessonGenerator = {
  async intro(objRow, avoid, meta) {
    const { system, user } = lessonIntroPrompt({
      trackTitle: objRow.track_title,
      unitTitle: objRow.unit_title,
      objectiveTitle: objRow.title,
      avoid,
      ctx: objRow.ctx ?? undefined,
    });
    // REQ-106: the model writes the cards; the flat teach text is derived.
    const raw = await callClaudeStructured({
      system,
      messages: [{ role: "user", content: user }],
      schema: lessonIntroSchema,
      maxTokens: 4000,
      model: getModel(),
      effort: "medium",
      thinking: "off",
      purpose: "lesson_intro",
      userId: meta?.userId,
    });
    return introFromModel(raw);
  },
  async practice(objRow, avoid, meta) {
    const { system, user } = lessonPracticePrompt({
      trackTitle: objRow.track_title,
      unitTitle: objRow.unit_title,
      objectiveTitle: objRow.title,
      avoid,
      ctx: objRow.ctx ?? undefined,
      steer: meta?.steer,
    });
    return callClaudeStructured({
      system,
      messages: [{ role: "user", content: user }],
      schema: lessonPracticeSchema,
      maxTokens: 6000,
      model: getModel(),
      effort: "medium",
      thinking: "off",
      purpose: "lesson_practice",
      userId: meta?.userId,
    });
  },
  model: getModel,
  factCheck: modelFactChecker,
};

// REQ-114 (Audit 3 H1 + recommendation 1). A lesson's two checks are shared
// items with answer keys, but a lesson cannot be shown without them, so a
// held-back practice half is regenerated ONCE, steered away from the claims
// that held it back; if the retry is held back too it is kept (a lesson needs
// its checks) and logged as 'served_after_retry' for review. Learner flags
// and quarantine still apply to it. The fact-check runs only for the shared
// lesson (one fast-model call per objective), not a learner's own regenerate.
export async function checkedPractice(
  objectiveId: string,
  objRow: ObjectiveRow,
  first: LessonPracticeContent,
  opts: { shared: boolean; gen: LessonGenerator; avoid?: LessonAvoid; meta: GenerateMeta }
): Promise<LessonPracticeContent> {
  const problems = async (p: LessonPracticeContent): Promise<{ reason: "uncertain" | "fact_check" | "fact_check_error"; claims: string[] } | null> => {
    const unsure = uncertaintyOf(p);
    if (unsure) return { reason: "uncertain", claims: unsure };
    if (!opts.shared || !opts.gen.factCheck) return null;
    const items: CheckItem[] = [
      { key: "fade", objectiveTitle: objRow.title, question: p.fadeProblem, format: "single", options: p.fadeChoices, expected: [p.fadeCorrectIndex] },
      { key: "solo", objectiveTitle: objRow.title, question: p.soloCheck, format: "single", options: p.soloChoices, expected: [p.soloCorrectIndex] },
    ];
    const gate = await factCheckGate(items, { ctx: objRow.ctx ?? undefined, userId: opts.meta.userId }, opts.gen.factCheck);
    if (gate.error) return { reason: "fact_check_error", claims: [gate.error] };
    const failed = items.map((i) => gate.verdicts.get(i.key)).filter((v) => !v?.publish);
    if (!failed.length) return null;
    const claims = failed.flatMap((v) => (v?.unsupportedClaims.length ? v.unsupportedClaims : [`${v?.key}: independent answer disagreed with the key`]));
    return { reason: "fact_check", claims };
  };
  const firstProblem = await problems(first);
  if (!firstProblem) return first;
  await recordHoldback({ kind: "lesson", objectiveId, reason: firstProblem.reason, claims: firstProblem.claims, content: first, model: opts.gen.model() });
  const steer = `A previous draft was held back because of these claims. Leave each out, or state plainly that it may differ for this exam version, and make sure each check has exactly one defensible answer:\n${firstProblem.claims.map((c) => `- ${c}`).join("\n")}`;
  const retry = await opts.gen.practice(objRow, opts.avoid, { ...opts.meta, steer });
  const retryProblem = await problems(retry);
  if (retryProblem) {
    await recordHoldback({ kind: "lesson", objectiveId, reason: "served_after_retry", claims: retryProblem.claims, content: retry, model: opts.gen.model() });
  }
  return retry;
}

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
  avoid?: LessonAvoid;
  // Test seams; production uses the defaults.
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

// A full generation (intro and practice in parallel, then save) already in flight IN THIS
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
  // REQ-098: lowercased so an uppercase copy of the id shares the entry.
  return `${objectiveId.toLowerCase()}:${scopeKey(scope)}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
      // REQ-098: renew the lease while generating (see renewClaim), so a
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
        // The two halves are independent (the practice prompt never sees the
        // intro's output), so both calls start now and wall time is the slower
        // of the two instead of their sum. The intro is still handed to the
        // caller the moment it exists, ahead of the practice half.
        const meta: GenerateMeta = { userId: scope.kind === "user" ? scope.userId : undefined };
        const introCall = gen.intro(objRow, avoid, meta);
        const practiceCall = gen.practice(objRow, avoid, meta);
        // Whichever call is not being awaited when the other fails must not
        // become an unhandled rejection. (If the intro fails, the practice
        // call is already in flight; its result is discarded.)
        introCall.catch(() => {});
        practiceCall.catch(() => {});
        const intro = await introCall;
        settleIntro(intro);
        // REQ-114: teaching text is not an item; uncertainty in it is logged.
        const introUnsure = uncertaintyOf(intro as unknown as { uncertainClaims?: unknown; confidence?: unknown });
        if (introUnsure) {
          await recordHoldback({ kind: "lesson_intro", objectiveId, reason: "uncertain", claims: introUnsure, content: intro, model: gen.model() });
        }
        const practice = await checkedPractice(objectiveId, objRow, await practiceCall, {
          shared: scope.kind === "shared",
          gen,
          avoid,
          meta,
        });
        // A learner's override is an upsert, so a holder that lost its lease
        // (stalled past it; another instance took over) must not overwrite
        // the successor's result. A shared save is insert-if-absent, so the
        // first one stored wins either way and the check is not needed there.
        if (scope.kind === "user" && (leaseLost || !(await renewClaim(objectiveId, scope, token)))) {
          throw new UserFacingError("The lesson regeneration did not complete. Please try again.");
        }
        return await saveLesson(scope, objectiveId, { ...intro, ...practice }, gen.model());
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

  const fullPromise = runGeneration(objectiveId, objRow, opts, opts.generator ?? claudeGenerator, settle).catch(
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
// lesson's intro exists. Nobody else's lesson text or saved position is
// touched.
export async function startRegeneration(
  userId: string,
  objectiveId: string,
  objRow: ObjectiveRow,
  opts: Omit<GenerationOptions, "scope" | "avoid"> = {}
): Promise<GenerationHandle> {
  const current = await getLessonFor(userId, objectiveId);
  const handle = ensureGeneration(objectiveId, objRow, {
    ...opts,
    scope: { kind: "user", userId },
    avoid: current ? rowToAvoid(current.row) : undefined,
  });
  const introPromise = handle.introPromise.then(async (intro) => {
    if (intro) await clearLessonProgress(userId, objectiveId);
    return intro;
  });
  introPromise.catch(() => {});
  return { introPromise, fullPromise: handle.fullPromise };
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
// REQ-098: a FIRST (shared) generation also spends two model calls, and
// prefetch-next starts one for whatever objective comes next -- so walking
// prefetch-next through the catalog generated every lesson in it with no
// limit. Starting a new shared generation now counts against this per-learner
// budget, on the lesson GET and on prefetch. Serving a cached lesson, or
// joining a generation already in flight, is free. A learner opening one
// lesson every few minutes, with a prefetch each, stays well inside it.
export const GENERATE_RATE_EVENT = "lesson_generate";
export const GENERATE_LIMIT = { max: 20, windowMinutes: 10 };

export const REGEN_RATE_EVENT = "lesson_regenerate";
export const REGEN_LIMIT = { max: 5, windowMinutes: 10 };

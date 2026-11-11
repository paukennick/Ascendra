import { misconceptionPromptBlock } from "@/lib/understanding-store";
import { query } from "@/lib/db";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { gradeFreeResponse } from "@/lib/free-response-grader";
import { getSharedLesson } from "@/lib/lesson-store";
import { refresherExcerpt } from "@/lib/understanding";
import { coachContextForObjective, coachContextForTrack } from "@/lib/coach-context";
import { unitReferencesFor } from "@/lib/current-facts";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { presentationOrder, presentationSeed, shownIndexOf, shuffleForPresentation, storedIndexAt } from "@/lib/choice-order";
import { reviewBatchPrompt, reviewBatchSchema, type ReviewBatchObjective } from "@/lib/review-prompts";
import {
  chooseCachedItem,
  cleanTerms,
  matchTerms,
  md5,
  targetTerms,
  termKey,
  wasRough,
  GENTLE_SESSION_CAP,
  SESSION_CAP,
} from "@/lib/review-plan";
import {
  AlreadyAnsweredError,
  answeredItem,
  assignItem,
  coveredTerms,
  discardEmptySession,
  dropUnpreparedItems,
  dueObjectives,
  getReviewItem,
  insertReviewItem,
  lastSessionStats,
  nextDueOn,
  openSession,
  recordChoicesShown,
  recordReviewAnswer,
  saveTerms,
  sessionItems,
  startOrResumeSession,
  strugglingObjectives,
  termsFor,
  type SessionItemRow,
} from "@/lib/review-store";
import { utcDay } from "@/lib/review-scheduler";
import { assignItems, prepareContext, termsForStored } from "@/lib/review-store";
import { findClientAttempt, isDuplicateClientAttempt } from "@/lib/grading-service";
import { replayMatches, REPLAY_CONFLICT } from "@/lib/replay-binding";
import { hasUnstorableText } from "@/lib/text-input";
import { withGradingClaim } from "@/lib/grading-claims";
import { requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { factCheckGate, verdictClaims, verdictHolds, verdictUnchecked, type CheckItem } from "@/lib/fact-check";
import { flagItem, lowConfidenceOf, noteListedClaims, recordHoldback, type ItemRef } from "@/lib/item-quality";
import { GATE_ATTEMPTS, steerText } from "@/lib/generation-gate";
import { KEY_SUSPECT } from "@/lib/prompts";
import { inBackground } from "@/lib/understanding-ai";

// REQ-108: Today's review -- the part that talks to the model. Questions are
// written once, in one batched call per course per session, from each
// objective's SHARED lesson text, and cached for every learner
// (review_items). A learner is served a cached question they have not
// answered, preferring one that tests terms they have not yet shown they
// know; a new one is written only when no unseen cached question does.

export const REVIEW_STAGE = "review";

export class ReviewError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 429,
    message: string
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function todaySummary(userId: string, trackId: string | null, now: Date = new Date()) {
  const today = utcDay(now);
  const due = await dueObjectives(userId, today, trackId, query, now);
  const last = await lastSessionStats(userId);
  const cap = wasRough(last) ? GENTLE_SESSION_CAP : SESSION_CAP;
  return {
    dueCount: due.length,
    forToday: Math.min(due.length, cap),
    nextDueOn: due.length ? today : await nextDueOn(userId, trackId),
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface SessionView {
  id: string;
  gentleStart: boolean;
  total: number;
  answered: number;
  items: {
    position: number;
    objectiveId: string;
    objectiveTitle: string;
    unitTitle: string;
    trackTitle: string;
    question: string;
    answered: boolean;
    verdict: string | null;
    // REQ-117 (FAIL-349): the last two answers on this objective were missed:
    // a short excerpt of its lesson to read first, and the choices offered up
    // front (recognition first; a correct pick still moves it out to a week).
    reteach: string | null;
    easierEntry: boolean;
  }[];
}

export const RETEACH_WORDS = 120;

export async function sessionView(userId: string, sessionId: string): Promise<SessionView | null> {
  const s = await openSession(userId, sessionId);
  if (!s) return null;
  const items = (await sessionItems(sessionId)).filter((i) => i.question);
  const open = items.filter((i) => !i.answered_at).map((i) => i.objective_id);
  const struggling = await strugglingObjectives(userId, open);
  const reteach = new Map<string, string | null>();
  // One read for every struggling objective's lesson text (REQ-118's query
  // budget for session start), not one per objective.
  if (struggling.size) {
    const rows = await query<{ objective_id: string; teach: string | null }>(
      `select objective_id, teach from lesson_content where objective_id = any($1::uuid[])`,
      [[...struggling]]
    );
    const teachOf = new Map(rows.map((r) => [r.objective_id, r.teach]));
    for (const id of struggling) {
      const teach = teachOf.get(id);
      reteach.set(id, teach ? refresherExcerpt(teach, RETEACH_WORDS).text : null);
    }
  }
  return {
    id: s.id,
    gentleStart: s.gentle_start,
    total: items.length,
    answered: items.filter((i) => i.answered_at).length,
    items: items.map((i) => ({
      position: i.position,
      objectiveId: i.objective_id,
      objectiveTitle: i.objective_title,
      unitTitle: i.unit_title,
      trackTitle: i.track_title,
      question: i.question!,
      answered: !!i.answered_at,
      verdict: i.verdict,
      reteach: !i.answered_at ? reteach.get(i.objective_id) ?? null : null,
      easierEntry: !i.answered_at && struggling.has(i.objective_id),
    })),
  };
}

// Starts (or resumes) today's session and makes sure every question in it is
// ready. Returns null when nothing is due. `unavailable` counts objectives
// that had no question and none could be written (they stay due).
// REQ-216 (H2): when items were due but NONE could be prepared, the session
// is `null` with `unavailable` > 0 -- "couldn't be prepared", not "nothing is
// due" -- and the empty session row is removed instead of left behind.
export const REVIEW_UNPREPARED_MESSAGE =
  "Your review questions are due, but we couldn't prepare any just now. They're still due: please try again in a few minutes.";

export async function startSession(
  userId: string,
  trackId: string | null,
  now: Date = new Date()
): Promise<{ session: SessionView | null; unavailable: number; message?: string } | null> {
  const started = await startOrResumeSession(userId, trackId, now);
  if (!started) return null;
  const allPrepared = await prepareItems(userId, started.id, started.planned);
  // REQ-118: nothing to drop when every open item got a question.
  const unavailable = allPrepared ? 0 : await dropUnpreparedItems(started.id);
  const session = await sessionView(userId, started.id);
  if (!session || !session.total) {
    if (unavailable > 0) {
      await discardEmptySession(started.id).catch(() => undefined);
      return { session: null, unavailable, message: REVIEW_UNPREPARED_MESSAGE };
    }
    return null;
  }
  return { session, unavailable };
}

// Returns true when every open item already had, or now has, a question.
async function prepareItems(userId: string, sessionId: string, planned?: SessionItemRow[]): Promise<boolean> {
  const pending = (planned ?? (await sessionItems(sessionId))).filter((i) => !i.review_item_id && !i.answered_at);
  if (!pending.length) return true;

  // REQ-118 (Audit 3 MEDIUM-4): one read for every pending item (terms,
  // coverage, shared lesson, unseen cached questions) and one write for the
  // picks, instead of three to five queries per item.
  const ctx = await prepareContext(userId, pending.map((p) => p.objective_id));
  const { terms, toSave } = termsForStored(pending.map((p) => ({ id: p.objective_id, title: p.objective_title })), ctx);
  const toWrite: { item: SessionItemRow; teach: string; hash: string; known: string[] | null; target: string[] }[] = [];
  const picks: { position: number; reviewItemId: string }[] = [];

  for (const p of pending) {
    const c = ctx.get(p.objective_id);
    if (!c?.teach) continue; // nothing to write from; dropped from the session
    const hash = md5(c.teach);
    const known = terms.get(p.objective_id) ?? null;
    const cov = c.covered;
    const untested = new Set((known ?? []).map(termKey).filter((k) => !cov.has(k)));
    // The candidates were matched on Postgres's md5 of the same text; if the
    // two ever disagreed, none of them is served and new ones get written.
    const cached = c.teachHash === hash ? c.unseen : [];
    const pick = chooseCachedItem(cached, untested);
    if (pick) {
      picks.push({ position: p.position, reviewItemId: pick.id });
      continue;
    }
    toWrite.push({ item: p, teach: c.teach, hash, known, target: known ? targetTerms(known, cov) : [] });
  }
  await assignItems(sessionId, picks, toSave);
  if (!toWrite.length) return picks.length === pending.length;

  // Writing questions costs a model call; cap how often one learner can
  // trigger it. Over the cap the session runs on cached questions only.
  // One call per course in the session (the course sets the coach framing).
  const byTrack = new Map<string, typeof toWrite>();
  for (const w of toWrite) {
    const g = byTrack.get(w.item.track_id) ?? [];
    g.push(w);
    byTrack.set(w.item.track_id, g);
  }
  for (const [trackId, group] of byTrack) {
    // REQ-135 / FAIL-230: count-and-record atomically, once per call.
    try {
      await consumeRateLimit("review_generate", userId, { max: 10, windowMinutes: 60 }, { userId });
    } catch (err) {
      if (err instanceof RateLimitError) return false;
      throw err;
    }
    await writeQuestions(userId, sessionId, trackId, group).catch((err) => {
      // A failed batch leaves its questions unprepared; they are dropped
      // from today's session and stay due. Never fail the whole session.
      console.warn(`[review] question batch failed for track ${trackId}: ${(err as Error).message}`);
    });
  }
  return false; // let dropUnpreparedItems check what the model calls left open
}

type WriteGroup = { item: SessionItemRow; teach: string; hash: string; known: string[] | null; target: string[] }[];

async function writeQuestions(userId: string, sessionId: string, trackId: string, group: WriteGroup): Promise<void> {
  // REQ-216 (H2): a question held back (the writer rated it low, or the
  // independent check disagreed with its key) is written once more, steered
  // with the claims; the rest of the batch is already stored by then.
  let todo: { g: WriteGroup[number]; steer?: string }[] = group.map((g) => ({ g }));
  for (let attempt = 1; attempt <= GATE_ATTEMPTS && todo.length; attempt++) {
    todo = await writeQuestionRound(userId, sessionId, trackId, todo);
  }
}

// One model call for `todo`, the fact-check, and the stores. Returns what was
// held back (with the steer for its retry); items that could not be checked
// are not retried here (the checker is failing) and are not held back.
async function writeQuestionRound(
  userId: string,
  sessionId: string,
  trackId: string,
  todo: { g: WriteGroup[number]; steer?: string }[]
): Promise<{ g: WriteGroup[number]; steer?: string }[]> {
  const group = todo.map((t) => t.g);
  const ctx = await coachContextForTrack(trackId);
  // REQ-112 (i): aim new questions at this learner's recorded mix-ups. No
  // extra model call: one indexed read per objective; a failure only drops
  // the hint.
  const mixups = await Promise.all(
    group.map((g) => misconceptionPromptBlock(userId, g.item.objective_id).catch(() => ""))
  );
  const references = await Promise.all(group.map((g) => unitReferencesFor(ctx?.trackCode, g.item.unit_title)));
  const objectives: ReviewBatchObjective[] = group.map((g, i) => ({
    key: `o${i + 1}`,
    title: g.item.objective_title,
    unitTitle: g.item.unit_title,
    teach: g.teach,
    knownTerms: g.known,
    targetTerms: g.target,
    mixups: mixups[i],
    references: references[i],
    steer: todo[i].steer,
  }));
  const { system, user } = reviewBatchPrompt({
    trackTitle: group[0].item.track_title,
    objectives,
    ctx: ctx ?? undefined,
  });
  const model = getFastModel();
  const out = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: reviewBatchSchema,
    maxTokens: 450 * group.length + 200,
    model,
    effort: "low",
    thinking: "off",
    purpose: "review_generate",
    userId,
  });
  const held: { g: WriteGroup[number]; steer?: string }[] = [];
  // REQ-114 (Audit 3 H1 + recommendation 1), changed by REQ-216: a question
  // the writer rated LOW is held back; the rest are fact-checked in one call
  // and only a DISAGREEMENT with the key holds one back. Listed claims are
  // logged. A check that did not run stores nothing and logs no holdback.
  const ready: { g: (typeof group)[number]; gen: (typeof out.items)[number] }[] = [];
  for (const [i, g] of group.entries()) {
    const key = objectives[i].key;
    const gen = out.items.find((it) => it.key === key);
    if (!gen || !validItem(gen)) continue;
    const unsure = lowConfidenceOf(gen);
    if (unsure) {
      await recordHoldback({ kind: "review", objectiveId: g.item.objective_id, reason: "uncertain", claims: unsure, content: gen, model });
      held.push({ g, steer: steerText(unsure) });
      continue;
    }
    noteListedClaims(`review (${g.item.objective_id})`, gen);
    ready.push({ g, gen });
  }
  const checks: CheckItem[] = ready.map(({ g, gen }) => ({
    key: gen.key,
    objectiveTitle: g.item.objective_title,
    question: gen.question,
    format: "single",
    options: gen.choices,
    expected: [gen.correctIndex],
    references: objectives.find((o) => o.key === gen.key)?.references,
  }));
  const gate = await factCheckGate(checks, { ctx: ctx ?? undefined, userId, purpose: "fact_check" });
  if (gate.error) {
    // The check call failed: nothing in this batch is stored, nothing is
    // logged as a holdback (it says nothing about the questions), and the
    // session drops the unprepared items, which stay due.
    console.warn(`[review] fact-check did not run for track ${trackId}: ${gate.error}`);
    return held;
  }
  for (const { g, gen } of ready) {
    const v = gate.verdicts.get(gen.key);
    if (verdictUnchecked(v)) continue;
    if (verdictHolds(v)) {
      const claims = verdictClaims(v);
      await recordHoldback({
        kind: "review",
        objectiveId: g.item.objective_id,
        reason: "fact_check",
        claims,
        content: { item: gen, checker: v ?? null },
        model,
      });
      held.push({ g, steer: steerText(claims) });
      continue;
    }
    if (v?.unsupportedClaims.length) {
      console.warn(`[item-quality] review (${g.item.objective_id}) agreed with the key; checker could not confirm: ${v.unsupportedClaims.join(" | ").slice(0, 500)}`);
    }
    let terms = g.known;
    if (terms === null) {
      terms = cleanTerms(gen.terms);
      if (terms.length) await saveTerms(g.item.objective_id, g.item.objective_title, terms, "model", model);
    }
    const id = await insertReviewItem({
      objectiveId: g.item.objective_id,
      sourceHash: g.hash,
      question: gen.question.trim(),
      choices: gen.choices.map((c) => c.trim()),
      correctIndex: gen.correctIndex,
      why: gen.why.trim(),
      terms: matchTerms(gen.testedTerms, terms),
      model,
    });
    await assignItem(sessionId, g.item.position, id);
  }
  return held;
}

function validItem(gen: { question: string; choices: string[]; correctIndex: number; why: string }): boolean {
  if (!gen.question?.trim() || !Array.isArray(gen.choices) || gen.choices.length !== 4) return false;
  if (gen.choices.some((c) => typeof c !== "string" || !c.trim())) return false;
  if (new Set(gen.choices.map((c) => c.trim().toLowerCase())).size !== 4) return false;
  return Number.isInteger(gen.correctIndex) && gen.correctIndex >= 0 && gen.correctIndex <= 3;
}

// ---------------------------------------------------------------------------
// Choices and answers
// ---------------------------------------------------------------------------

async function loadItem(userId: string, sessionId: string, position: number) {
  const s = await openSession(userId, sessionId);
  if (!s) throw new ReviewError(404, "Review session not found");
  const item = (await sessionItems(sessionId)).find((i) => i.position === position);
  if (!item || !item.review_item_id) throw new ReviewError(404, "Review question not found");
  const ri = await getReviewItem(item.review_item_id);
  if (!ri) throw new ReviewError(404, "Review question not found");
  // The disclaimer can change after the session was planned.
  await requireAcknowledgementForObjective(item.objective_id, userId);
  return { session: s, item, ri };
}

function orderFor(userId: string, objectiveId: string, question: string, n: number) {
  return presentationOrder(presentationSeed(userId, objectiveId, REVIEW_STAGE, question), n);
}

// "Show choices": recorded before the choices are sent, so a typed answer
// after it is known to be helped. Choices go out in this learner's fixed
// shuffle, without the key.
export async function showChoices(userId: string, sessionId: string, position: number) {
  const { item, ri } = await loadItem(userId, sessionId, position);
  await recordChoicesShown(sessionId, position);
  const order = orderFor(userId, item.objective_id, ri.question, ri.choices.length);
  return { choices: shuffleForPresentation(ri.choices, order) };
}

export interface AnswerBody {
  format: "mc" | "open";
  answer?: string;
  chosenIndex?: number;
  clientAttemptId: string | null;
}

export async function answerItem(userId: string, sessionId: string, position: number, body: AnswerBody, now: Date = new Date()) {
  const { item, ri } = await loadItem(userId, sessionId, position);
  const order = orderFor(userId, item.objective_id, ri.question, ri.choices.length);
  const reveal = {
    correctIndex: shownIndexOf(order, ri.correct_index),
    correctAnswer: ri.choices[ri.correct_index] ?? null,
    why: ri.why || null,
  };
  const terms = Array.isArray(ri.terms) ? ri.terms : [];
  const replay = async (attempt: Record<string, any>) => ({
    verdict: attempt.verdict,
    feedback: attempt.feedback ?? "",
    classification: attempt.classification ?? "none",
    missedParts: Array.isArray(attempt.missed_parts) ? attempt.missed_parts : [],
    assisted: attempt.assisted === true,
    ...reveal,
    terms,
    replayed: true,
  });

  // REQ-116: only a replay of THIS question (lib/replay-binding.ts); an id
  // recorded for another item is refused instead of revealing this key.
  const sameItem = { objectiveId: item.objective_id, kind: "review", stage: "review", question: ri.question };
  if (body.clientAttemptId) {
    const prior = await findClientAttempt(userId, body.clientAttemptId);
    if (prior) {
      if (!replayMatches(prior.attempt, sameItem)) throw new ReviewError(409, REPLAY_CONFLICT);
      return replay(prior.attempt);
    }
  }
  if (item.answered_at) {
    const a = await answeredItem(sessionId, position);
    if (a) return replay(a);
  }

  // REQ-117 (FAIL-359): racing copies of one typed answer share one model call.
  const replayStored = async () => {
    const prior = body.clientAttemptId ? await findClientAttempt(userId, body.clientAttemptId) : null;
    if (!prior) return null;
    if (!replayMatches(prior.attempt, sameItem)) throw new ReviewError(409, REPLAY_CONFLICT);
    return replay(prior.attempt);
  };
  return withGradingClaim(userId, body.format === "open" ? body.clientAttemptId : null, () => gradeAndRecord(), replayStored);

  async function gradeAndRecord() {
    // REQ-117 (FAIL-343): a pick from the choices is helped too.
    const assisted = !!item.choices_shown_at;
    let graded: { verdict: "correct" | "partial" | "incorrect"; feedback: string; classification: string; missedParts: string[] };
    let answerText: string;
    if (body.format === "mc") {
      if (!item.choices_shown_at) throw new ReviewError(400, "Show the choices before picking one.");
      const stored = storedIndexAt(order, body.chosenIndex);
      if (stored === null) throw new ReviewError(400, `chosenIndex must be 0-${ri.choices.length - 1}`);
      const correct = stored === ri.correct_index;
      answerText = ri.choices[stored];
      graded = {
        verdict: correct ? "correct" : "incorrect",
        feedback: `${correct ? "That's right." : "Not this time -- here is the idea to hold on to."} ${ri.why}`.trim(),
        classification: "none",
        missedParts: [],
      };
    } else {
      const answer = body.answer ?? "";
      if (!answer.trim()) throw new ReviewError(400, "answer is required for format 'open'");
      // REQ-116: refused before the billed model call, not after it.
      if (hasUnstorableText(answer)) throw new ReviewError(400, "answer contains characters that can't be stored");
      try {
        await consumeRateLimit("review_grade", userId, { max: 40, windowMinutes: 10 }, { userId });
      } catch (err) {
        if (err instanceof RateLimitError) throw new ReviewError(429, err.message);
        throw err;
      }
      const lesson = await getSharedLesson(item.objective_id);
      const ctx = await coachContextForObjective(item.objective_id);
      const right = ri.choices[ri.correct_index];
      const result = await gradeFreeResponse({
        taughtText: lesson?.teach ?? "",
        question: ri.question,
        answerKey: ri.why ? `${right}\nWhy: ${ri.why}` : right,
        answer,
        ctx: ctx ?? undefined,
        userId,
        purpose: "review_grade",
      });
      answerText = answer;
      // REQ-114 (Audit 3 H3): the grader judged this item's key wrong and graded
      // on the facts; that counts as this learner's flag on the shared item.
      if (result.classification === KEY_SUSPECT) {
        const ref: ItemRef = { kind: "review", itemId: ri.id, objectiveId: item.objective_id, question: ri.question };
        const flagged = await flagItem(ref, { userId, source: "key_suspect" }).catch(() => null);
        if (flagged?.recheck) inBackground(() => flagged.recheck!);
      }
      graded = {
        verdict: result.verdict,
        feedback: result.feedback,
        classification: result.classification,
        missedParts: result.missedParts ?? [],
      };
    }

    try {
      const out = await recordReviewAnswer({
        userId,
        sessionId,
        position,
        objectiveId: item.objective_id,
        unitId: item.unit_id,
        reviewItemId: ri.id,
        terms,
        format: body.format,
        question: ri.question,
        answer: answerText,
        ...graded,
        assisted,
        clientAttemptId: body.clientAttemptId,
        now,
      });
      return {
        ...graded,
        assisted,
        ...reveal,
        terms,
        termsCredited: out.termsCredited,
        nextDueOn: out.nextDueOn,
        advanced: out.advanced,
        replayed: false,
      };
    } catch (err) {
      if (err instanceof AlreadyAnsweredError) {
        const a = await answeredItem(sessionId, position);
        if (a) return replay(a);
      }
      if (body.clientAttemptId && isDuplicateClientAttempt(err)) {
        const prior = await findClientAttempt(userId, body.clientAttemptId);
        if (prior) {
          if (!replayMatches(prior.attempt, sameItem)) throw new ReviewError(409, REPLAY_CONFLICT);
          return replay(prior.attempt);
        }
      }
      throw err;
    }
  }
}

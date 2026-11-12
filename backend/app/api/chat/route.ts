import { query } from "@/lib/db";
import { requireStudyNotice } from "@/lib/study-notice";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, forbidden, conflict, serverError, readJson } from "@/lib/http";
import { callClaude, getFastModel } from "@/lib/anthropic";
import { buildChatRequest } from "@/lib/chat-request";
import { findChatTurn, saveChatTurn, sameChatTurn, ChatIdConflictError } from "@/lib/chat-store";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleTrack, visibleUnit, isUuid } from "@/lib/visibility";
import { textField, TEXT_LIMITS } from "@/lib/text-input";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForTrack,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForTrack } from "@/lib/coach-context";
import { guardedReply, haikuLeakJudge, MOCK_IN_PROGRESS_REPLY, openItemsFor, timedMockInProgress } from "@/lib/coach-guard";
import { loadChatHistory } from "@/lib/chat-history";
import { requireAiBudget } from "@/lib/ai-budget";
import { consumeCoachMessage, requireAiFeature, requireGlobalCeiling } from "@/lib/ai-access";
import { learnerProfileBlock, learnerProfileFor } from "@/lib/learner-profile";
import { consumeAllowance, requireAiAllowance, requireFeature } from "@/lib/entitlements";
import { flagChatDisputes } from "@/lib/chat-dispute";
import { inBackground } from "@/lib/understanding-ai";
import { withGradingClaim, GradingInProgressError } from "@/lib/grading-claims";

// REQ-202: seconds this route may run (Haiku reply plus the guards; one retry still fits). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

// GET /api/chat?trackId=... — full chat history for a track (newest last).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    if (!trackId) return badRequest("trackId query param is required");
    const user = await requireUser(req);
    // REQ-135: a non-uuid id used to reach Postgres and come back as a 500.
    if (!isUuid(trackId)) return notFound("Track not found");
    await requireAcknowledgementForTrack(trackId, user.id);
    const rows = await query(
      `select * from chat_messages where user_id = $1 and track_id = $2 order by created_at asc`,
      [user.id, trackId]
    );
    return ok({ messages: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
    return serverError(err);
  }
}

// POST /api/chat — send one user message, get back Claude's reply. Persists both turns.
// Body: { trackId, unitId?, message, clientMessageId? }
// clientMessageId: one id per message, reused by the app when it retries. A repeat returns
// the stored reply without calling Anthropic or saving the message again.
// Earlier turns of the thread are sent back as conversation history (lib/chat-history.ts:
// at most 40 messages and ~8K estimated tokens, trimmed in fixed chunks so the cached
// prefix holds), so it's a genuinely multi-turn "ask the coach".
// Audit 3: closed during a timed mock exam (H3); a daily AI budget per learner (H4).
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { unitId } = body ?? {};
    if (!body?.trackId || typeof body.trackId !== "string" || !body.message || typeof body.message !== "string") {
      return badRequest("trackId and message are required");
    }
    if (unitId != null && typeof unitId !== "string") return badRequest("unitId must be a string");
    // REQ-135: length cap and storable text (a NUL used to be a 500).
    const m = textField(body.message, "message", TEXT_LIMITS.chatMessage, { required: true });
    if (!m.ok) return badRequest(m.error);
    const message = m.value;

    const user = await requireUser(req);
    const userId = user.id;
    // REQ-205 (FAIL-907): this route sends what the learner wrote to the model, so
    // the study notice that says so must have been accepted -- checked here, not
    // only in the app.
    await requireStudyNotice(userId);

    // REQ-129: the track must be visible to the caller, and a unit must be
    // visible and belong to that track (it is stored on the message and
    // named in the prompt, so a foreign unit id would leak its title).
    const track = await visibleTrack(body.trackId, userId);
    if (!track) return notFound("Track not found");
    // REQ-135: canonical (lowercase) id from here on.
    const trackId = track.id;
    if (unitId) {
      const unit = await visibleUnit(unitId, userId);
      if (!unit) return notFound("Unit not found");
      if (unit.track_id !== trackId) return badRequest("unitId does not belong to this track");
    }
    await requireAcknowledgementForTrack(trackId, userId);

    // A message id the app already sent is a retry: hand back the stored
    // reply instead of paying for another one and saving the question twice.
    // REQ-135: only for the same message on the same track; a reused id
    // with anything else is a 409.
    const clientMessageId = validClientAttemptId(body.clientMessageId);
    if (clientMessageId) {
      const stored = await findChatTurn(userId, clientMessageId);
      if (stored !== null) {
        if (!sameChatTurn(stored, trackId, message)) return conflict(new ChatIdConflictError().message);
        return ok({ reply: stored.reply, replayed: true });
      }
    }

    // Audit 3 H3: a timed mock exam in progress closes the coach until it is
    // submitted or its time runs out. Not saved, not billed.
    if (await timedMockInProgress(userId)) {
      return ok({ reply: MOCK_IN_PROGRESS_REPLY, blocked: "mock_exam_in_progress" });
    }
    // REQ-201: AI_ACCESS_MODE=granted keeps the coach to owners and invited
    // pilot accounts (a 403 { aiAccess: limited_preview }), and the global
    // daily AI ceiling pauses it for everyone but owners (a 429 { aiAccess:
    // paused }). Both return at once, without a read, when unset.
    // REQ-246: with AI_PILOT_COACH_MESSAGES_PER_DAY above 0 the first lets a
    // limited learner through, and respond() counts the message instead.
    await requireAiFeature(userId, "coach");
    await requireGlobalCeiling(userId, "coach");
    // Audit 3 H4: per-learner daily AI budget (lib/ai-budget.ts); a 429 with
    // a plain message when it is reached.
    await requireAiBudget(userId);
    // REQ-122: the coach is in Plus and Pro, pauses at the plan's monthly AI
    // cap, and Plus counts messages a day. All no-ops while billing is off.
    const tier = await requireFeature(userId, "coach", trackId); // REQ-170: the tier on this course
    await requireAiAllowance(userId, tier);

    // REQ-216 (low, FAIL-1023): one message id, one model call. The stored-reply
    // check above runs before the model call, so two copies of one message sent
    // at once (a double tap, a flaky network resending) both passed it and each
    // paid for a reply; the second insert was then thrown away. The first copy
    // now takes a claim on (learner, message id) (lib/grading-claims.ts) and the
    // others wait for its stored reply and replay it, billing nothing.
    const respond = async (): Promise<Response> => {
      try {
        await consumeRateLimit("chat_message", userId, { max: 30, windowMinutes: 10 });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }
      // Counted now, given back below if no reply is saved. REQ-246: a learner
      // the AI mode limits is counted against the pilot's daily coach count
      // (a 429 coach_limit at it) instead of the plan count, never both.
      const use = await consumeCoachMessage(userId, () => consumeAllowance(userId, "coach_message", tier));
      try {

        let unitTitle: string | undefined;
        if (unitId) {
          const rows = await query<{ title: string }>(`select title from course_units where id = $1`, [unitId]);
          unitTitle = rows[0]?.title;
        }

        // REQ-077 kept the newest turns rather than the oldest. Audit 3 H4/M4:
        // the window is now also capped by estimated tokens (~8K) and moves in
        // fixed chunks, so it stays under Haiku's 100K price tier and its cached
        // prefix survives from one call to the next (lib/chat-history.ts).
        const history = await loadChatHistory(userId, trackId);

        // REQ-100: items this learner has not answered yet are named to the model
        // (questions only, never the key), and the reply is checked before it is
        // saved or sent (lib/coach-guard.ts). REQ-112 (f): every open item kind
        // comes from that one function. Audit 3 H2: an item stays in play for the
        // learner's next few messages, not only the one that matched it.
        const openItems = await openItemsFor(userId, trackId, unitId ?? null);
        const ctx = await coachContextForTrack(trackId);
        // The request itself (cache order, fencing, the per-request server_note
        // after the cached history) is built in lib/chat-request.ts, shared with
        // the live eval. REQ-110: the learner profile is per call, fenced as data.
        const request = buildChatRequest({
          trackTitle: track.title,
          unitTitle,
          ctx: ctx ?? undefined,
          history,
          message,
          openItems,
          learnerProfile: learnerProfileBlock(await learnerProfileFor(userId, trackId)),
        });
        const { reply } = await guardedReply(
          (extraNote) =>
            callClaude({
              system: request.system,
              messages: request.messages(extraNote),
              maxTokens: 1200,
              model: getFastModel(),
              effort: "low",
              thinking: "off",
              purpose: "chat",
              userId,
            }),
          openItems,
          request.inPlay,
          { judge: haikuLeakJudge(userId) }
        );

        // If a request with the same id finished while this one waited on
        // Anthropic, the unique index rejects this insert and the stored reply wins.
        const saved = await saveChatTurn({ userId, trackId, unitId, message, reply, clientMessageId });
        if (saved.replayed) await use.release(); // the first copy was counted
        // REQ-187 (R12): a coach reply agreeing that a graded answer was marked
        // wrongly flags that item as a suspect key (lib/chat-dispute.ts). After
        // the response; only on a dispute message.
        if (!saved.replayed) {
          inBackground(async () => {
            const d = await flagChatDisputes({ userId, trackId, message, reply });
            await Promise.all(d.rechecks);
          });
        }
        return ok(saved.replayed ? { reply: saved.reply, replayed: true } : { reply });
      } catch (err) {
        await use.release();
        throw err;
      }
    };
    if (!clientMessageId) return await respond();
    return await withGradingClaim<Response>(userId, `chat:${clientMessageId}`, respond, async () => {
      const stored = await findChatTurn(userId, clientMessageId);
      if (stored === null) return null;
      if (!sameChatTurn(stored, trackId, message)) throw new ChatIdConflictError();
      return ok({ reply: stored.reply, replayed: true });
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof ChatIdConflictError) return conflict(err.message);
    if (err instanceof GradingInProgressError) return conflict("Your message is still being answered. Try again in a moment.");
    if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
    return serverError(err);
  }
}

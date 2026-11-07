import { query } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, forbidden, serverError } from "@/lib/http";
import { callClaude, getFastModel, type ChatTurn } from "@/lib/anthropic";
import { chatSystemPrompt } from "@/lib/prompts";
import { findChatReply, saveChatTurn } from "@/lib/chat-store";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleTrack, visibleUnit } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForTrack,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForTrack } from "@/lib/coach-context";
import { fenceLearnerText, guardedReply, matchOpenItems, openItemsBlock, openItemsFor } from "@/lib/coach-guard";

export const dynamic = "force-dynamic";

// GET /api/chat?trackId=... — full chat history for a track (newest last).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    if (!trackId) return badRequest("trackId query param is required");
    const user = await requireUser(req);
    await requireAcknowledgementForTrack(trackId, user.id);
    const rows = await query(
      `select * from chat_messages where user_id = $1 and track_id = $2 order by created_at asc`,
      [user.id, trackId]
    );
    return ok({ messages: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/chat — send one user message, get back Claude's reply. Persists both turns.
// Body: { trackId, unitId?, message, clientMessageId? }
// clientMessageId: one id per message, reused by the app when it retries. A repeat returns
// the stored reply without calling Anthropic or saving the message again.
// The whole prior thread for this track is sent back to Claude as conversation history
// (capped to the most recent 40 messages) so it's a genuinely multi-turn "ask the coach" —
// not a single-shot Q&A that forgets earlier context.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trackId, unitId, message } = body ?? {};
    if (!trackId || typeof trackId !== "string" || !message || typeof message !== "string") {
      return badRequest("trackId and message are required");
    }
    if (unitId != null && typeof unitId !== "string") return badRequest("unitId must be a string");

    const user = await requireUser(req);
    const userId = user.id;

    // REQ-091: the track must be visible to the caller, and a unit must be
    // visible and belong to that track (it is stored on the message and
    // named in the prompt, so a foreign unit id would leak its title).
    const track = await visibleTrack(trackId, userId);
    if (!track) return notFound("Track not found");
    if (unitId) {
      const unit = await visibleUnit(unitId, userId);
      if (!unit) return notFound("Unit not found");
      if (unit.track_id !== trackId) return badRequest("unitId does not belong to this track");
    }
    await requireAcknowledgementForTrack(trackId, userId);

    // A message id the app already sent is a retry: hand back the stored
    // reply instead of paying for another one and saving the question twice.
    const clientMessageId = validClientAttemptId(body.clientMessageId);
    if (clientMessageId) {
      const stored = await findChatReply(userId, clientMessageId);
      if (stored !== null) return ok({ reply: stored, replayed: true });
    }

    try {
      await checkRateLimit("chat_message", userId, { max: 30, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("chat_message", userId);

    let unitTitle: string | undefined;
    if (unitId) {
      const rows = await query<{ title: string }>(`select title from course_units where id = $1`, [unitId]);
      unitTitle = rows[0]?.title;
    }

    // REQ-077: `order by created_at asc limit 40` kept the OLDEST 40 turns
    // and silently dropped everything recent once a thread passed 40 -- the
    // model lost the live context exactly when a conversation got going.
    // Take the newest 40, then flip back into chronological order.
    const history = await query<{ role: "user" | "assistant"; content: string }>(
      `select role, content from (
         select role, content, created_at from chat_messages
          where user_id = $1 and track_id = $2
          order by created_at desc limit 40
       ) recent
       order by created_at asc`,
      [userId, trackId]
    );

    // The history is a stable prefix (the next message appends to it), so a
    // cache breakpoint on its last turn lets the following message read it
    // from cache. The new message is not marked: it is not part of any later
    // prefix until it has a reply. The request still ends with that user turn.
    // REQ-100: every learner turn, history included, is fenced as data. The
    // wrapping is deterministic, so the cached history prefix still matches.
    const messages: ChatTurn[] = [
      ...history.map((h, i): ChatTurn => ({
        role: h.role,
        content: h.role === "user" ? fenceLearnerText(h.content) : h.content,
        ...(i === history.length - 1 ? { cacheBreakpoint: true } : {}),
      })),
      { role: "user", content: fenceLearnerText(message) },
    ];
    // REQ-100: items this learner has not answered yet are named to the model
    // (questions only, never the key), and the reply is checked against their
    // answer keys before it is saved or sent (lib/coach-guard.ts).
    const openItems = await openItemsFor(userId, trackId, unitId ?? null);
    const matched = matchOpenItems(message, openItems);
    const ctx = await coachContextForTrack(trackId);
    const system = chatSystemPrompt({
      trackTitle: track.title,
      unitTitle,
      ctx: ctx ?? undefined,
      openItems: openItemsBlock(openItems, matched),
    });
    const { reply } = await guardedReply(
      (extraNote) =>
        callClaude({
          system: extraNote ? { ...system, task: system.task + extraNote } : system,
          messages,
          maxTokens: 1200,
          model: getFastModel(),
          effort: "low",
          thinking: "off",
          purpose: "chat",
          userId,
        }),
      openItems,
      matched
    );

    // If a request with the same id finished while this one waited on
    // Anthropic, the unique index rejects this insert and the stored reply wins.
    const saved = await saveChatTurn({ userId, trackId, unitId, message, reply, clientMessageId });
    return ok(saved.replayed ? { reply: saved.reply, replayed: true } : { reply });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

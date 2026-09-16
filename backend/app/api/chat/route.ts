import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { callClaude, getFastModel, type ChatTurn } from "@/lib/anthropic";
import { chatSystemPrompt } from "@/lib/prompts";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/chat?trackId=... — full chat history for a track (newest last).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    if (!trackId) return badRequest("trackId query param is required");
    const user = await requireUser(req);
    const rows = await query(
      `select * from chat_messages where user_id = $1 and track_id = $2 order by created_at asc`,
      [user.id, trackId]
    );
    return ok({ messages: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/chat — send one user message, get back Claude's reply. Persists both turns.
// Body: { trackId, unitId?, message }
// The whole prior thread for this track is sent back to Claude as conversation history
// (capped to the most recent 40 messages) so it's a genuinely multi-turn "ask the coach" —
// not a single-shot Q&A that forgets earlier context.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trackId, unitId, message } = body ?? {};
    if (!trackId || !message) return badRequest("trackId and message are required");

    const user = await requireUser(req);
    const userId = user.id;
    const track = await queryOne<{ title: string }>(
      `select title from subject_tracks where id = $1`,
      [trackId]
    );
    if (!track) return notFound("Track not found");

    let unitTitle: string | undefined;
    if (unitId) {
      const unit = await queryOne<{ title: string }>(`select title from course_units where id = $1`, [unitId]);
      unitTitle = unit?.title;
    }

    const history = await query<{ role: "user" | "assistant"; content: string }>(
      `select role, content from chat_messages where user_id = $1 and track_id = $2
       order by created_at asc limit 40`,
      [userId, trackId]
    );

    const messages: ChatTurn[] = [...history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content: message }];
    const system = chatSystemPrompt({ trackTitle: track.title, unitTitle });
    const reply = await callClaude({ system, messages, maxTokens: 1200, model: getFastModel() });

    await query(
      `insert into chat_messages (user_id, track_id, unit_id, role, content) values
        ($1,$2,$3,'user',$4), ($1,$2,$3,'assistant',$5)`,
      [userId, trackId, unitId ?? null, message, reply]
    );

    return ok({ reply });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

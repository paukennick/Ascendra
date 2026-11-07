import { query, queryOne } from "@/lib/db";

// REQ-091: storage half of POST /api/chat, split out so the idempotency
// rules can be tested against a real database without Anthropic or HTTP.

// The reply already stored for a client message id, or null if the id is new.
// The id sits on the learner's row; the assistant row saved in the same
// statement is the first assistant row at or after it (saveChatTurn gives it
// a strictly later created_at).
export async function findChatReply(userId: string, clientMessageId: string): Promise<string | null> {
  const row = await queryOne<{ content: string }>(
    `select a.content
       from chat_messages u
       join chat_messages a
         on a.user_id = u.user_id and a.track_id = u.track_id
        and a.role = 'assistant' and a.created_at >= u.created_at
      where u.user_id = $1 and u.client_message_id = $2 and u.role = 'user'
      order by a.created_at asc
      limit 1`,
    [userId, clientMessageId]
  );
  return row?.content ?? null;
}

// Postgres unique_violation on the client-message-id index.
export function isDuplicateClientMessage(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  return e?.code === "23505" && (e.constraint ?? "").includes("client_message");
}

// Saves both turns in ONE statement (all or nothing). Returns the reply to
// send: the caller's own, or -- if another request with the same client id
// got there first -- the one already stored.
export async function saveChatTurn(input: {
  userId: string;
  trackId: string;
  unitId?: string | null;
  message: string;
  reply: string;
  clientMessageId?: string | null;
}): Promise<{ reply: string; replayed: boolean }> {
  const { userId, trackId, unitId, message, reply, clientMessageId } = input;
  try {
    // The assistant row is stamped with clock_timestamp() so it sorts after
    // the learner's row (now() is identical for every row of a statement),
    // which also keeps the thread's created_at order unambiguous.
    await query(
      `insert into chat_messages (user_id, track_id, unit_id, role, content, client_message_id, created_at) values
        ($1,$2,$3,'user',$4,$6, now()), ($1,$2,$3,'assistant',$5,null, clock_timestamp())`,
      [userId, trackId, unitId ?? null, message, reply, clientMessageId ?? null]
    );
    return { reply, replayed: false };
  } catch (err) {
    if (clientMessageId && isDuplicateClientMessage(err)) {
      const stored = await findChatReply(userId, clientMessageId);
      if (stored !== null) return { reply: stored, replayed: true };
    }
    throw err;
  }
}

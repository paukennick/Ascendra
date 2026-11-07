import { createHash, randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";

// REQ-091: storage half of POST /api/chat, split out so the idempotency
// rules can be tested against a real database without Anthropic or HTTP.

// REQ-098: the reply row's id is derived from the learner's row id, so a
// replay finds exactly the reply saved with that message. The replay used to
// take "the first assistant row at or after the learner's row", which picks
// another turn's reply when two messages on one track overlap (a slow
// insert, a lock wait). Same derivation in SQL: md5(id || ':reply')::uuid.
export function replyIdFor(userRowId: string): string {
  const h = createHash("md5").update(`${userRowId.toLowerCase()}:reply`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface StoredChatTurn {
  reply: string;
  trackId: string;
  message: string;
}

// The turn already stored for a client message id, or null if the id is new.
// Rows saved before REQ-098 have no derived reply id; for those the old
// "first assistant row at or after it" rule is the fallback.
export async function findChatTurn(userId: string, clientMessageId: string): Promise<StoredChatTurn | null> {
  const row = await queryOne<{ reply: string | null; track_id: string; message: string }>(
    `select u.track_id, u.content as message,
            coalesce(
              (select a.content from chat_messages a
                where a.id = md5(u.id::text || ':reply')::uuid and a.user_id = u.user_id),
              (select a.content from chat_messages a
                where a.user_id = u.user_id and a.track_id = u.track_id
                  and a.role = 'assistant' and a.created_at >= u.created_at
                order by a.created_at asc limit 1)
            ) as reply
       from chat_messages u
      where u.user_id = $1 and u.client_message_id = $2 and u.role = 'user'`,
    [userId, clientMessageId]
  );
  if (!row || row.reply === null) return null;
  return { reply: row.reply, trackId: row.track_id, message: row.message };
}

// Kept for callers that only need the reply text.
export async function findChatReply(userId: string, clientMessageId: string): Promise<string | null> {
  return (await findChatTurn(userId, clientMessageId))?.reply ?? null;
}

// REQ-098: a client message id names one message. Reusing it for a
// different message or another track used to return the stored reply and
// drop the new message; the route now answers 409 instead.
export class ChatIdConflictError extends Error {
  constructor() {
    super("This message id was already used for a different message.");
    this.name = "ChatIdConflictError";
  }
}

export function sameChatTurn(stored: StoredChatTurn, trackId: string, message: string): boolean {
  return stored.trackId.toLowerCase() === trackId.toLowerCase() && stored.message === message;
}

// Postgres unique_violation on the client-message-id index.
export function isDuplicateClientMessage(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  return e?.code === "23505" && (e.constraint ?? "").includes("client_message");
}

// Saves both turns in ONE statement (all or nothing). Returns the reply to
// send: the caller's own, or -- if another request with the same client id
// got there first -- the one already stored. Throws ChatIdConflictError if
// that earlier request was a different message.
export async function saveChatTurn(input: {
  userId: string;
  trackId: string;
  unitId?: string | null;
  message: string;
  reply: string;
  clientMessageId?: string | null;
}): Promise<{ reply: string; replayed: boolean }> {
  const { userId, trackId, unitId, message, reply, clientMessageId } = input;
  const userRowId = randomUUID();
  try {
    // The assistant row is stamped with clock_timestamp() so it sorts after
    // the learner's row (now() is identical for every row of a statement),
    // which also keeps the thread's created_at order unambiguous.
    await query(
      `insert into chat_messages (id, user_id, track_id, unit_id, role, content, client_message_id, created_at) values
        ($7,$1,$2,$3,'user',$4,$6, now()), ($8,$1,$2,$3,'assistant',$5,null, clock_timestamp())`,
      [userId, trackId, unitId ?? null, message, reply, clientMessageId ?? null, userRowId, replyIdFor(userRowId)]
    );
    return { reply, replayed: false };
  } catch (err) {
    if (clientMessageId && isDuplicateClientMessage(err)) {
      const stored = await findChatTurn(userId, clientMessageId);
      if (stored !== null) {
        if (!sameChatTurn(stored, trackId, message)) throw new ChatIdConflictError();
        return { reply: stored.reply, replayed: true };
      }
    }
    throw err;
  }
}

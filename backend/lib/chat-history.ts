import { query } from "@/lib/db";
import { estimateTokens } from "@/lib/ai-pricing";

// Audit 3 H4 + M4 (FAIL-293, FAIL-300): which earlier turns of a coach thread are sent back to the
// model.
//
// Before: the newest 40 messages, each up to 16,000 characters, with no size
// cap -- a thread grew to ~274K characters (~70-110K tokens) per call, past
// Haiku 5.5's 100K-token price tier (5x). And because the window slid by two
// messages every turn after the 20th exchange, the cached prefix changed on
// every call: each call paid the cache-write price and never got a read.
//
// Now:
//  - each history message is cut to MAX_MESSAGE_CHARS (a fixed cut, so the
//    same message always renders the same way and the cache still matches);
//  - the window starts on a multiple of CHUNK (counting from the thread's
//    first message), so its first message stays put for CHUNK messages and
//    the cached prefix stays the same between those calls;
//  - the start moves forward a whole CHUNK at a time until the window is at
//    most MAX_MESSAGES long and its estimated tokens are within the budget
//    (CHAT_HISTORY_TOKEN_BUDGET, default 8,000).
// Both rules only ever move the start forward as a thread grows, so the
// prefix changes once per CHUNK messages, not once per call.
//
// With MAX_MESSAGE_CHARS 3,000 (~860 tokens by the estimate) and CHUNK 8, one
// chunk is at most ~6,900 tokens, under the default budget, so the newest
// partial chunk always fits and the history is never empty for size alone.

export const MAX_MESSAGES = 40;
export const CHUNK = 8;
export const MAX_MESSAGE_CHARS = 3_000;
export const DEFAULT_HISTORY_TOKEN_BUDGET = 8_000;
const TRIM_NOTE = " [...trimmed]";

export function historyTokenBudget(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.CHAT_HISTORY_TOKEN_BUDGET);
  return Number.isFinite(n) && n >= 1_000 ? Math.floor(n) : DEFAULT_HISTORY_TOKEN_BUDGET;
}

export interface NumberedMessage {
  n: number; // 0-based position in the whole thread
  role: "user" | "assistant";
  content: string;
}

export function trimForHistory(content: string): string {
  if (content.length <= MAX_MESSAGE_CHARS) return content;
  let cut = content.slice(0, MAX_MESSAGE_CHARS - TRIM_NOTE.length);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut + TRIM_NOTE;
}

// Pure: the window of `recent` (the thread's newest messages, any order, each
// with its thread position) to send. `total` is the thread's message count.
export function chatHistoryWindow(
  recent: NumberedMessage[],
  total: number,
  budgetTokens = DEFAULT_HISTORY_TOKEN_BUDGET
): NumberedMessage[] {
  const byN = [...recent].sort((a, b) => a.n - b.n);
  const tokensFrom = (start: number) =>
    byN.filter((m) => m.n >= start).reduce((sum, m) => sum + estimateTokens(trimForHistory(m.content)), 0);
  let start = total <= MAX_MESSAGES ? 0 : Math.ceil((total - MAX_MESSAGES) / CHUNK) * CHUNK;
  while (start < total && tokensFrom(start) > budgetTokens) start += CHUNK;
  // Never start on an assistant turn: the request should open with the learner.
  const out = byN.filter((m) => m.n >= start).map((m) => ({ ...m, content: trimForHistory(m.content) }));
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Loads enough of the thread to apply chatHistoryWindow: the newest
// MAX_MESSAGES + CHUNK messages, numbered from the thread's first message.
export async function loadChatHistory(
  userId: string,
  trackId: string,
  budgetTokens = historyTokenBudget()
): Promise<NumberedMessage[]> {
  const rows = await query<{ n: number; role: "user" | "assistant"; content: string; total: number }>(
    `select n, role, content, total from (
       select (row_number() over (order by created_at asc, (role = 'assistant') asc, id asc) - 1)::int as n,
              (count(*) over ())::int as total, role, content
         from chat_messages
        where user_id = $1 and track_id = $2
     ) t
     order by n desc
     limit ${MAX_MESSAGES + CHUNK}`,
    [userId, trackId]
  );
  const total = rows[0]?.total ?? 0;
  return chatHistoryWindow(rows, total, budgetTokens);
}

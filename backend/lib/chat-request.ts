import type { ChatTurn } from "@/lib/anthropic";
import { chatPrompt, type SystemPrompt } from "@/lib/prompts";
import { activeOpenItems, fenceLearnerText, openItemsBlock, type OpenItem } from "@/lib/coach-guard";
import type { CoachContext } from "@/lib/coach-context";

// The coach chat request, built in one place so POST /api/chat and the live
// eval (scripts/eval/live.ts) send exactly the same thing.
//
// Cache order (Audit 3 M4): tools -> system -> messages. The stable rules
// block carries its own breakpoint (lib/anthropic.ts); the system task block
// is fixed per track and unit; a breakpoint on the last history turn lets the
// next message read system + history from cache. Every learner turn, history
// included, is fenced as data (REQ-100), deterministically, so the prefix
// matches. The per-request server_note (open items, learner profile) and the
// guard's retry note ride in the NEW user turn, after the cached history.
export interface ChatRequest {
  system: SystemPrompt;
  // The messages for one call; extraNote is the guard's retry note ("" first).
  messages(extraNote: string): ChatTurn[];
  // Items in play this turn (asked about now or in the last few messages).
  inPlay: OpenItem[];
}

export function buildChatRequest(params: {
  trackTitle: string;
  unitTitle?: string;
  ctx?: CoachContext;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  openItems: OpenItem[];
  learnerProfile?: string;
}): ChatRequest {
  const recentLearner = params.history.filter((h) => h.role === "user").map((h) => h.content);
  const inPlay = activeOpenItems(params.message, recentLearner, params.openItems);
  const { system, turnNote } = chatPrompt({
    trackTitle: params.trackTitle,
    unitTitle: params.unitTitle,
    ctx: params.ctx,
    openItems: openItemsBlock(params.openItems, inPlay),
    learnerProfile: params.learnerProfile,
  });
  const prior: ChatTurn[] = params.history.map((h, i): ChatTurn => ({
    role: h.role,
    content: h.role === "user" ? fenceLearnerText(h.content) : h.content,
    ...(i === params.history.length - 1 ? { cacheBreakpoint: true } : {}),
  }));
  return {
    system,
    inPlay,
    messages(extraNote: string) {
      const note = extraNote ? `<server_note>\n${extraNote.trim()}\n</server_note>\n` : "";
      return [...prior, { role: "user", content: `${turnNote}${note}${fenceLearnerText(params.message)}` }];
    },
  };
}

// REQ-201: AI access modes on the phone -- the pure parts, so they run under
// node --test. The server decides everything: GET /api/auth/me carries
// `ai: { mode, full }` when the server limits AI to invited pilot learners
// (no `ai` at all in the default mode, which means full AI as before), and a
// refused AI request carries `aiAccess: { state, feature, ... }`.
//
// Nothing here offers a plan or a price: these show while billing is off.

export type AiAccessMode = "all" | "granted" | "paid";
export type AiAccessState = "limited_preview" | "graded_limit" | "paused" | "preparing";

export interface AiAccessInfo {
  mode: AiAccessMode;
  full: boolean;
}

// From user.ai. Anything missing or malformed is "full AI" (an older server,
// or the default mode): the server still refuses what it must.
export function parseAiAccess(v: unknown): AiAccessInfo | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (a.mode !== "all" && a.mode !== "granted" && a.mode !== "paid") return null;
  return { mode: a.mode, full: a.full !== false };
}

// Whether the coach and new lesson versions are open to this learner.
export function hasFullAi(user: { ai?: unknown } | null | undefined): boolean {
  const a = parseAiAccess(user?.ai);
  return a === null || a.full;
}

export interface AiAccessSignal {
  state: AiAccessState;
  feature: string;
  message: string;
  resetsAt: string | null;
  limit: number | null;
}

// From a thrown ApiError (status + data) or a status/body pair.
export function aiAccessSignal(status: number, data: unknown): AiAccessSignal | null {
  if (status !== 403 && status !== 429) return null;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, any>;
  const a = d.aiAccess;
  if (!a || typeof a !== "object") return null;
  if (!["limited_preview", "graded_limit", "paused", "preparing"].includes(a.state)) return null;
  return {
    state: a.state,
    feature: typeof a.feature === "string" ? a.feature : "",
    message: typeof d.error === "string" ? d.error : "",
    resetsAt: typeof a.resetsAt === "string" ? a.resetsAt : null,
    limit: typeof a.limit === "number" ? a.limit : null,
  };
}

export function aiAccessSignalOf(err: unknown): AiAccessSignal | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { status?: unknown; data?: unknown };
  return typeof e.status === "number" ? aiAccessSignal(e.status, e.data) : null;
}

// What the coach screen shows instead of the message box.
export const COACH_PREVIEW_TITLE = "The AI coach is in limited preview";
export const COACH_PREVIEW_BODY =
  "It's open to invited pilot learners for now. Your lessons, practice, review and every course keep working as usual, and Quiz me is still here.";

// What the lesson's Done screen shows instead of "Regenerate lesson".
export const REGENERATE_PREVIEW_NOTE =
  "New lesson versions are in limited preview, open to invited pilot learners for now. This lesson and everything else keep working.";

// The words for a refused AI request: the server's own (written for
// learners) when it sent some, else a calm fallback per state.
export function aiAccessMessage(s: AiAccessSignal): string {
  if (s.message.trim()) return s.message;
  switch (s.state) {
    case "limited_preview":
      return s.feature === "coach" ? `${COACH_PREVIEW_TITLE}.` : REGENERATE_PREVIEW_NOTE;
    case "graded_limit":
      return "You've used today's AI-graded typed answers. More open up tomorrow; multiple choice and review keep working.";
    case "paused":
      return "The AI coach and new lesson versions are paused for today. Everything else keeps working.";
    case "preparing":
      return "This lesson is being prepared. Please try again later.";
  }
}

// Unsent text used to live only in React state, so leaving the chat or the
// support form (sidebar, back, a crash) threw it away. This is the pure half
// of keeping it on the device: storage keys, the envelope that carries a
// timestamp, and the rules for whether a stored draft may be restored. The
// screens (and src/lib/useStoredDraft.ts) do the reads and writes.
//
// REQ-131: a draft is device-local, per user (two accounts on one device
// never see each other's text) and per thread (a course for chat, a request
// kind for support).

// Same reasoning as lesson snapshots: after a week the half-written text is
// more likely clutter than intent, and it keeps storage from accumulating.
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Bounds applied when reading, so a corrupted or tampered entry can't push
// an enormous string into a text field. They match the form's maxLength.
export const CHAT_DRAFT_MAX = 10_000;
// REQ-197: what a restored draft may hold. Larger than the send limit, so a
// dictated message that ran over is kept whole for the learner to shorten,
// never cut; still bounded against a corrupted entry.
export const CHAT_DRAFT_KEEP_MAX = 4 * CHAT_DRAFT_MAX;
export const SUPPORT_LIMITS = { subject: 200, body: 5000, courseName: 200, courseSourceUrl: 2000 } as const;

export type SupportDraftKind = "ticket" | "course_request";

export function chatDraftKey(userId: string, trackId: string): string {
  return `ascendra.draft.chat.${userId}.${trackId}`;
}

export function supportDraftKey(userId: string, kind: SupportDraftKind): string {
  return `ascendra.draft.support.${userId}.${kind}`;
}

// The PBQ simulator reuses the same envelope and write path.
export function pbqDraftKey(userId: string, unitId: string): string {
  return `ascendra.pbqProgress.${userId}.${unitId}`;
}

// `payload` is whatever string the screen wants back later; the timestamp
// is added here, at write time, so the payload itself stays stable between
// renders (a changing timestamp would look like an edit on every render).
export function encodeDraft(payload: string, now: number): string {
  return JSON.stringify({ v: 1, savedAt: now, payload });
}

// Returns the payload only if the entry is well-formed and fresh.
export function decodeDraft(raw: unknown, now: number): string | null {
  if (typeof raw !== "string") return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.v !== 1 || typeof r.payload !== "string" || typeof r.savedAt !== "number") return null;
  if (now - r.savedAt > DRAFT_MAX_AGE_MS || r.savedAt > now + 60_000) return null;
  return r.payload;
}

// null means "nothing worth keeping", which clears the stored draft. Text
// that is only the prefill the screen opened with isn't the learner's own
// words, so it is not kept either (it would reappear on the next visit).
export function chatDraftPayload(text: string, prefill?: string | null): string | null {
  if (!text.trim()) return null;
  if (prefill && text === prefill) return null;
  return text;
}

export function chatDraftText(payload: string): string | null {
  const t = payload.slice(0, CHAT_DRAFT_KEEP_MAX);
  return t.trim() ? t : null;
}

export interface SupportFields {
  subject: string;
  body: string;
  courseName: string;
  courseSourceUrl: string;
}

export function emptySupportFields(): SupportFields {
  return { subject: "", body: "", courseName: "", courseSourceUrl: "" };
}

export function supportDraftPayload(fields: SupportFields): string | null {
  const blank = !fields.subject.trim() && !fields.body.trim() && !fields.courseName.trim() && !fields.courseSourceUrl.trim();
  return blank ? null : JSON.stringify(fields);
}

// The support form's `kind` URL param, if it names a form. Anything else
// (missing, an array, a typo) leaves the form as it is.
export function supportKindFromParam(param: unknown): SupportDraftKind | null {
  return param === "ticket" || param === "course_request" ? param : null;
}

// The support form is emptied before it is sent, so leaving mid-request
// can't leave a draft of a ticket that was in fact sent (FAIL-066). If the
// send fails, what was sent comes back -- unless the learner has already
// started typing something new, which wins.
export function supportFieldsAfterFailedSend(current: SupportFields, sent: SupportFields): SupportFields {
  return supportDraftPayload(current) === null ? sent : current;
}

export function parseSupportFields(payload: string): SupportFields | null {
  let o: unknown;
  try {
    o = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const pick = (k: keyof SupportFields) => (typeof r[k] === "string" ? (r[k] as string).slice(0, SUPPORT_LIMITS[k]) : "");
  const fields: SupportFields = {
    subject: pick("subject"),
    body: pick("body"),
    courseName: pick("courseName"),
    courseSourceUrl: pick("courseSourceUrl"),
  };
  return supportDraftPayload(fields) === null ? null : fields;
}

// REQ-113 (Audit 3 mobile M3): typed answers on the review session, the unit
// check and explain-back lived only in React state, so leaving the screen or
// Android killing the app in the background lost them (explain-back allows
// 4000 characters). They now use the same envelope and write path, under the
// draft key shape the logout sweep already removes (src/lib/localData.ts):
//   ascendra.draft.<thread>.<userId>.<id>
// The id of an answer already sent goes with the text, so a resend after the
// app was killed mid-request is replayed by the server, not graded twice.
export type AnswerDraftThread = "review" | "unitcheck" | "explain";

export function answerDraftKey(thread: AnswerDraftThread, userId: string, id: string): string {
  // Dots would split the key into extra segments; ids are UUIDs, positions numbers.
  return `ascendra.draft.${thread}.${userId}.${id.replace(/\./g, "_")}`;
}

// REQ-206 (FAIL-939): the "Dispute or ask about this verdict" text lived only
// in React state, so a reload after a long message lost it. Same envelope, and
// the same key shape the logout sweep removes. One per objective and check.
export function followUpDraftKey(userId: string, objectiveId: string, kind: string): string {
  return `ascendra.draft.followup.${userId}.${`${objectiveId}_${kind}`.replace(/\./g, "_")}`;
}

// REQ-206 (FAIL-939): the guess typed before a lesson is taught. The lesson
// position is not saved at "guess" (nothing to resume), so a reload emptied
// the box. The text itself is now kept, per objective.
export function guessDraftKey(userId: string, objectiveId: string): string {
  return `ascendra.draft.guess.${userId}.${objectiveId.replace(/\./g, "_")}`;
}

// REQ-217 (FAIL-1050): the written reasoning a learner is typing in a
// simulation, kept on the device (same envelope; the logout sweep removes it).
// One per run and moment; cleared once the answer is graded.
export function reasoningDraftKey(userId: string, runId: string, momentId: string): string {
  return `ascendra.draft.simreason.${userId}.${`${runId}_${momentId}`.replace(/\./g, "_")}`;
}

export interface AnswerDraft {
  text: string;
  // clientAttemptId sent with `sentText`, reused if that same text is resent.
  sentId: string | null;
  sentText: string | null;
}

export const ANSWER_DRAFT_MAX = 20_000;

export function answerDraftPayload(d: AnswerDraft): string | null {
  if (!d.text.trim() && !d.sentId) return null;
  return JSON.stringify({ text: d.text, sentId: d.sentId, sentText: d.sentText });
}

export function parseAnswerDraft(payload: string | null): AnswerDraft | null {
  if (!payload) return null;
  try {
    const o = JSON.parse(payload) as Record<string, unknown>;
    if (!o || typeof o.text !== "string") return null;
    const sentId = typeof o.sentId === "string" && o.sentId.length <= 64 ? o.sentId : null;
    return {
      text: o.text.slice(0, ANSWER_DRAFT_MAX),
      sentId,
      sentText: sentId && typeof o.sentText === "string" ? o.sentText.slice(0, ANSWER_DRAFT_MAX) : null,
    };
  } catch {
    return null;
  }
}

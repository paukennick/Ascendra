// REQ-253: the pure half of the "Key terms" button (src/components/KeyTerms.tsx):
// what the server sends, the copy kept on the device so the terms open
// offline once loaded, which view the sheet shows, and the words a screen
// reader speaks. No React here, so it is unit tested (keyTerms.test.ts).
//
// Device copy: ascendra.keyTerms.<userId>.<objectiveId>, per user like every
// other key in src/lib/localData.ts, so "Log out" sweeps it.

export interface KeyTerm {
  term: string;
  plain: string;
  example: string;
  examWording: string;
}

export interface KeyTermsPrimer {
  objectiveId: string;
  terms: KeyTerm[];
  generatedAt: string | null;
  // The lesson the terms were written from. A new value means the lesson changed.
  lessonHash: string;
}

export const KEY_TERMS_PREFIX = "ascendra.keyTerms.";

export function keyTermsStorageKey(userId: string, objectiveId: string): string {
  return `${KEY_TERMS_PREFIX}${userId}.${objectiveId}`;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// GET /api/objectives/:id/primer's `primer`, checked. null when unusable.
export function parsePrimer(data: unknown): KeyTermsPrimer | null {
  const p = (data && typeof data === "object" && "primer" in data ? (data as { primer: unknown }).primer : data) as Record<string, unknown> | null;
  if (!p || typeof p !== "object") return null;
  const terms = Array.isArray(p.terms)
    ? p.terms
        .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
        .map((t) => ({ term: str(t.term), plain: str(t.plain), example: str(t.example), examWording: str(t.examWording) }))
        .filter((t) => t.term && t.plain)
    : [];
  if (!terms.length || !str(p.objectiveId) || !str(p.lessonHash)) return null;
  return { objectiveId: str(p.objectiveId), terms, generatedAt: str(p.generatedAt) || null, lessonHash: str(p.lessonHash) };
}

// The device copy: a version so a later shape can be told apart.
export function serializeCached(primer: KeyTermsPrimer): string {
  return JSON.stringify({ v: 1, primer });
}

export function parseCached(raw: string | null, objectiveId: string): KeyTermsPrimer | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { v?: unknown; primer?: unknown };
    if (o?.v !== 1) return null;
    const p = parsePrimer(o.primer);
    return p && p.objectiveId === objectiveId ? p : null;
  } catch {
    return null;
  }
}

// What the sheet shows.
export type KeyTermsView =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; primer: KeyTermsPrimer; offline: boolean };

export interface KeyTermsState {
  cached: KeyTermsPrimer | null;
  fresh: KeyTermsPrimer | null;
  loading: boolean;
  error: string | null;
}

export const INITIAL_KEY_TERMS: KeyTermsState = { cached: null, fresh: null, loading: false, error: null };

// The server's copy wins; the device copy is shown while it loads and, when
// the request fails (offline, a 5xx), instead of an error, marked offline.
// With neither: loading, then the error with a retry.
export function keyTermsView(s: KeyTermsState): KeyTermsView {
  if (s.fresh) return { kind: "ready", primer: s.fresh, offline: false };
  if (s.cached) return { kind: "ready", primer: s.cached, offline: !!s.error };
  if (s.error && !s.loading) return { kind: "error", message: s.error };
  return { kind: "loading" };
}

export const KEY_TERMS_LABEL = "Key terms";
export const KEY_TERMS_HINT = "Opens a list of the words this lesson uses, each explained in plain language.";
export const KEY_TERMS_LOADING = "Preparing the key terms (first time only)...";
export const KEY_TERMS_OFFLINE = "Showing the copy saved on this device.";
export const KEY_TERMS_EMPTY_ERROR = "We couldn't load the key terms. Check your connection and try again.";

// One term, as a screen reader hears it (the card is one accessible element).
export function termA11yLabel(t: KeyTerm): string {
  const parts = [`${t.term}.`, t.plain, t.example ? `Example: ${t.example}` : "", t.examWording ? `On the exam: ${t.examWording}` : ""];
  return parts.filter(Boolean).join(" ");
}

export function sheetTitleA11y(count: number): string {
  return `Key terms, ${count} ${count === 1 ? "term" : "terms"}`;
}

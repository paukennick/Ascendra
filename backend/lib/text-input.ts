// REQ-098: bounds and well-formedness for text that learners send.
//
// Postgres refuses two things a JSON body can carry: a NUL character
// (U+0000, rejected in text and jsonb) and a lone UTF-16 surrogate (half of
// an emoji, rejected when the string is encoded). Either one used to reach
// an INSERT and come back as a 500. Truncating with slice() can create a
// lone surrogate on its own, by cutting an emoji in half at the limit.
//
// Request fields that a person typed are rejected with a 400 when they
// carry either character or run past their cap (textField). Text that is
// stored as a best-effort snapshot -- the saved lesson position -- is
// cleaned instead (cleanText), so one stray character cannot stop the
// position from saving.

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const LONE_SURROGATE_G = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function hasUnstorableText(s: string): boolean {
  return s.includes("\u0000") || LONE_SURROGATE.test(s);
}

// Caps for request text fields. Generous for a person typing, small enough
// that one request can't carry megabytes into the database and the model
// prompt. The mobile app caps its inputs below these (lesson free response
// 4000, chat drafts 10,000, PBQ answers 20,000).
export const TEXT_LIMITS = {
  question: 8_000,
  answer: 8_000,
  taughtText: 30_000,
  chatMessage: 16_000,
  pbqAnswer: 20_000,
  why: 4_000,
  stage: 50,
} as const;

export type TextCheck = { ok: true; value: string } | { ok: false; error: string };

// A required or optional string field: right type, within `max`, no NUL or
// lone surrogate. Returns the error message the route answers 400 with.
export function textField(
  value: unknown,
  name: string,
  max: number,
  opts: { required?: boolean } = {}
): TextCheck {
  if (value === undefined || value === null || value === "") {
    return opts.required ? { ok: false, error: `${name} is required` } : { ok: true, value: "" };
  }
  if (typeof value !== "string") return { ok: false, error: `${name} must be a string` };
  if (value.length > max) return { ok: false, error: `${name} is too long (max ${max} characters)` };
  if (hasUnstorableText(value)) return { ok: false, error: `${name} contains characters that can't be stored` };
  return { ok: true, value };
}

// Truncate to `max` UTF-16 units without splitting a surrogate pair, drop
// NUL characters, and replace any remaining lone surrogate with U+FFFD.
export function cleanText(s: string, max: number): string {
  let out = s.includes("\u0000") ? s.replace(/\u0000/g, "") : s;
  if (out.length > max) {
    out = out.slice(0, max);
    const last = out.charCodeAt(out.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  }
  return out.replace(LONE_SURROGATE_G, "�");
}

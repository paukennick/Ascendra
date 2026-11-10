import { reportError } from "@/lib/error-tracker";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isTransientModelFailure, MODEL_UNAVAILABLE } from "@/lib/ai-calls";
import { EmailSendError, logEmailFailure } from "@/lib/email-errors";

// REQ-191: an authenticated action whose mail did not go out (a sign-in
// code, an email-change confirmation) says so instead of "check your email".
export const EMAIL_NOT_SENT = "We couldn't send the email just now. Try again in a few minutes.";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

// Authenticated, but not allowed to do this yet -- currently a course whose
// disclaimer the user hasn't accepted. Distinct from 401 so the client can
// tell "sign in" apart from "accept the disclaimer first".
export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message, acknowledgementRequired: true }, { status: 403 });
}

// The request conflicts with what is already recorded: a second revision of
// the same answer (REQ-105), or an idempotency id reused for a different
// submission (REQ-135).
export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function tooManyRequests(message = "Too many requests") {
  return NextResponse.json({ error: message }, { status: 429 });
}

// A failure whose message was written for the learner and is safe to show
// (for example "Lesson generation is taking longer than expected"). Every
// other error is treated as internal: see serverError.
// REQ-122: `extra` is merged into the JSON body (for example the plan a
// feature needs, or when an allowance resets) so the app can act on it.
export class UserFacingError extends Error {
  constructor(message: string, readonly status = 503, readonly extra?: Record<string, unknown>) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_SERVER_ERROR = "Something went wrong on our side. Please try again.";
export const INVALID_JSON = "The request body must be valid JSON.";
export const INVALID_INPUT = "Some of the request's input isn't valid.";

// REQ-116 (audit 3): the shared JSON-body parser. `await req.json()` throws
// a SyntaxError on a malformed or empty body, which every route reported
// as a 500. This answers 400 through serverError instead.
export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw new UserFacingError(INVALID_JSON, 400);
  }
}

// REQ-116: Postgres errors that can only come from what the client sent --
// a path or query id that isn't a UUID (22P02), a NUL or other character
// the database can't store (22021, 22P05), a number out of range (22003).
// They were 500s on 60 route and input combinations (audit 3 sweep). They
// are still logged, under the request id, in case one ever comes from our
// own code.
// 22001 is a value longer than its varchar column.
const CLIENT_INPUT_PG_CODES = new Set(["22P02", "22021", "22P05", "22003", "22001"]);

// Audit 2 (REQ-135): this used to send err.message to the client. That is
// Postgres text (constraint names, "invalid input syntax for type uuid",
// and on the unauthenticated /api/health a connection failure that can name
// the database host or pooler user). The detail is now logged server-side
// under a request id, and the client gets a generic message plus that id
// so a support request can be matched to the log line.
export function serverError(err: unknown) {
  const requestId = randomUUID();
  if (err instanceof UserFacingError) {
    return NextResponse.json({ ...(err.extra ?? {}), error: err.message, requestId }, { status: err.status });
  }
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string" && CLIENT_INPUT_PG_CODES.has(code)) {
    // eslint-disable-next-line no-console
    console.error(`[request ${requestId}] client input refused by the database`, code);
    return NextResponse.json({ error: INVALID_INPUT, requestId }, { status: 400 });
  }
  if (err instanceof EmailSendError) {
    logEmailFailure(`request ${requestId}`, err);
    // FAIL-884: a 409, not a 503: the app hides a 5xx's message behind
    // "something went wrong on our side", so the learner never read this.
    return NextResponse.json({ error: EMAIL_NOT_SENT, requestId, retryable: true }, { status: 409 });
  }
  if (isTransientModelFailure(err)) {
    // eslint-disable-next-line no-console
    console.warn(`[request ${requestId}] model failure:`, (err as Error)?.message?.slice(0, 300));
    return NextResponse.json({ error: MODEL_UNAVAILABLE, requestId, retryable: true }, { status: 503 });
  }
  // eslint-disable-next-line no-console
  console.error(`[request ${requestId}]`, err);
  // REQ-118: and to the error tracker when one is configured (no-op otherwise).
  reportError(err, { requestId });
  return NextResponse.json({ error: GENERIC_SERVER_ERROR, requestId }, { status: 500 });
}

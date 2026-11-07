import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isTransientModelFailure, MODEL_UNAVAILABLE } from "@/lib/ai-calls";

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
// submission (REQ-098).
export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function tooManyRequests(message = "Too many requests") {
  return NextResponse.json({ error: message }, { status: 429 });
}

// A failure whose message was written for the learner and is safe to show
// (for example "Lesson generation is taking longer than expected"). Every
// other error is treated as internal: see serverError.
export class UserFacingError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_SERVER_ERROR = "Something went wrong on our side. Please try again.";

// Audit 2 (REQ-098): this used to send err.message to the client. That is
// Postgres text (constraint names, "invalid input syntax for type uuid",
// and on the unauthenticated /api/health a connection failure that can name
// the database host or pooler user). The detail is now logged server-side
// under a request id, and the client gets a generic message plus that id
// so a support request can be matched to the log line.
export function serverError(err: unknown) {
  const requestId = randomUUID();
  if (err instanceof UserFacingError) {
    return NextResponse.json({ error: err.message, requestId }, { status: err.status });
  }
  if (isTransientModelFailure(err)) {
    // eslint-disable-next-line no-console
    console.warn(`[request ${requestId}] model failure:`, (err as Error)?.message?.slice(0, 300));
    return NextResponse.json({ error: MODEL_UNAVAILABLE, requestId, retryable: true }, { status: 503 });
  }
  // eslint-disable-next-line no-console
  console.error(`[request ${requestId}]`, err);
  return NextResponse.json({ error: GENERIC_SERVER_ERROR, requestId }, { status: 500 });
}

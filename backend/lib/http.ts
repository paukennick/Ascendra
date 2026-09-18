import { NextResponse } from "next/server";

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

export function tooManyRequests(message = "Too many requests") {
  return NextResponse.json({ error: message }, { status: 429 });
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(err);
  return NextResponse.json({ error: message }, { status: 500 });
}

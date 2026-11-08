import { GradingInProgressError } from "@/lib/grading-claims";
import { NextResponse } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/http";
import { AuthError } from "@/lib/auth/requireUser";
import { AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { ReviewError } from "@/lib/review-service";
import { isUuid } from "@/lib/visibility";

// REQ-108: shared error mapping for the review-loop routes.
export function reviewRouteError(err: unknown) {
  if (err instanceof AuthError) return unauthorized(err.message);
  if (err instanceof AcknowledgementError) return forbidden(err.message);
  if (err instanceof ReviewError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof GradingInProgressError) return NextResponse.json({ error: err.message }, { status: 409 });
  return serverError(err);
}

// trackId query/body value: absent -> null (every course); anything else
// must be a UUID.
export function optionalTrackId(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  return isUuid(v) ? v : undefined;
}

export function positionOf(v: string): number | null {
  return /^\d{1,3}$/.test(v) ? Number(v) : null;
}

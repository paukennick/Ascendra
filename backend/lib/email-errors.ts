// REQ-191: mail that was not sent must not look like mail that was.
//
// Resend's SDK reports a refused send in its result ({ data, error }) rather
// than by throwing, and lib/email.ts used to ignore that result, so routes
// said "check your email" when nothing left. Every send now throws
// EmailSendError instead. It carries only which template failed and
// Resend's error code and status: never the address, the token or Resend's
// message text (for the resend.dev 403 that text names the account
// owner's address).

export type EmailKind =
  | "verification"
  | "verification_set_password"
  | "password_reset"
  | "email_change_confirmation"
  | "email_change_requested_alert"
  | "already_registered"
  | "mfa_code"
  | "mfa_disable_confirmation"
  | "support_notification"
  | "security_alert"
  | "ai_ceiling_notice"
  | "underage_review_notice"
  // REQ-197: service emails (lib/service-emails.ts).
  | "exam_change"
  | "exam_countdown"
  | "weekly_digest";

export class EmailSendError extends Error {
  readonly kind: EmailKind;
  readonly code: string;
  readonly statusCode: number | null;

  constructor(kind: EmailKind, code: string, statusCode: number | null) {
    super(`Email "${kind}" was not sent (${code}${statusCode ? ` ${statusCode}` : ""})`);
    this.name = "EmailSendError";
    this.kind = kind;
    this.code = code;
    this.statusCode = statusCode;
  }
}

// One JSON line per failure so it can be found in Vercel's logs by
// event name. No address, token or provider message.
export function emailFailureLog(route: string, err: unknown): Record<string, unknown> {
  if (err instanceof EmailSendError) {
    return { event: "email_send_failed", route, kind: err.kind, code: err.code, statusCode: err.statusCode };
  }
  return { event: "email_send_failed", route, kind: "unknown", code: "unexpected", errorName: (err as Error)?.name ?? typeof err };
}

export function logEmailFailure(route: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(emailFailureLog(route, err)));
}

// For best-effort sends: `.catch(emailFailureHandler("change-password"))`.
export function emailFailureHandler(route: string): (err: unknown) => void {
  return (err) => logEmailFailure(route, err);
}

// REQ-191: what /api/health reports about the sender. In production,
// a missing EMAIL_FROM falls back to onboarding@resend.dev, which Resend
// only delivers to the Resend account's own address, so real users get
// nothing. Outside production the test sender is fine.
export function emailSenderStatus(env: Record<string, string | undefined> = process.env): "ok" | "unconfigured" {
  if (env.NODE_ENV !== "production") return "ok";
  const from = (env.EMAIL_FROM ?? "").trim();
  if (!from) return "unconfigured";
  if (/@resend\.dev>?$/i.test(from)) return "unconfigured";
  return "ok";
}

export const EMAIL_UNCONFIGURED_WARNING =
  "EMAIL_FROM is not set to a verified domain: mail goes out from onboarding@resend.dev, which Resend delivers only to the Resend account's own address. Verification, reset and MFA mail is not reaching users (docs/operations-runbook.md, \"Email sender\").";

import { Resend } from "resend";
import { EmailSendError, type EmailKind } from "./email-errors";

export { EmailSendError } from "./email-errors";

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set. Add it in Vercel project env vars (or .env.local for local dev) — see backend/.env.example. Create a key at https://resend.com/api-keys"
      );
    }
    client = new Resend(apiKey);
  }
  return client;
}

export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}
export interface EmailSendResult {
  error: { name: string; statusCode: number | null } | null;
}
type Transport = (payload: EmailPayload) => Promise<EmailSendResult>;

// REQ-191: tests capture mail here instead of stubbing fetch; production
// always uses Resend.
let testTransport: Transport | null = null;
export function __setEmailTransportForTest(next: Transport | null): void {
  testTransport = next;
}

// REQ-191: Resend returns { data, error } and does not throw on a refused
// send (bad sender, unverified domain, quota), so the result is checked
// here and every failure becomes an EmailSendError (lib/email-errors.ts).
async function send(kind: EmailKind, payload: EmailPayload): Promise<void> {
  let result: EmailSendResult;
  try {
    result = testTransport ? await testTransport(payload) : await getClient().emails.send(payload);
  } catch (err) {
    if (err instanceof EmailSendError) throw err;
    const notConfigured = !testTransport && !process.env.RESEND_API_KEY;
    throw new EmailSendError(kind, notConfigured ? "not_configured" : "transport_error", null);
  }
  if (result?.error) throw new EmailSendError(kind, String(result.error.name ?? "unknown"), result.error.statusCode ?? null);
}

function getFrom(): string {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

// REQ-116: `setPassword` is the link sent when someone tries to register an
// address that already has an unverified account. Following it verifies the
// address and replaces whatever password the first registrant chose.
export async function sendVerificationEmail(to: string, token: string, opts: { setPassword?: boolean } = {}): Promise<void> {
  const url = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  if (opts.setPassword) {
    await send("verification_set_password", {
      from: getFrom(),
      to,
      subject: "Finish setting up your Ascendra account",
      html: `<p>Someone started an Ascendra account with this email address but never confirmed it. If that was you, or you want this account, follow the link: it confirms the address and lets you choose a new password. Any password set before is removed.</p><p><a href="${url}">Confirm and choose a password</a></p><p>This link expires in 24 hours. If you didn't ask for this, ignore this email.</p>`,
    });
    return;
  }
  await send("verification", {
    from: getFrom(),
    to,
    subject: "Verify your Ascendra account",
    html: `<p>Confirm your email to finish creating your Ascendra account.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours. If you didn't request this, ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await send("password_reset", {
    from: getFrom(),
    to,
    subject: "Reset your Ascendra password",
    html: `<p>Someone (hopefully you) requested a password reset.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>`,
  });
}

export async function sendEmailChangeConfirmation(newEmail: string, token: string): Promise<void> {
  const url = `${getAppBaseUrl()}/confirm-email-change?token=${encodeURIComponent(token)}`;
  await send("email_change_confirmation", {
    from: getFrom(),
    to: newEmail,
    subject: "Confirm your new Ascendra email address",
    html: `<p>Confirm this is your new email address for Ascendra.</p><p><a href="${url}">Confirm email change</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your address won't change.</p>`,
  });
}

// REQ-116: registration with an address that already has a verified
// account no longer says so on screen (that told anyone which addresses are
// registered); the owner is told here instead.
export async function sendAlreadyRegisteredEmail(to: string): Promise<void> {
  await send("already_registered", {
    from: getFrom(),
    to,
    subject: "You already have an Ascendra account",
    html: `<p>Someone tried to create an Ascendra account with this email address, but it already has one. If that was you, just log in. Forgot your password? Use "Forgot password" on the login screen.</p><p>If it wasn't you, you don't need to do anything. Nothing about your account changed.</p>`,
  });
}

// REQ-116 (audit 3, finding 1): sent to the CURRENT address as soon as an
// email change is requested, before anything changes, with a link that
// cancels it and signs out every device.
export async function sendEmailChangeRequestedAlert(oldEmail: string, newEmail: string, cancelToken: string): Promise<void> {
  const url = `${getAppBaseUrl()}/cancel-email-change?token=${encodeURIComponent(cancelToken)}`;
  await send("email_change_requested_alert", {
    from: getFrom(),
    to: oldEmail,
    subject: "Someone asked to change your Ascendra email address",
    html: `<p>A request was just made to change your account's email address to <strong>${escapeHtml(newEmail)}</strong>. Nothing changes until that address confirms it.</p><p>If this wasn't you, <a href="${url}">cancel the change and sign out every device</a>, then change your password.</p><p>If it was you, there's nothing to do.</p>`,
  });
}

export async function sendMfaEmailCode(to: string, code: string): Promise<void> {
  await send("mfa_code", {
    from: getFrom(),
    to,
    subject: `${code} is your Ascendra verification code`,
    html: `<p>Your Ascendra sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function sendMfaDisableConfirmationEmail(to: string, code: string, methodLabel: string): Promise<void> {
  await send("mfa_disable_confirmation", {
    from: getFrom(),
    to,
    subject: `${code} — confirm turning off ${methodLabel}`,
    html: `<p>Someone (hopefully you) is turning off <strong>${methodLabel}</strong> as a sign-in step on your Ascendra account. This is the last verification method on the account, so we're asking you to confirm with this code:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes. If you didn't request this, change your password immediately — someone may have access to your account.</p>`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Notifies whoever works the support queue that something new landed, so
// submissions don't sit unseen in the table. Best-effort: the request is
// already stored by the time this runs, so a mail failure must not fail the
// submission -- callers catch/ignore rejections. Falls back to EMAIL_FROM
// when SUPPORT_EMAIL isn't configured, so a missing env var means the mail
// goes somewhere reachable rather than throwing.
//
// User-supplied text is escaped: subject/body/course name come straight
// from a form field, and they're being interpolated into an HTML email.
export async function sendSupportRequestNotification(params: {
  kind: "ticket" | "course_request" | "content_report";
  subject: string;
  body: string;
  fromEmail: string;
  courseName?: string | null;
  courseSourceUrl?: string | null;
  objectiveId?: string | null;
  lessonStage?: string | null;
}): Promise<void> {
  const to = process.env.SUPPORT_EMAIL || getFrom();
  const label =
    params.kind === "course_request" ? "Course request" : params.kind === "content_report" ? "Content report" : "Support ticket";
  const rows = [
    `<p><strong>From:</strong> ${escapeHtml(params.fromEmail)}</p>`,
    params.courseName ? `<p><strong>Course:</strong> ${escapeHtml(params.courseName)}</p>` : "",
    params.courseSourceUrl ? `<p><strong>Source:</strong> ${escapeHtml(params.courseSourceUrl)}</p>` : "",
    params.objectiveId
      ? `<p><strong>Objective:</strong> ${escapeHtml(params.objectiveId)}${params.lessonStage ? ` (step: ${escapeHtml(params.lessonStage)})` : ""}</p>`
      : "",
    `<p style="white-space:pre-wrap">${escapeHtml(params.body)}</p>`,
  ].join("");
  await send("support_notification", {
    from: getFrom(),
    to,
    replyTo: params.fromEmail,
    subject: `[${label}] ${params.subject}`,
    html: rows,
  });
}

// Best-effort security notifications (new sign-in, password changed, MFA
// disabled). Never let a failure here break the action that triggered it --
// callers should catch/ignore rejections from this function.
//
// REQ-116 (audit 3): `message` is escaped. It can carry an address the
// requester typed (the email-change alert), which used to be pasted into the
// HTML as markup.
export async function sendSecurityAlertEmail(to: string, subject: string, message: string): Promise<void> {
  await send("security_alert", {
    from: getFrom(),
    to,
    subject,
    html: `<p>${escapeHtml(message)}</p><p>If this wasn't you, change your password immediately and review your active sessions in Ascendra's Account settings.</p>`,
  });
}

// REQ-144: to each owner (OWNER_EMAILS) when an unrestricted account reaches
// the AI safety ceiling (lib/account-access-config.ts). At most once a day
// per account. `accountEmail` is escaped.
export async function sendAiCeilingNotice(to: string, accountEmail: string, spentUsd: number, ceilingUsd: number): Promise<void> {
  await send("ai_ceiling_notice", {
    from: getFrom(),
    to,
    subject: "Ascendra: an unrestricted account reached the AI safety ceiling",
    html:
      `<p><strong>${escapeHtml(accountEmail)}</strong> has unrestricted access and reached the AI safety ceiling: ` +
      `US$${spentUsd.toFixed(2)} of model use in the last 24 hours (ceiling US$${ceilingUsd.toFixed(2)}).</p>` +
      `<p>The coach and new lesson versions are paused for that account until its spend over the last 24 hours drops below the ceiling. Grading and review keep working.</p>` +
      `<p>If this is unexpected, revoke the account's access in Settings &gt; Access (or <code>npm run access:grant -- --email ... --revoke</code>), and check <code>ai_calls</code>. ` +
      `The ceiling is <code>AI_UNRESTRICTED_DAILY_CEILING_USD</code>.</p>`,
  });
}

// REQ-259: to each owner (OWNER_EMAILS) when an account's date of birth, given
// to an 18+ prompt, is below the account minimum age (lib/age-confirmation.ts),
// so the owner can review it. Carries only the account id and address and the
// fact; never the date of birth or the age. Nothing is deleted automatically.
// `accountId` and `accountEmail` are escaped.
export async function sendUnderMinimumAgeNotice(to: string, accountId: string, accountEmail: string, minimumAge: number): Promise<void> {
  await send("underage_review_notice", {
    from: getFrom(),
    to,
    subject: "Ascendra: an account entered a date of birth below the minimum age",
    html:
      `<p>Account <strong>${escapeHtml(accountId)}</strong> (${escapeHtml(accountEmail)}) entered a date of birth below the account minimum age of ${minimumAge} ` +
      `when asked to confirm they are 18 or older for a mental health course.</p>` +
      `<p>The course stays locked for that account. Nothing has been deleted or changed. The date of birth is on the account (app_users.date_of_birth) if you need to review it; ` +
      `it is not repeated here.</p>`,
  });
}

// REQ-197: the service emails (exam change notice, exam countdown, weekly
// digest). lib/service-emails.ts renders them, checks the preference, the
// verified address and the send log first, and passes the sender: EMAIL_FROM
// for the two service notices, DIGEST_EMAIL_FROM for the digest (so it can
// move to its own subdomain). `headers` carries List-Unsubscribe and
// List-Unsubscribe-Post (RFC 8058 one-click).
export async function sendServiceEmail(
  kind: "exam_change" | "exam_countdown" | "weekly_digest",
  payload: Omit<EmailPayload, "from"> & { from?: string }
): Promise<void> {
  await send(kind, { ...payload, from: payload.from ?? getFrom() });
}

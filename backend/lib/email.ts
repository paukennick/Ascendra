import { Resend } from "resend";

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

function getFrom(): string {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await getClient().emails.send({
    from: getFrom(),
    to,
    subject: "Verify your Ascendra account",
    html: `<p>Confirm your email to finish creating your Ascendra account.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours. If you didn't request this, ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await getClient().emails.send({
    from: getFrom(),
    to,
    subject: "Reset your Ascendra password",
    html: `<p>Someone (hopefully you) requested a password reset.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>`,
  });
}

export async function sendEmailChangeConfirmation(newEmail: string, token: string): Promise<void> {
  const url = `${getAppBaseUrl()}/confirm-email-change?token=${encodeURIComponent(token)}`;
  await getClient().emails.send({
    from: getFrom(),
    to: newEmail,
    subject: "Confirm your new Ascendra email address",
    html: `<p>Confirm this is your new email address for Ascendra.</p><p><a href="${url}">Confirm email change</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your address won't change.</p>`,
  });
}

export async function sendMfaEmailCode(to: string, code: string): Promise<void> {
  await getClient().emails.send({
    from: getFrom(),
    to,
    subject: `${code} is your Ascendra verification code`,
    html: `<p>Your Ascendra sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function sendMfaDisableConfirmationEmail(to: string, code: string, methodLabel: string): Promise<void> {
  await getClient().emails.send({
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
  kind: "ticket" | "course_request";
  subject: string;
  body: string;
  fromEmail: string;
  courseName?: string | null;
  courseSourceUrl?: string | null;
}): Promise<void> {
  const to = process.env.SUPPORT_EMAIL || getFrom();
  const label = params.kind === "course_request" ? "Course request" : "Support ticket";
  const rows = [
    `<p><strong>From:</strong> ${escapeHtml(params.fromEmail)}</p>`,
    params.courseName ? `<p><strong>Course:</strong> ${escapeHtml(params.courseName)}</p>` : "",
    params.courseSourceUrl ? `<p><strong>Source:</strong> ${escapeHtml(params.courseSourceUrl)}</p>` : "",
    `<p style="white-space:pre-wrap">${escapeHtml(params.body)}</p>`,
  ].join("");
  await getClient().emails.send({
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
export async function sendSecurityAlertEmail(to: string, subject: string, message: string): Promise<void> {
  await getClient().emails.send({
    from: getFrom(),
    to,
    subject,
    html: `<p>${message}</p><p>If this wasn't you, change your password immediately and review your active sessions in Ascendra's Account settings.</p>`,
  });
}

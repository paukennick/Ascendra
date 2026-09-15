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

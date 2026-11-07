import { NextResponse } from "next/server";
import { query, queryOne } from "../db";
import { verifyPassword } from "./passwords";
import { verifyTotpCode, verifyBackupCode } from "./mfa";
import { decrypt } from "./crypto";
import { verifyGoogleIdToken } from "./oauth";
import { consumeRateLimit, RateLimitError } from "./rateLimit";

// REQ-116 (audit 3, findings 1 and 2): "confirm it's you" before an action
// that could hand the account to someone holding only a stolen access token
// -- changing the email address, replacing or adding an authenticator, and
// (for accounts without a password) turning MFA off.
//
// Accepted proofs, whichever the account has:
//   - `reauth` (one text field in the app): the account password, a current
//     authenticator code, or an unused backup code. A backup code used here
//     is spent, as at login.
//   - `password`: same as `reauth`, the name older routes already used.
//   - `googleIdToken`: a Google sign-in done just now (issued in the last
//     REAUTH_GOOGLE_MAX_AGE_S seconds) for the Google identity linked to
//     this account. The only proof a Google-only account without MFA has.
//
// Every check counts against one per-account budget (REAUTH_LIMIT), shared
// with change-password's current-password check, so a stolen token can't
// guess the password or a code without limit.

export const REAUTH_EVENT = "reauth_attempt";
export const REAUTH_LIMIT = { max: 10, windowMinutes: 15 };
export const REAUTH_GOOGLE_MAX_AGE_S = 10 * 60;

export interface ReauthInput {
  reauth?: unknown;
  password?: unknown;
  googleIdToken?: unknown;
}

export interface ReauthMethods {
  password: boolean;
  code: boolean;
  google: boolean;
}

export type ReauthResult =
  | { ok: true; method: "password" | "totp" | "backup" | "google" }
  | { ok: false; status: 400 | 401 | 429; error: string; reauthRequired: true; methods: ReauthMethods };

const BACKUP_SHAPE = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

export async function checkReauth(userId: string, input: ReauthInput): Promise<ReauthResult> {
  const user = await queryOne<{ password_hash: string | null; totp_secret_enc: string | null; has_backup: boolean; google: boolean }>(
    `select password_hash, totp_secret_enc,
            exists(select 1 from mfa_backup_codes b where b.user_id = u.id and b.used_at is null) as has_backup,
            exists(select 1 from oauth_accounts oa where oa.user_id = u.id and oa.provider = 'google') as google
       from app_users u where u.id = $1`,
    [userId]
  );
  const methods: ReauthMethods = {
    password: !!user?.password_hash,
    code: !!user?.totp_secret_enc || !!user?.has_backup,
    google: !!user?.google,
  };
  const fail = (status: 400 | 401 | 429, error: string): ReauthResult => ({
    ok: false,
    status,
    error,
    reauthRequired: true,
    methods,
  });

  const secret =
    typeof input.reauth === "string" && input.reauth.trim()
      ? input.reauth
      : typeof input.password === "string" && input.password
        ? input.password
        : "";
  const googleIdToken = typeof input.googleIdToken === "string" && input.googleIdToken ? input.googleIdToken : "";
  if (!user) return fail(401, "Account no longer exists.");
  if (!secret && !googleIdToken) {
    return fail(400, methods.password ? "Enter your current password to confirm it's you." : confirmPrompt(methods));
  }
  if (secret.length > 1024) return fail(400, "That confirmation is too long.");

  try {
    await consumeRateLimit(REAUTH_EVENT, userId, REAUTH_LIMIT, { userId });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return fail(429, "Too many tries. For your security, wait 15 minutes and try again.");
    }
    throw err;
  }

  if (googleIdToken) {
    if (!methods.google) return fail(401, "This account isn't connected to Google.");
    let identity;
    try {
      identity = await verifyGoogleIdToken(googleIdToken);
    } catch {
      return fail(401, "Google sign-in couldn't be confirmed. Try again.");
    }
    const linked = await queryOne<{ id: string }>(
      `select id from oauth_accounts where user_id = $1 and provider = 'google' and provider_account_id = $2`,
      [userId, identity.providerAccountId]
    );
    const fresh = identity.issuedAt !== null && Date.now() / 1000 - identity.issuedAt <= REAUTH_GOOGLE_MAX_AGE_S;
    if (!linked) return fail(401, "That Google account isn't the one connected to this account.");
    if (!fresh) return fail(401, "Sign in with Google again to confirm it's you.");
    return { ok: true, method: "google" };
  }

  const trimmed = secret.trim();
  if (user.totp_secret_enc && /^\d{6}$/.test(trimmed)) {
    if (await verifyTotpCode(decrypt(user.totp_secret_enc), trimmed)) return { ok: true, method: "totp" };
  }
  if (user.has_backup && BACKUP_SHAPE.test(trimmed)) {
    const normalized = trimmed.length === 8 ? `${trimmed.slice(0, 4)}-${trimmed.slice(4)}` : trimmed;
    const codes = await query<{ id: string; code_hash: string }>(
      `select id, code_hash from mfa_backup_codes where user_id = $1 and used_at is null`,
      [userId]
    );
    for (const c of codes) {
      if (await verifyBackupCode(normalized, c.code_hash)) {
        const spent = await queryOne<{ id: string }>(
          `update mfa_backup_codes set used_at = now() where id = $1 and used_at is null returning id`,
          [c.id]
        );
        if (spent) return { ok: true, method: "backup" };
      }
    }
  }
  if (user.password_hash && (await verifyPassword(secret, user.password_hash))) return { ok: true, method: "password" };

  return fail(401, methods.password ? "That password or code isn't right." : "That code isn't right.");
}

function confirmPrompt(m: ReauthMethods): string {
  if (m.code) return "Enter a code from your authenticator app or a backup code to confirm it's you.";
  if (m.google) return "Sign in with Google again to confirm it's you.";
  return "Confirm it's you to continue.";
}

// Route helper: the JSON body for a failed check. `reauthRequired` and
// `methods` tell the app which field to show.
export function reauthFailure(r: Extract<ReauthResult, { ok: false }>) {
  return NextResponse.json({ error: r.error, reauthRequired: true, methods: r.methods }, { status: r.status });
}

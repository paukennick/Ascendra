import crypto from "node:crypto";
import { queryOne, withTransaction } from "../db";
import { sendSecurityAlertEmail } from "../email";
import { bumpTokenVersion, revokeOtherSessions } from "./sessionControl";
import { emailFailureHandler } from "../email-errors";

// Logic behind the /verify-email and /confirm-email-change pages, kept out of
// the page files so it can be exercised directly by tests. Both links are
// single-use: each is spent with a guarded UPDATE (consumed_at is null) that
// shares a transaction with the change it authorizes, so concurrent clicks
// apply it once and a failed change doesn't burn the link.
//
// REQ-191: mail link scanners (Outlook Safe Links, corporate gateways) open
// every link in a message before the person does. The pages used to spend
// the token while rendering that GET, so the real click said "invalid or
// expired" -- and for a set_password link the scanner cleared the password
// and was the only one shown the reset link. A GET now only reads the
// token (inspect* below, no writes) and renders a button; the token is spent
// by the button's POST (the pages' server actions call the functions
// below).

// Thrown inside a transaction to roll it back and report a message.
class Rejected extends Error {}

const INVALID_VERIFY = "This verification link is invalid or has expired. Request a new one from the app.";
const ALREADY_VERIFIED = "Your email is already verified. You can log in.";
const INVALID_CHANGE = "This link is invalid or has expired. Request the email change again from the app.";
const EMAIL_TAKEN = "That email is now in use by another account. Nothing was changed.";
const CHANGED_SINCE =
  "This change was cancelled, or your sign-in details changed after it was requested. Nothing was changed. Request it again from the app if you still want it.";

export type VerifyCode = "missing" | "invalid" | "verified" | "set_password" | "already_verified";

export const VERIFY_MESSAGES: Record<VerifyCode, string> = {
  missing: "Missing verification token.",
  invalid: INVALID_VERIFY,
  verified: "Your email is verified. You can close this page and log in.",
  set_password:
    "Your email is verified. Choose a password to finish -- any password set before has been removed. This link works for one hour.",
  already_verified: ALREADY_VERIFIED,
};

export interface VerifyResult {
  ok: boolean;
  code: VerifyCode;
  message: string;
  // REQ-116: set when the link cleared a squatted password; the page links
  // here so the inbox owner chooses their own.
  setPasswordUrl?: string;
}

const RESET_TTL_HOURS = 1;

function hash(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// REQ-116 (audit 3, finding 8): pre-registration squatting.
//
// Anyone could register someone else's address first and choose the
// password. The victim's own sign-up was refused ("already exists"), and if
// the victim followed a verification link the account went live with the
// squatter's password. Now a second registration of an unverified address
// sends a set_password link (app/api/auth/register). Following a set_password
// link proves the inbox and so, in one transaction: verifies the address,
// removes the password the first registrant chose, revokes every session,
// bumps token_version (ending access tokens), spends the account's other
// verification links, and issues a one-hour password-reset token for the
// page to link to. An ordinary verification link (no conflict seen) still
// just verifies.
// REQ-191: what GET /verify-email shows, without changing anything.
//  - ready: an unspent link; the page shows the confirm button.
//  - already_verified: the account is verified and this link can do nothing
//    more (an ordinary link, or a spent/expired set_password link).
//  - invalid: unknown, or spent/expired on an account still unverified.
// An unspent set_password link always shows the button, so REQ-116's
// takeover still runs on the owner's POST exactly as before.
export type VerifyInspection =
  | { state: "missing" | "invalid" | "already_verified" }
  | { state: "ready"; setPassword: boolean };

export async function inspectVerifyToken(token: string | undefined): Promise<VerifyInspection> {
  if (!token) return { state: "missing" };
  const row = await queryOne<{ usable: boolean; set_password: boolean; verified: boolean }>(
    `select (t.consumed_at is null and t.expires_at > now()) as usable, t.set_password,
            u.email_verified_at is not null as verified
       from email_verification_tokens t join app_users u on u.id = t.user_id
      where t.token_hash = $1`,
    [hash(token)]
  );
  if (!row) return { state: "invalid" };
  if (row.verified && !(row.usable && row.set_password)) return { state: "already_verified" };
  if (!row.usable) return { state: "invalid" };
  return { state: "ready", setPassword: row.set_password };
}

async function verifiedOwnerOf(tokenHash: string): Promise<boolean> {
  const row = await queryOne<{ verified: boolean }>(
    `select u.email_verified_at is not null as verified
       from email_verification_tokens t join app_users u on u.id = t.user_id
      where t.token_hash = $1`,
    [tokenHash]
  );
  return row?.verified === true;
}

export async function verifyEmailToken(token: string | undefined): Promise<VerifyResult> {
  if (!token) {
    return { ok: false, code: "missing", message: VERIFY_MESSAGES.missing };
  }
  const tokenHash = hash(token);
  const verified = await withTransaction(async (tx) => {
    const row = await tx.queryOne<{ user_id: string; set_password: boolean }>(
      `update email_verification_tokens set consumed_at = now()
       where token_hash = $1 and consumed_at is null and expires_at > now()
       returning user_id, set_password`,
      [tokenHash]
    );
    if (!row) return null;
    // REQ-191: keep the first verification time if a second link is used.
    await tx.query(`update app_users set email_verified_at = coalesce(email_verified_at, now()) where id = $1`, [
      row.user_id,
    ]);
    if (!row.set_password) return { resetRaw: null as string | null };

    await tx.query(
      `update app_users set password_hash = null, failed_login_count = 0, locked_until = null where id = $1`,
      [row.user_id]
    );
    await revokeOtherSessions(row.user_id, null, tx);
    await bumpTokenVersion(row.user_id, tx);
    await tx.query(
      `update email_verification_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`,
      [row.user_id]
    );
    await tx.query(`update login_challenges set consumed_at = now() where user_id = $1 and consumed_at is null`, [
      row.user_id,
    ]);
    const resetRaw = crypto.randomBytes(32).toString("base64url");
    await tx.query(`insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)`, [
      row.user_id,
      hash(resetRaw),
      new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000),
    ]);
    return { resetRaw };
  });
  if (!verified) {
    // REQ-191: a second click (or a click after a scanner or another link
    // verified the account) is not an error for the person clicking.
    if (await verifiedOwnerOf(tokenHash)) {
      return { ok: false, code: "already_verified", message: VERIFY_MESSAGES.already_verified };
    }
    return { ok: false, code: "invalid", message: INVALID_VERIFY };
  }
  if (verified.resetRaw) {
    return {
      ok: true,
      code: "set_password",
      message: VERIFY_MESSAGES.set_password,
      setPasswordUrl: `/reset-password?token=${encodeURIComponent(verified.resetRaw)}`,
    };
  }
  return { ok: true, code: "verified", message: VERIFY_MESSAGES.verified };
}


// REQ-116 (audit 3, finding 1): the confirmation re-checks. Besides the
// guarded single-use consume, the change goes through only if it was not
// cancelled from the old address and the account's token_version is still
// the one recorded when it was requested -- a password change or reset,
// logout-all, or a cancel in between voids it. Only the newest request
// counts: a new request spends the older ones (app/api/account/email).
export type ChangeCode = "missing" | "invalid" | "taken" | "voided" | "changed";

export const CHANGE_MESSAGES: Record<ChangeCode, string> = {
  missing: "Missing confirmation token.",
  invalid: INVALID_CHANGE,
  taken: EMAIL_TAKEN,
  voided: CHANGED_SINCE,
  changed: "Your email address has been updated. You can close this page.",
};

const changeCodeOf = (message: string): ChangeCode =>
  message === EMAIL_TAKEN ? "taken" : message === CHANGED_SINCE ? "voided" : "invalid";

// REQ-191: what GET /confirm-email-change shows, without changing anything.
// The new address is shown so the person knows what they are confirming;
// only the holder of the link (that inbox) sees it.
export async function inspectEmailChangeToken(
  token: string | undefined
): Promise<{ state: "missing" | "invalid" } | { state: "ready"; newEmail: string }> {
  if (!token) return { state: "missing" };
  const row = await queryOne<{ new_email: string }>(
    `select new_email from email_change_tokens
      where token_hash = $1 and consumed_at is null and cancelled_at is null and expires_at > now()`,
    [hash(token)]
  );
  return row ? { state: "ready", newEmail: row.new_email } : { state: "invalid" };
}

export async function confirmEmailChangeToken(
  token: string | undefined
): Promise<{ ok: boolean; code: ChangeCode; message: string }> {
  if (!token) {
    return { ok: false, code: "missing", message: CHANGE_MESSAGES.missing };
  }
  const tokenHash = hash(token);

  let changed: { previousEmail: string | null; newEmail: string };
  try {
    changed = await withTransaction(async (tx) => {
      const row = await tx.queryOne<{ user_id: string; new_email: string; token_version: number | null }>(
        `update email_change_tokens set consumed_at = now()
         where token_hash = $1 and consumed_at is null and cancelled_at is null and expires_at > now()
         returning user_id, new_email, token_version`,
        [tokenHash]
      );
      if (!row) throw new Rejected(INVALID_CHANGE);

      const previous = await tx.queryOne<{ email: string; token_version: number }>(
        "select email, token_version from app_users where id = $1 for update",
        [row.user_id]
      );
      if (!previous) throw new Rejected(INVALID_CHANGE);
      if (row.token_version !== null && row.token_version !== previous.token_version) {
        // Spend it for good: a voided change must not come back.
        return { voided: true as const };
      }

      // Throwing rolls the consume back too: a link that changed nothing
      // stays usable once the conflict clears.
      const existing = await tx.queryOne<{ id: string }>("select id from app_users where email = $1", [row.new_email]);
      if (existing) throw new Rejected(EMAIL_TAKEN);

      await tx.query(`update app_users set email = $1, email_verified_at = now() where id = $2`, [
        row.new_email,
        row.user_id,
      ]);
      await tx.query(
        `update email_change_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`,
        [row.user_id]
      );
      return { previousEmail: previous.email, newEmail: row.new_email };
    }).then((r) => {
      if ("voided" in r) throw new Rejected(CHANGED_SINCE);
      return r;
    });
  } catch (err) {
    if (err instanceof Rejected) return { ok: false, code: changeCodeOf(err.message), message: err.message };
    // 23505 = unique_violation: someone took the address between our check
    // and the update. app_users.email is unique, so the database refused.
    if ((err as { code?: string })?.code === "23505") return { ok: false, code: "taken", message: EMAIL_TAKEN };
    throw err;
  }

  if (changed.previousEmail) {
    await sendSecurityAlertEmail(
      changed.previousEmail,
      "Your Ascendra email address was changed",
      `Your account's email address was changed to ${changed.newEmail}.`
    ).catch(emailFailureHandler("confirm-email-change"));
  }

  return { ok: true, code: "changed", message: CHANGE_MESSAGES.changed };
}

// REQ-116 (audit 3, finding 1): the link in the alert sent to the OLD
// address when a change is requested. It cancels every pending change for
// the account and, because someone else may hold a session, signs out every
// device (refresh tokens revoked, token_version bumped). Works while the
// change is still pending; once confirmed, the old address gets the "was
// changed" alert instead and recovery is through support.
export type CancelCode = "missing" | "used" | "cancelled";

export const CANCEL_MESSAGES: Record<CancelCode, string> = {
  missing: "Missing cancel token.",
  used: "This link has already been used or the change already went through. If you didn't make this change, contact support from the app.",
  cancelled:
    "The email change was cancelled and every device was signed out. If you didn't ask for it, sign in and change your password now.",
};

// REQ-191: what GET /cancel-email-change shows, without changing anything.
// Same predicate as the cancel itself (no expiry, FAIL-528).
export async function inspectCancelToken(token: string | undefined): Promise<{ state: "missing" | "used" | "ready" }> {
  if (!token) return { state: "missing" };
  const row = await queryOne<{ id: string }>(
    `select id from email_change_tokens where cancel_token_hash = $1 and consumed_at is null and cancelled_at is null`,
    [hash(token)]
  );
  return { state: row ? "ready" : "used" };
}

export async function cancelEmailChangeToken(
  token: string | undefined
): Promise<{ ok: boolean; code: CancelCode; message: string }> {
  if (!token) return { ok: false, code: "missing", message: CANCEL_MESSAGES.missing };
  const done = await withTransaction(async (tx) => {
    const row = await tx.queryOne<{ user_id: string }>(
      `update email_change_tokens set cancelled_at = now(), consumed_at = now()
        where cancel_token_hash = $1 and consumed_at is null and cancelled_at is null
        returning user_id`,
      [hash(token)]
    );
    if (!row) return false;
    await tx.query(
      `update email_change_tokens set cancelled_at = now(), consumed_at = now()
        where user_id = $1 and consumed_at is null`,
      [row.user_id]
    );
    await revokeOtherSessions(row.user_id, null, tx);
    await bumpTokenVersion(row.user_id, tx);
    return true;
  });
  if (!done) return { ok: false, code: "used", message: CANCEL_MESSAGES.used };
  return { ok: true, code: "cancelled", message: CANCEL_MESSAGES.cancelled };
}

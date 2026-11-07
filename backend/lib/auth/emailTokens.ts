import crypto from "node:crypto";
import { withTransaction } from "../db";
import { sendSecurityAlertEmail } from "../email";

// Logic behind the /verify-email and /confirm-email-change pages, kept out of
// the page files so it can be exercised directly by tests. Both links are
// single-use: each is spent with a guarded UPDATE (consumed_at is null) that
// shares a transaction with the change it authorizes, so concurrent clicks
// apply it once and a failed change doesn't burn the link.

// Thrown inside a transaction to roll it back and report a message.
class Rejected extends Error {}

const INVALID_VERIFY = "This verification link is invalid or has expired. Request a new one from the app.";
const INVALID_CHANGE = "This link is invalid or has expired. Request the email change again from the app.";
const EMAIL_TAKEN = "That email is now in use by another account. Nothing was changed.";

export async function verifyEmailToken(token: string | undefined): Promise<{ ok: boolean; message: string }> {
  if (!token) {
    return { ok: false, message: "Missing verification token." };
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const verified = await withTransaction(async (tx) => {
    const row = await tx.queryOne<{ user_id: string }>(
      `update email_verification_tokens set consumed_at = now()
       where token_hash = $1 and consumed_at is null and expires_at > now()
       returning user_id`,
      [tokenHash]
    );
    if (!row) return false;
    await tx.query(`update app_users set email_verified_at = now() where id = $1`, [row.user_id]);
    return true;
  });
  if (!verified) return { ok: false, message: INVALID_VERIFY };
  return { ok: true, message: "Your email is verified. You can close this page and log in." };
}

export async function confirmEmailChangeToken(token: string | undefined): Promise<{ ok: boolean; message: string }> {
  if (!token) {
    return { ok: false, message: "Missing confirmation token." };
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  let changed: { previousEmail: string | null; newEmail: string };
  try {
    changed = await withTransaction(async (tx) => {
      const row = await tx.queryOne<{ user_id: string; new_email: string }>(
        `update email_change_tokens set consumed_at = now()
         where token_hash = $1 and consumed_at is null and expires_at > now()
         returning user_id, new_email`,
        [tokenHash]
      );
      if (!row) throw new Rejected(INVALID_CHANGE);

      // Throwing rolls the consume back too: a link that changed nothing
      // stays usable once the conflict clears.
      const existing = await tx.queryOne<{ id: string }>("select id from app_users where email = $1", [row.new_email]);
      if (existing) throw new Rejected(EMAIL_TAKEN);

      const previous = await tx.queryOne<{ email: string }>("select email from app_users where id = $1", [row.user_id]);
      await tx.query(`update app_users set email = $1, email_verified_at = now() where id = $2`, [
        row.new_email,
        row.user_id,
      ]);
      return { previousEmail: previous?.email ?? null, newEmail: row.new_email };
    });
  } catch (err) {
    if (err instanceof Rejected) return { ok: false, message: err.message };
    // 23505 = unique_violation: someone took the address between our check
    // and the update. app_users.email is unique, so the database refused.
    if ((err as { code?: string })?.code === "23505") return { ok: false, message: EMAIL_TAKEN };
    throw err;
  }

  if (changed.previousEmail) {
    await sendSecurityAlertEmail(
      changed.previousEmail,
      "Your Ascendra email address was changed",
      `Your account's email address was changed to ${changed.newEmail}.`
    ).catch(() => undefined);
  }

  return { ok: true, message: "Your email address has been updated. You can close this page." };
}

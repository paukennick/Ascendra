import { withTransaction } from "../db";

// REQ-219 (FAIL-1100): turning one two-factor method off.
//
// Both "turn off" routes (authenticator, email codes) used to read the OTHER
// method's state, decide from that whether this was the last method (which
// needs the emailed confirmation code), and write mfa_enabled = <other still
// on> -- three separate steps. Two requests sent at once, one per method, each
// saw the other method still on: neither asked for the confirmation code, and
// each wrote mfa_enabled = true. Both methods ended off with mfa_enabled still
// true, an account whose sign-in asked for a second step it could not
// perform.
//
// Now the decision and the write are one transaction with the user row
// locked. The caller says whether the confirmation code was required and
// checked (`confirmedAsLast`). Under the lock the other method is read again:
//   - the other method is on: this one goes off, mfa_enabled stays true;
//   - the other method is off and the caller confirmed as the last method:
//     both are off, mfa_enabled goes false;
//   - the other method is off but the caller was NOT asked to confirm (it
//     was on when the caller looked, and was turned off since): nothing is
//     written -- "changed" -- so the learner sees the new state and the last
//     method is never turned off without its emailed code.
export type MfaMethod = "totp" | "email";

export async function turnOffMfaMethod(
  userId: string,
  method: MfaMethod,
  confirmedAsLast: boolean
): Promise<"done" | "changed"> {
  return withTransaction(async (tx) => {
    const row = await tx.queryOne<{ totp_secret_enc: string | null; email_mfa_enabled: boolean }>(
      `select totp_secret_enc, email_mfa_enabled from app_users where id = $1 for update`,
      [userId]
    );
    if (!row) return "changed";
    const otherOn = method === "totp" ? row.email_mfa_enabled : !!row.totp_secret_enc;
    if (!otherOn && !confirmedAsLast) return "changed";

    if (method === "totp") {
      await tx.query(
        `update app_users set mfa_enabled = $1, totp_secret_enc = null, totp_last_step = null,
           totp_pending_secret_enc = null, totp_pending_expires_at = null
         where id = $2`,
        [otherOn, userId]
      );
    } else {
      await tx.query(
        `update app_users set email_mfa_enabled = false, email_mfa_pending_code_hash = null,
           email_mfa_pending_expires_at = null, mfa_enabled = $1
         where id = $2`,
        [otherOn, userId]
      );
    }
    // Each method's own backup codes go with it (scoped per method).
    await tx.query(`delete from mfa_backup_codes where user_id = $1 and method = $2`, [userId, method]);
    return "done";
  });
}

export const MFA_CHANGED_MESSAGE =
  "Your two-factor settings changed while you were turning this off. Check them and try again.";

// Does sign-in owe a second step? Only when a method exists to pass it with.
// mfa_enabled alone is not enough (FAIL-1100): an account the old race left
// with the flag set and no method would be sent to a code step it could never
// pass, so sign-in treats that state as off.
export function mfaStepRequired(u: { mfa_enabled: boolean; totp_secret_enc: string | null; email_mfa_enabled: boolean }): boolean {
  return u.mfa_enabled && (!!u.totp_secret_enc || u.email_mfa_enabled);
}

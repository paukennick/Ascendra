import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateBackupCodes } from "@/lib/auth/mfa";
import { checkReauth, reauthFailure } from "@/lib/auth/reauth";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/backup-codes -- { method, ...proof } -- invalidates the
// existing backup codes for that one method ("totp" or "email") and issues
// 10 new ones, leaving the other method's codes untouched. The caller confirms
// it's them first, same reasoning as /api/auth/mfa/disable: a held access
// token alone shouldn't be able to mint new recovery codes.
//
// REQ-203 (FAIL-863): the check spends the shared per-account budget
// (REAUTH_EVENT) before anything is compared.
//
// REQ-219 (FAIL-1101): the proof used to be the password alone, so a
// Google-only account (no password) could never regenerate its codes. It now
// accepts what every other confirm-it's-you route does (lib/auth/reauth.ts):
// `password` or `reauth` (the password, an authenticator code or a backup
// code) or `googleIdToken` (a Google sign-in done in the last few minutes).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { method } = body ?? {};
    if (method !== "totp" && method !== "email") {
      return badRequest('method must be "totp" or "email"');
    }

    const row = await queryOne<{ totp_secret_enc: string | null; email_mfa_enabled: boolean }>(
      `select totp_secret_enc, email_mfa_enabled from app_users where id = $1`,
      [user.id]
    );
    const methodEnabled = method === "totp" ? !!row?.totp_secret_enc : !!row?.email_mfa_enabled;
    if (!methodEnabled) {
      return badRequest(`${method === "totp" ? "Authenticator app codes are" : "Email codes are"} not enabled on this account.`);
    }
    // A wrong answer is a 401 about what was typed, not the session, so it
    // carries reauthRequired and the app doesn't refresh and resend it (which
    // would spend two tries on one guess).
    const proof = await checkReauth(user.id, body ?? {});
    if (!proof.ok) return reauthFailure(proof);

    const { raw: backupCodes, hashed } = await generateBackupCodes();
    // REQ-203 (FAIL-869): delete and insert together, so a failure between
    // them can't leave the method with no recovery codes at all.
    await withTransaction(async (tx) => {
      await tx.query(`delete from mfa_backup_codes where user_id = $1 and method = $2`, [user.id, method]);
      await tx.query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, $2, unnest($3::text[])`, [
        user.id,
        method,
        hashed,
      ]);
    });

    return ok({ backupCodes });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateBackupCodes } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/passwords";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/backup-codes — { password, method } — invalidates the
// existing backup codes for that one method ("totp" or "email") and issues
// 10 new ones, leaving the other method's codes untouched. Requires the
// password again, same reasoning as /api/auth/mfa/disable: a held access
// token alone shouldn't be able to mint new recovery codes.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { password, method } = body ?? {};
    if (!password || typeof password !== "string") {
      return badRequest("password is required");
    }
    if (method !== "totp" && method !== "email") {
      return badRequest('method must be "totp" or "email"');
    }

    const row = await queryOne<{ password_hash: string | null; totp_secret_enc: string | null; email_mfa_enabled: boolean }>(
      `select password_hash, totp_secret_enc, email_mfa_enabled from app_users where id = $1`,
      [user.id]
    );
    const methodEnabled = method === "totp" ? !!row?.totp_secret_enc : !!row?.email_mfa_enabled;
    if (!methodEnabled) {
      return badRequest(`${method === "totp" ? "Authenticator app codes are" : "Email codes are"} not enabled on this account.`);
    }
    if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) {
      return unauthorized("Incorrect password.");
    }

    const { raw: backupCodes, hashed } = await generateBackupCodes();
    await query(`delete from mfa_backup_codes where user_id = $1 and method = $2`, [user.id, method]);
    await query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, $2, unnest($3::text[])`, [
      user.id,
      method,
      hashed,
    ]);

    return ok({ backupCodes });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

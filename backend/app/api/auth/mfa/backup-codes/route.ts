import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateBackupCodes } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/passwords";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/backup-codes — { password } — invalidates every
// existing backup code and issues 10 new ones. Requires the password again,
// same reasoning as /api/auth/mfa/disable: a held access token alone
// shouldn't be able to mint new recovery codes.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { password } = body ?? {};
    if (!password || typeof password !== "string") {
      return badRequest("password is required");
    }

    const row = await queryOne<{ password_hash: string | null; mfa_enabled: boolean }>(
      `select password_hash, mfa_enabled from app_users where id = $1`,
      [user.id]
    );
    if (!row?.mfa_enabled) {
      return badRequest("MFA is not enabled on this account.");
    }
    if (!row.password_hash || !(await verifyPassword(password, row.password_hash))) {
      return unauthorized("Incorrect password.");
    }

    const { raw: backupCodes, hashed } = await generateBackupCodes();
    await query(`delete from mfa_backup_codes where user_id = $1`, [user.id]);
    await query(`insert into mfa_backup_codes (user_id, code_hash) select $1, unnest($2::text[])`, [
      user.id,
      hashed,
    ]);

    return ok({ backupCodes });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

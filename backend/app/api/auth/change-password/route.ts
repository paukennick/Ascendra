import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { revokeAllRefreshTokens } from "@/lib/auth/tokens";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { sendSecurityAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/auth/change-password — { currentPassword, newPassword }.
// Only ever updates the authenticated caller's own row. Revokes every
// refresh-token session afterward (this device's already-issued access
// token stays valid for its remaining ~15 min, so this doesn't sign the
// caller out mid-request, but every device needs to sign in again with the
// new password once its access token expires) -- deliberately simple over
// plumbing a "keep this one session" exception through.
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);
    const body = await req.json();
    const { currentPassword, newPassword } = body ?? {};
    if (!currentPassword || typeof currentPassword !== "string" || !newPassword || typeof newPassword !== "string") {
      return badRequest("currentPassword and newPassword are required");
    }
    if (newPassword.length < 8) {
      return badRequest("newPassword must be at least 8 characters");
    }

    const row = await queryOne<{ password_hash: string | null }>(
      "select password_hash from app_users where id = $1",
      [authUser.id]
    );
    if (!row?.password_hash) {
      return badRequest("This account doesn't use a password. Sign in with Google instead.");
    }
    const valid = await verifyPassword(currentPassword, row.password_hash);
    if (!valid) return badRequest("Current password is incorrect.");

    const newHash = await hashPassword(newPassword);
    await query("update app_users set password_hash = $1 where id = $2", [newHash, authUser.id]);
    await revokeAllRefreshTokens(authUser.id);

    await sendSecurityAlertEmail(
      authUser.email,
      "Your Ascendra password was changed",
      "Your account password was just changed. All other devices have been signed out."
    ).catch(() => undefined);

    return ok({ message: "Password changed. Other devices have been signed out." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

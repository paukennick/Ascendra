import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { verifyPassword } from "@/lib/auth/passwords";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// DELETE /api/account — permanently deletes the caller's own account.
// { password } is required when the account has one set (re-confirms
// intent for a destructive action); OAuth-only accounts have no password
// to check, so the valid access token is the only credential that exists.
// Every user-owned table (tracks, mastery, attempts, error log, chat,
// sessions, oauth links, tokens) references app_users with
// `on delete cascade`, so deleting this one row removes all of it --
// verified against the schema, not assumed.
export async function DELETE(req: Request) {
  try {
    const authUser = await requireUser(req);
    const row = await queryOne<{ password_hash: string | null }>(
      "select password_hash from app_users where id = $1",
      [authUser.id]
    );
    if (row?.password_hash) {
      const body = await req.json().catch(() => ({}));
      const password = typeof body?.password === "string" ? body.password : "";
      if (!password) return badRequest("password is required to delete your account");
      const valid = await verifyPassword(password, row.password_hash);
      if (!valid) return badRequest("Password is incorrect.");
    }

    await query("delete from app_users where id = $1", [authUser.id]);
    return ok({ message: "Account deleted." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

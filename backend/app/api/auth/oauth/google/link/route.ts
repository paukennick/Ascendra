import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { verifyGoogleIdToken } from "@/lib/auth/oauth";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// POST /api/auth/oauth/google/link — { idToken }. Attaches a verified Google
// identity to the CALLER's own account (no client-supplied user id
// anywhere), so a signed-in password user can also use "Continue with
// Google" afterward.
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);
    const body = await req.json();
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== "string") return badRequest("idToken is required");

    const identity = await verifyGoogleIdToken(idToken);
    if (!identity.emailVerified) return badRequest("Google account email is not verified.");

    const existingLink = await queryOne<{ user_id: string }>(
      `select user_id from oauth_accounts where provider = 'google' and provider_account_id = $1`,
      [identity.providerAccountId]
    );
    if (existingLink && existingLink.user_id !== authUser.id) {
      return badRequest("That Google account is already linked to a different Ascendra account.");
    }

    await query(
      `insert into oauth_accounts (user_id, provider, provider_account_id, email)
       values ($1, 'google', $2, $3)
       on conflict (provider, provider_account_id) do nothing`,
      [authUser.id, identity.providerAccountId, identity.email.toLowerCase()]
    );

    return ok({ message: "Google account connected." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// DELETE /api/auth/oauth/google/link — removes the caller's own Google
// link. Refused if the account has no password set, since that would leave
// no way to sign in at all.
export async function DELETE(req: Request) {
  try {
    const authUser = await requireUser(req);
    const user = await queryOne<{ password_hash: string | null }>(
      "select password_hash from app_users where id = $1",
      [authUser.id]
    );
    if (!user?.password_hash) {
      return badRequest("Set a password before disconnecting Google, or you won't be able to sign in.");
    }

    await query(`delete from oauth_accounts where user_id = $1 and provider = 'google'`, [authUser.id]);
    return ok({ message: "Google account disconnected." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

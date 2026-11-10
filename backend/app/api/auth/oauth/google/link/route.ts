import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { verifyGoogleIdToken } from "@/lib/auth/oauth";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { checkReauth, hasReauthProof, reauthFailure } from "@/lib/auth/reauth";
import { sendSecurityAlertEmail } from "@/lib/email";
import { emailFailureHandler } from "@/lib/email-errors";

export const dynamic = "force-dynamic";

// POST /api/auth/oauth/google/link — { idToken, reauth? }. Attaches a
// verified Google identity to the CALLER's own account (no client-supplied
// user id anywhere), so a signed-in password user can also use "Continue with
// Google" afterward.
//
// REQ-203 (FAIL-861): an access token alone used to be enough to attach ANY
// verified Google identity, which then signs in as this account for good.
// Now the caller confirms it's them first (password, authenticator or backup
// code: lib/auth/reauth.ts; `idToken` is the NEW identity, so a Google proof
// of the existing link goes in `googleIdToken`), and the account's address is
// mailed a security alert naming the Google address that was connected.
// Whether the Google address must also equal the account address is a
// product decision that has not been made; it is not enforced here.
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);
    const body = await readJson(req);
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== "string") return badRequest("idToken is required");

    if (await hasReauthProof(authUser.id)) {
      const proof = await checkReauth(authUser.id, body ?? {});
      if (!proof.ok) return reauthFailure(proof);
    }

    const identity = await verifyGoogleIdToken(idToken);
    if (!identity.emailVerified) return badRequest("Google account email is not verified.");

    const existingLink = await queryOne<{ user_id: string }>(
      `select user_id from oauth_accounts where provider = 'google' and provider_account_id = $1`,
      [identity.providerAccountId]
    );
    if (existingLink && existingLink.user_id !== authUser.id) {
      return badRequest("That Google account is already linked to a different Ascendra account.");
    }

    const inserted = await query(
      `insert into oauth_accounts (user_id, provider, provider_account_id, email)
       values ($1, 'google', $2, $3)
       on conflict (provider, provider_account_id) do nothing returning id`,
      [authUser.id, identity.providerAccountId, identity.email.toLowerCase()]
    );

    // Only a link that was just made is news; linking the same identity again
    // changes nothing.
    if (inserted.length > 0) {
      await sendSecurityAlertEmail(
        authUser.email,
        "A Google account was connected to your Ascendra account",
        `The Google account ${identity.email.toLowerCase()} can now be used to sign in to your Ascendra account.`
      ).catch(emailFailureHandler("auth/oauth/google/link"));
    }

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

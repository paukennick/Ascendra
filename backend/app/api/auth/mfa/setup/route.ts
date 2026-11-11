import { query } from "@/lib/db";
import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateTotpSecret, buildTotpProvisioning } from "@/lib/auth/mfa";
import { encrypt } from "@/lib/auth/crypto";
import { checkReauth, hasReauthProof, reauthFailure } from "@/lib/auth/reauth";

export const dynamic = "force-dynamic";

const PENDING_TTL_MINUTES = 15;

// POST /api/auth/mfa/setup — { reauth?, googleIdToken? } — starts (or
// restarts) TOTP enrollment. Generates a new secret, stores it as "pending"
// (not yet trusted for login), and returns a QR code plus the raw secret
// for manual entry. Nothing is committed until /api/auth/mfa/enable gets a
// real code from the authenticator app.
//
// REQ-116 (audit 3, finding 2): when MFA is ALREADY on (either method), a
// held access token alone used to be enough to swap in the attacker's
// authenticator and mint backup codes, locking the owner out. Then the
// request must also confirm it's the owner -- a current authenticator code,
// a backup code, or the password (lib/auth/reauth.ts) -- and the pending
// secret is marked as started after re-authentication
// (totp_pending_reauth_at); enable refuses one that wasn't.
//
// REQ-203 (FAIL-860): that only covered an account with MFA already on. With
// it off, a stolen access token could still enroll the attacker's
// authenticator and then own the second factor, locking the owner out. Now
// any account that has a way to prove it's them (password, code or Google)
// must, whether or not MFA is on.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    let reauthed = false;
    if (await hasReauthProof(user.id)) {
      const r = await checkReauth(user.id, body ?? {});
      if (!r.ok) return reauthFailure(r);
      reauthed = true;
    }

    const secret = generateTotpSecret();
    const { uri, qrDataUrl } = await buildTotpProvisioning(user.email, secret);

    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);
    await query(
      `update app_users set totp_pending_secret_enc = $1, totp_pending_expires_at = $2,
         totp_pending_reauth_at = case when $4 then now() else null end
       where id = $3`,
      [encrypt(secret), expiresAt, user.id, reauthed]
    );

    return ok({ secret, otpauthUri: uri, qrDataUrl, expiresInMinutes: PENDING_TTL_MINUTES });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

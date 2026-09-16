import { query } from "@/lib/db";
import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateTotpSecret, buildTotpProvisioning } from "@/lib/auth/mfa";
import { encrypt } from "@/lib/auth/crypto";

export const dynamic = "force-dynamic";

const PENDING_TTL_MINUTES = 15;

// POST /api/auth/mfa/setup — starts (or restarts) TOTP enrollment. Generates
// a new secret, stores it as "pending" (not yet trusted for login), and
// returns a QR code plus the raw secret for manual entry. Calling this again
// before /api/auth/mfa/enable just replaces the pending secret -- nothing is
// committed until a real code from the authenticator app proves the user
// actually captured it.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const secret = generateTotpSecret();
    const { uri, qrDataUrl } = await buildTotpProvisioning(user.email, secret);

    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);
    await query(
      `update app_users set totp_pending_secret_enc = $1, totp_pending_expires_at = $2 where id = $3`,
      [encrypt(secret), expiresAt, user.id]
    );

    return ok({ secret, otpauthUri: uri, qrDataUrl, expiresInMinutes: PENDING_TTL_MINUTES });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

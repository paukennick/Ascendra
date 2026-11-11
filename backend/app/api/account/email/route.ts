import crypto from "node:crypto";
import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { checkReauth, reauthFailure } from "@/lib/auth/reauth";
import { mayEmail } from "@/lib/auth/mailLimit";
import { sendEmailChangeConfirmation, sendEmailChangeRequestedAlert } from "@/lib/email";
import { emailFailureHandler } from "@/lib/email-errors";

export const dynamic = "force-dynamic";
const TOKEN_TTL_HOURS = 1;
const MAX_EMAIL_LENGTH = 254;

const hash = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

// POST /api/account/email — { newEmail, reauth? | password? | googleIdToken? }.
// Sends a confirmation link to the NEW address; the address on app_users
// doesn't change until that link is followed (app/confirm-email-change), so
// a typo'd address just gets an email nobody reads.
//
// REQ-116 (audit 3, finding 1): a stolen 15-minute access token used to be
// enough to move the account to the attacker's address and then reset the
// password through it. Now:
//   - the request must confirm it's the owner (lib/auth/reauth.ts): the
//     password, an authenticator or backup code, or for a Google-only
//     account a fresh Google sign-in;
//   - the CURRENT address is told at once, with a link that cancels the
//     change and signs out every device;
//   - only the newest request is live (older pending ones are spent), and
//     the confirmation re-checks that nothing was cancelled and the
//     account's token_version hasn't moved since (lib/auth/emailTokens.ts).
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);

    try {
      await consumeRateLimit("email_change_request", authUser.id, { max: 5, windowMinutes: 60 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }

    const body = await readJson(req);
    const newEmail = typeof body?.newEmail === "string" ? body.newEmail.toLowerCase().trim() : "";
    if (!newEmail || newEmail.length > MAX_EMAIL_LENGTH || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(newEmail)) {
      return badRequest("A valid newEmail is required");
    }
    if (newEmail === authUser.email.toLowerCase()) return badRequest("That's already your email address.");

    const reauth = await checkReauth(authUser.id, body ?? {});
    if (!reauth.ok) return reauthFailure(reauth);

    const existing = await queryOne<{ id: string }>("select id from app_users where email = $1", [newEmail]);
    if (existing) return badRequest("That email is already in use.");

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const cancelToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
    await withTransaction(async (tx) => {
      await tx.query(`update email_change_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`, [
        authUser.id,
      ]);
      await tx.query(
        `insert into email_change_tokens (user_id, new_email, token_hash, expires_at, cancel_token_hash, token_version)
         values ($1, $2, $3, $4, $5, (select token_version from app_users where id = $1))`,
        [authUser.id, newEmail, hash(rawToken), expiresAt, hash(cancelToken)]
      );
    });

    // The old address is told whatever happens to the new one's mail.
    await sendEmailChangeRequestedAlert(authUser.email, newEmail, cancelToken).catch(emailFailureHandler("account/email"));
    if (await mayEmail(newEmail)) await sendEmailChangeConfirmation(newEmail, rawToken);

    return ok({ message: "Check your new email address for a confirmation link." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

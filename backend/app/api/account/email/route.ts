import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { sendEmailChangeConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";
const TOKEN_TTL_HOURS = 1;

// POST /api/account/email — { newEmail }. Sends a confirmation link to the
// NEW address; the address on app_users doesn't change until that link is
// followed (see app/confirm-email-change/page.tsx), so a typo'd address
// just gets an email nobody reads instead of locking anyone out.
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);

    try {
      await checkRateLimit("email_change_request", authUser.id, { max: 5, windowMinutes: 60 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("email_change_request", authUser.id);

    const body = await req.json();
    const newEmail = typeof body?.newEmail === "string" ? body.newEmail.toLowerCase().trim() : "";
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return badRequest("A valid newEmail is required");
    }

    const existing = await queryOne<{ id: string }>("select id from app_users where email = $1", [newEmail]);
    if (existing) return badRequest("That email is already in use.");

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
    await query(
      `insert into email_change_tokens (user_id, new_email, token_hash, expires_at) values ($1, $2, $3, $4)`,
      [authUser.id, newEmail, tokenHash, expiresAt]
    );
    await sendEmailChangeConfirmation(newEmail, rawToken);

    return ok({ message: "Check your new email address for a confirmation link." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

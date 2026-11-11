import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { verifyPassword } from "@/lib/auth/passwords";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { REAUTH_EVENT, REAUTH_LIMIT, checkReauth, hasReauthProof, reauthFailure } from "@/lib/auth/reauth";
import { purgeUserAuthEvents } from "@/lib/auth/retention";
import { scrubReportNotes } from "@/lib/report-notes";

export const dynamic = "force-dynamic";

// DELETE /api/account — permanently deletes the caller's own account.
// { password } is required when the account has one set (re-confirms
// intent for a destructive action). REQ-203 (FAIL-870): an account without a
// password used to need nothing but the access token; it now confirms with
// what it has -- a fresh Google sign-in (`googleIdToken`) or an authenticator
// or backup code (`reauth`), lib/auth/reauth.ts.
// Every user-owned table (tracks, mastery, attempts, error log, chat,
// sessions, oauth links, tokens) references app_users with
// `on delete cascade`, so deleting this one row removes all of it --
// verified against the schema, not assumed.
//
// REQ-116 (audit 3, finding 5): auth_events is the exception -- its
// user_id is `on delete set null` and its rows carry the email address and
// IP. They are deleted in the same transaction (lib/auth/retention.ts).
// REQ-205 (FAIL-900): item_flags (reports of a wrong question) and the
// ai_calls counts are `on delete set null` and stay, unlinked. The note a
// learner wrote on a report is erased with its copies in the content review
// queue (lib/report-notes.ts); ai_calls is purged after 12 months
// (lib/retention.ts). What stays, and for how long, is listed in the Privacy
// Policy section 6, the delete-account page and docs/legal/data-inventory.md.
// The password check shares the re-authentication guess budget, and the
// caller's access tokens stop at once because requireUser finds no row.
export async function DELETE(req: Request) {
  try {
    const authUser = await requireUser(req, { termsOptional: true });
    const row = await queryOne<{ password_hash: string | null; email: string }>(
      "select password_hash, email from app_users where id = $1",
      [authUser.id]
    );
    if (!row) return unauthorized("Account no longer exists.");
    if (row.password_hash) {
      const body = await req.json().catch(() => ({}));
      const password = typeof body?.password === "string" ? body.password : "";
      if (!password) return badRequest("password is required to delete your account");
      try {
        await consumeRateLimit(REAUTH_EVENT, authUser.id, REAUTH_LIMIT, { userId: authUser.id });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests("Too many tries. Wait 15 minutes and try again.");
        throw err;
      }
      const valid = await verifyPassword(password, row.password_hash);
      if (!valid) return badRequest("Password is incorrect.");
    } else if (await hasReauthProof(authUser.id)) {
      // An account with no password, code or Google link has nothing it
      // could be asked for (and can't sign in), so it isn't asked.
      const body = await req.json().catch(() => ({}));
      const proof = await checkReauth(authUser.id, body ?? {});
      if (!proof.ok) return reauthFailure(proof);
    }

    await withTransaction(async (tx) => {
      // Purge first: deleting the user sets auth_events.user_id to null.
      await purgeUserAuthEvents(tx, authUser.id, row.email);
      // REQ-205 (FAIL-900): the notes on reported questions, and their copies
      // in the content review queue, are the learner's own text.
      await scrubReportNotes(tx, authUser.id);
      await tx.query("delete from app_users where id = $1", [authUser.id]);
    });
    return ok({ message: "Account deleted." });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

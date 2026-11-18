import { ok, notFound, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid } from "@/lib/visibility";
import { requireOwner } from "@/lib/account-access";
import { GRANT_LIMIT, notifyOwnerOfChange } from "@/lib/account-access-routes";
import { unmarkReviewer } from "@/lib/reviewers";

export const dynamic = "force-dynamic";

// DELETE /api/access/reviewers/:grantId -- REQ-331: takes the reviewer mark
// off, owner only. When marking created the access grant, the grant ends too
// ({ accessEnded: true }); access given separately stays. Their feedback is
// kept (it is theirs, deleted with their account).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    await requireOwner(user.id);
    if (!isUuid(id)) return notFound("Reviewer not found");
    try {
      await consumeRateLimit("access_change", user.id, GRANT_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of access changes. Try again in an hour.");
      throw err;
    }
    const done = await unmarkReviewer(id.toLowerCase(), { via: "app", userId: user.id });
    if (!done) return notFound("Reviewer not found");
    await notifyOwnerOfChange(
      user.email,
      `You removed the reviewer mark from ${done.email} in Ascendra${done.accessEnded ? ", and the access that came with it" : ""}.`
    );
    return ok({ unmarked: done });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

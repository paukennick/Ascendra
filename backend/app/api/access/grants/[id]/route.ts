import { ok, notFound, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid } from "@/lib/visibility";
import { requireOwner, revokeAccess } from "@/lib/account-access";
import { GRANT_LIMIT, notifyOwnerOfChange } from "@/lib/account-access-routes";

export const dynamic = "force-dynamic";

// DELETE /api/access/grants/:id -- REQ-144: ends an unrestricted grant now,
// owner only. Owners themselves are not grants and cannot be removed here.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    await requireOwner(user.id);
    if (!isUuid(id)) return notFound("Grant not found");
    try {
      await consumeRateLimit("access_change", user.id, GRANT_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of access changes. Try again in an hour.");
      throw err;
    }
    const revoked = await revokeAccess({ id }, { via: "app", userId: user.id });
    if (!revoked) return notFound("Grant not found");
    await notifyOwnerOfChange(user.email, `You removed unrestricted access from ${revoked.email} in Ascendra.`);
    return ok({ revoked });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

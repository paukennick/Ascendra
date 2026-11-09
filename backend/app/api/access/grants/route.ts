import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { grantAccess, listAccess, requireOwner } from "@/lib/account-access";
import { parseGrantInput } from "@/lib/account-access-config";
import { GRANT_LIMIT, notifyOwnerOfChange } from "@/lib/account-access-routes";

export const dynamic = "force-dynamic";

// REQ-144: Settings > Access, owner only (OWNER_EMAILS, verified). Anyone
// else -- unrestricted accounts included -- gets 403.
//
// GET  /api/access/grants -> { owners, grants, history }
// POST /api/access/grants { email, until?: "YYYY-MM-DD", note? } -> { grant }
//   Gives unrestricted access to the address (or renews its live grant). An
//   address with no verified account waits and applies once one verifies.
//   Rate-limited, and the owner is emailed about every change, so a stolen
//   session token can't quietly hand out access.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    await requireOwner(user.id);
    return ok(await listAccess());
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    await requireOwner(user.id);
    const input = parseGrantInput(body);
    if (typeof input === "string") return badRequest(input);
    try {
      await consumeRateLimit("access_change", user.id, GRANT_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of access changes. Try again in an hour.");
      throw err;
    }
    const grant = await grantAccess(input, { via: "app", userId: user.id });
    await notifyOwnerOfChange(user.email, `You gave unrestricted access to ${grant.email}${grant.expiresAt ? ` until ${grant.expiresAt.slice(0, 10)}` : ""} in Ascendra.`);
    return ok({ grant });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

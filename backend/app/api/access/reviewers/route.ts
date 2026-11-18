import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { requireOwner } from "@/lib/account-access";
import { GRANT_LIMIT, notifyOwnerOfChange } from "@/lib/account-access-routes";
import { parseMarkInput } from "@/lib/reviewers-config";
import { listReviewers, markReviewer, reviewerCategories } from "@/lib/reviewers";

export const dynamic = "force-dynamic";

// REQ-331: Settings > Access > Reviewers, owner only (OWNER_EMAILS, verified;
// the server checks on every request). Anyone else gets 403.
//
// GET  /api/access/reviewers -> { reviewers, categories }
// POST /api/access/reviewers { email, areas?: category slugs, note? } -> { reviewer }
//   Marks the address as a reviewer: its live access grant gets the mark, or
//   a grant is created for it (ended again when the mark is taken off). An
//   address with no verified account waits and applies once one verifies.
//   Counted with grants against the owner's access-change limit and emailed
//   to the owner, like every access change.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    await requireOwner(user.id);
    return ok({ reviewers: await listReviewers(), categories: await reviewerCategories() });
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
    const input = parseMarkInput(body);
    if (typeof input === "string") return badRequest(input);
    try {
      await consumeRateLimit("access_change", user.id, GRANT_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of access changes. Try again in an hour.");
      throw err;
    }
    const reviewer = await markReviewer(input, { via: "app", userId: user.id });
    await notifyOwnerOfChange(user.email, `You marked ${reviewer.email} as a reviewer in Ascendra.`);
    return ok({ reviewer });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

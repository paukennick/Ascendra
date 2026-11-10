import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { grantAccess, listAccess, requireOwner, type GrantListItem } from "@/lib/account-access";
import { aiAccessMode } from "@/lib/ai-access-config";
import { BULK_GRANT_PER_RATE_UNIT, ownerEmails, parseBulkGrantInput, parseGrantInput } from "@/lib/account-access-config";
import { GRANT_LIMIT, notifyOwnerOfChange } from "@/lib/account-access-routes";

export const dynamic = "force-dynamic";

// REQ-144: Settings > Access, owner only (OWNER_EMAILS, verified). Anyone
// else -- unrestricted accounts included -- gets 403.
//
// GET  /api/access/grants -> { owners, grants, history }
// POST /api/access/grants { email, until?: "YYYY-MM-DD", note? } -> { grant }
// POST /api/access/grants { emails, until?, note? } -> { results } (REQ-201:
//   up to 50 addresses at once, e.g. an AI pilot group with note "AI pilot")
//   Gives unrestricted access to the address (or renews its live grant). An
//   address with no verified account waits and applies once one verifies.
//   Rate-limited, and the owner is emailed about every change, so a stolen
//   session token can't quietly hand out access.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    await requireOwner(user.id);
    // REQ-201: the AI access mode, so the screen can say who has full AI.
    return ok({ ...(await listAccess()), aiMode: aiAccessMode() });
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
    // REQ-201: several addresses at once (an AI pilot group).
    if (body && typeof body === "object" && "emails" in body) return await bulkGrant(body, user);
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

// REQ-201: POST { emails, until?, note? }. All addresses are checked before
// any is granted; each is then granted (or its live grant renewed) as above.
// An owner's address is reported, not granted. One summary email to the owner.
async function bulkGrant(body: unknown, user: { id: string; email: string }) {
  const input = parseBulkGrantInput(body);
  if (typeof input === "string") return badRequest(input);
  try {
    for (let i = 0; i < Math.ceil(input.emails.length / BULK_GRANT_PER_RATE_UNIT); i++) {
      await consumeRateLimit("access_change", user.id, GRANT_LIMIT, { userId: user.id });
    }
  } catch (err) {
    if (err instanceof RateLimitError) return tooManyRequests("That's a lot of access changes. Try again in an hour.");
    throw err;
  }
  const owners = ownerEmails();
  const results: Array<{ email: string; outcome: "granted" | "owner"; grant: GrantListItem | null }> = [];
  for (const email of input.emails) {
    if (owners.has(email)) {
      results.push({ email, outcome: "owner", grant: null });
      continue;
    }
    const grant = await grantAccess({ email, until: input.until, note: input.note }, { via: "app", userId: user.id });
    results.push({ email, outcome: "granted", grant });
  }
  const given = results.filter((r) => r.outcome === "granted").map((r) => r.email);
  if (given.length) {
    await notifyOwnerOfChange(
      user.email,
      `You gave unrestricted access to ${given.length} address${given.length === 1 ? "" : "es"}` +
        `${input.until ? ` until ${input.until.toISOString().slice(0, 10)}` : ""} in Ascendra: ${given.join(", ")}.`
    );
  }
  return ok({ results });
}

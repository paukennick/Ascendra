import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { revokeAllRefreshTokens } from "@/lib/auth/tokens";

export const dynamic = "force-dynamic";

// POST /api/auth/logout-all — revokes every session for the authenticated user.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await revokeAllRefreshTokens(user.id);
    return ok({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

import { ok, badRequest, serverError } from "@/lib/http";
import { revokeRefreshToken } from "@/lib/auth/tokens";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — { refreshToken } — revokes just this one session.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = body ?? {};
    if (!refreshToken || typeof refreshToken !== "string") {
      return badRequest("refreshToken is required");
    }
    await revokeRefreshToken(refreshToken);
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}

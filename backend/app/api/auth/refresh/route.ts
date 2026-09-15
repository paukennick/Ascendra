import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { rotateRefreshToken, RefreshTokenError } from "@/lib/auth/tokens";
import { signAccessToken } from "@/lib/auth/tokens";
import { queryOne } from "@/lib/db";
import { getClientIp, getUserAgent } from "@/lib/auth/util";

export const dynamic = "force-dynamic";

// POST /api/auth/refresh — { refreshToken, deviceLabel? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken, deviceLabel } = body ?? {};
    if (!refreshToken || typeof refreshToken !== "string") {
      return badRequest("refreshToken is required");
    }

    let rotated;
    try {
      rotated = await rotateRefreshToken(refreshToken, {
        deviceLabel: typeof deviceLabel === "string" ? deviceLabel : undefined,
        userAgent: getUserAgent(req),
        ip: getClientIp(req),
      });
    } catch (err) {
      if (err instanceof RefreshTokenError) return unauthorized(err.message);
      throw err;
    }

    const user = await queryOne<{ id: string; email: string }>("select id, email from app_users where id = $1", [
      rotated.userId,
    ]);
    if (!user) return unauthorized("Account no longer exists.");

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return ok({ accessToken, refreshToken: rotated.raw });
  } catch (err) {
    return serverError(err);
  }
}

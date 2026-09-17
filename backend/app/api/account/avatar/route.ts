import { query } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { processAvatarUpload, AvatarError } from "@/lib/auth/avatar";

export const dynamic = "force-dynamic";

// POST /api/account/avatar — set/replace the caller's own avatar.
// Body: { imageBase64 } (raw image bytes, base64-encoded; JPEG/PNG/WebP).
// Always writes to the authenticated user's own row -- there is no
// user-supplied id anywhere in this route, so it can't be pointed at
// another account.
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);

    try {
      await checkRateLimit("avatar_upload", authUser.id, { max: 20, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("avatar_upload", authUser.id);

    const body = await req.json();
    const imageBase64 = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return badRequest("imageBase64 is required");
    }

    const { data, contentType } = await processAvatarUpload(imageBase64);
    await query(
      `update app_users set avatar_image = $1, avatar_content_type = $2, avatar_updated_at = now() where id = $3`,
      [data, contentType, authUser.id]
    );

    return ok({ avatarDataUrl: `data:${contentType};base64,${data.toString("base64")}` });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AvatarError) return badRequest(err.message);
    return serverError(err);
  }
}

// DELETE /api/account/avatar — remove the caller's own avatar (falls back to
// the initials avatar client-side).
export async function DELETE(req: Request) {
  try {
    const authUser = await requireUser(req);
    await query(
      `update app_users set avatar_image = null, avatar_content_type = null, avatar_updated_at = now() where id = $1`,
      [authUser.id]
    );
    return ok({ avatarDataUrl: null });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

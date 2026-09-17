import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  mfa_enabled: boolean;
  totp_enabled: boolean;
  email_mfa_enabled: boolean;
  avatar_image: Buffer | null;
  avatar_content_type: string | null;
  has_password: boolean;
  google_linked: boolean;
}

const PROFILE_SELECT = `
  select
    u.id, u.email, u.display_name, u.mfa_enabled, u.avatar_image, u.avatar_content_type,
    (u.totp_secret_enc is not null) as totp_enabled,
    u.email_mfa_enabled,
    (u.password_hash is not null) as has_password,
    exists(select 1 from oauth_accounts oa where oa.user_id = u.id and oa.provider = 'google') as google_linked
  from app_users u
  where u.id = $1
`;

function toUserResponse(row: ProfileRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    mfaEnabled: row.mfa_enabled,
    totpEnabled: row.totp_enabled,
    emailMfaEnabled: row.email_mfa_enabled,
    hasPassword: row.has_password,
    googleLinked: row.google_linked,
    avatarDataUrl:
      row.avatar_image && row.avatar_content_type
        ? `data:${row.avatar_content_type};base64,${row.avatar_image.toString("base64")}`
        : null,
  };
}

// GET /api/auth/me — current user's full profile, for resolving a cold-start
// silent refresh into a full user object (refresh itself only returns tokens).
export async function GET(req: Request) {
  try {
    const authUser = await requireUser(req);
    const row = await queryOne<ProfileRow>(PROFILE_SELECT, [authUser.id]);
    if (!row) return notFound("Account no longer exists.");
    return ok({ user: toUserResponse(row) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PATCH /api/auth/me — update editable profile fields. Body: { displayName }
export async function PATCH(req: Request) {
  try {
    const authUser = await requireUser(req);
    const body = await req.json();
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : undefined;
    if (displayName === undefined) return badRequest("displayName is required");
    if (displayName.length === 0 || displayName.length > 100) {
      return badRequest("displayName must be between 1 and 100 characters");
    }

    await query("update app_users set display_name = $1 where id = $2", [displayName, authUser.id]);
    const row = await queryOne<ProfileRow>(PROFILE_SELECT, [authUser.id]);
    if (!row) return notFound("Account no longer exists.");
    return ok({ user: toUserResponse(row) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

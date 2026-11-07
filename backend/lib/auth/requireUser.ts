import { queryOne } from "../db";
import { verifyAccessToken } from "./tokens";

export class AuthError extends Error {}

export interface AuthenticatedUser {
  id: string;
  email: string;
  // REQ-116: the refresh-token family of the caller's session, or null for
  // a token signed before migration 044. Used to keep the caller signed in
  // when every other session is revoked.
  familyId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// REQ-116 (audit 3): an access token used to be checked by signature and
// expiry only, so after account deletion, logout-all or a password change a
// stolen token kept working for up to 15 minutes. Now the token's `ver`
// claim must equal the account's token_version, read with one primary-key
// lookup (measured at well under a millisecond on the local database; see
// the REQ-116 notes in lib/auth/sessionControl.ts). A deleted account has no
// row, so its tokens stop at once. The email comes from the row too, so a
// confirmed email change is seen immediately rather than when the token
// expires.
export async function requireUser(req: Request): Promise<AuthenticatedUser> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header.");
  }
  const token = header.slice("Bearer ".length).trim();
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AuthError("Invalid or expired access token.");
  }
  if (!UUID.test(payload.sub)) throw new AuthError("Invalid or expired access token.");
  const row = await queryOne<{ email: string; token_version: number }>(
    `select email, token_version from app_users where id = $1`,
    [payload.sub]
  );
  if (!row) throw new AuthError("Account no longer exists.");
  if (row.token_version !== payload.ver) throw new AuthError("This session has been signed out. Sign in again.");
  return { id: payload.sub.toLowerCase(), email: row.email, familyId: payload.fam };
}

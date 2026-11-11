import { queryOne } from "../db";
import { verifyAccessToken } from "./tokens";
import { UserFacingError } from "../http";
import { legalContext, pendingFromRows } from "../legal";

export class AuthError extends Error {}

export interface AuthenticatedUser {
  id: string;
  email: string;
  // REQ-116: the refresh-token family of the caller's session, or null for
  // a token signed before migration 044. Used to keep the caller signed in
  // when every other session is revoked.
  familyId: string | null;
}

// REQ-219 (FAIL-1109, Nick's decision): the Terms and Privacy Policy are
// enforced on the server too. The app asks on launch, but a request made
// without the app -- or by a build that skipped the prompt -- used to get
// everything. Every route that signs a caller in through requireUser now
// answers 403 { code: "terms_required" } (a 4xx whose message the app shows)
// until the account has accepted what ITS CLIENT must accept: lib/legal.ts
// legalContext reads X-Ascendra-App / X-Ascendra-Legal, so an installed build
// that can only show an older text, and accepted it, is not asked for the
// current one and does not loop. The routes the person needs in order to
// agree, leave or ask for help pass `{ termsOptional: true }`: the accept
// routes, onboarding (the state the launch gate reads), auth/me (read),
// account export and delete, sign-out everywhere, and support.
export const TERMS_REQUIRED_CODE = "terms_required";
export const TERMS_REQUIRED_MESSAGE =
  "Please agree to the updated Terms of Service and Privacy Policy to keep using Ascendra. You'll be asked when you open the app, and you can read them in Settings.";

// Test seam: the test preload (lib/test-setup.ts) switches enforcement off for
// the suites that exercise other things with users who never accepted; the
// suite that tests enforcement switches it back on. Production never calls it.
let termsEnforced = true;
export function __setTermsEnforcementForTest(on: boolean): void {
  termsEnforced = on;
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
export async function requireUser(req: Request, opts: { termsOptional?: boolean } = {}): Promise<AuthenticatedUser> {
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
  // The acceptance rows come in the same round trip (FAIL-1109): no extra
  // query on any route.
  const row = await queryOne<{ email: string; token_version: number; accepted: { document: string; version: string }[] }>(
    `select email, token_version,
            coalesce((select json_agg(json_build_object('document', document, 'version', version))
                        from legal_acceptances where user_id = app_users.id), '[]'::json) as accepted
       from app_users where id = $1`,
    [payload.sub]
  );
  if (!row) throw new AuthError("Account no longer exists.");
  if (row.token_version !== payload.ver) throw new AuthError("This session has been signed out. Sign in again.");
  if (termsEnforced && !opts.termsOptional) {
    const pending = pendingFromRows(row.accepted, legalContext(req));
    if (pending.length > 0) {
      throw new UserFacingError(TERMS_REQUIRED_MESSAGE, 403, { code: TERMS_REQUIRED_CODE, pending });
    }
  }
  return { id: payload.sub.toLowerCase(), email: row.email, familyId: payload.fam };
}

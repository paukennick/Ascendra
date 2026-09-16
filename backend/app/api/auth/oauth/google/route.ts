import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { verifyGoogleIdToken } from "@/lib/auth/oauth";
import { createLoginChallenge } from "@/lib/auth/mfaChallenge";
import { completeLogin } from "@/lib/auth/session";
import { recordAuthEvent } from "@/lib/auth/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/auth/util";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  mfa_enabled: boolean;
}

// POST /api/auth/oauth/google — { idToken, deviceLabel? }. The mobile app
// gets idToken client-side via Expo AuthSession's Google provider; this
// route only ever trusts a *verified* token, never client-supplied claims.
//
// Three paths depending on what's already in the database:
//  1. This Google identity (provider_account_id) is already linked -> log in as that user.
//  2. No link yet, but an app_users row already has this (Google-verified) email
//     -> link this Google identity to that existing account, then log in.
//  3. Neither exists -> create a new OAuth-only account (no password_hash) and log in.
// An account reached via Google still goes through the normal MFA challenge
// if it has MFA enabled -- linking a second sign-in method doesn't bypass it.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idToken, deviceLabel } = body ?? {};
    if (!idToken || typeof idToken !== "string") {
      return badRequest("idToken is required");
    }

    const identity = await verifyGoogleIdToken(idToken);
    if (!identity.emailVerified) {
      return unauthorized("Google account email is not verified.");
    }
    const normalizedEmail = identity.email.toLowerCase().trim();
    const ip = getClientIp(req);
    const meta = { deviceLabel: typeof deviceLabel === "string" ? deviceLabel : null, userAgent: getUserAgent(req), ip };

    const linked = await queryOne<UserRow>(
      `select u.id, u.email, u.display_name, u.mfa_enabled
       from oauth_accounts oa join app_users u on u.id = oa.user_id
       where oa.provider = 'google' and oa.provider_account_id = $1`,
      [identity.providerAccountId]
    );

    let user: UserRow;
    if (linked) {
      user = linked;
    } else {
      const existing = await queryOne<UserRow>(
        `select id, email, display_name, mfa_enabled from app_users where email = $1`,
        [normalizedEmail]
      );
      if (existing) {
        user = existing;
      } else {
        const created = await queryOne<UserRow>(
          `insert into app_users (email, display_name, email_verified_at)
           values ($1, $2, now())
           returning id, email, display_name, mfa_enabled`,
          [normalizedEmail, identity.name]
        );
        if (!created) throw new Error("Failed to create account.");
        user = created;
      }
      await query(
        `insert into oauth_accounts (user_id, provider, provider_account_id, email)
         values ($1, 'google', $2, $3)
         on conflict (provider, provider_account_id) do nothing`,
        [user.id, identity.providerAccountId, normalizedEmail]
      );
    }

    if (user.mfa_enabled) {
      await recordAuthEvent("login_mfa_challenge", normalizedEmail, { ip, userId: user.id });
      const challengeToken = await createLoginChallenge(user.id, meta);
      return ok({ mfaRequired: true, challengeToken });
    }

    await recordAuthEvent("login_success", normalizedEmail, { ip, userId: user.id });
    const session = await completeLogin(user, meta);
    return ok(session);
  } catch (err) {
    return serverError(err);
  }
}

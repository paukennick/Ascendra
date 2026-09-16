import { OAuth2Client } from "google-auth-library";

// Expo's AuthSession issues a Google ID token whose audience is whichever
// client ID the app registered for the platform it's running on (web/Expo
// Go, iOS, Android can each need their own client ID in Google Cloud
// Console) -- accept a comma-separated list so all of them verify here
// without code changes as platforms are added.
function getAllowedClientIds(): string[] {
  const raw = process.env.GOOGLE_OAUTH_CLIENT_IDS;
  if (!raw) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_IDS is not set. Add it in Vercel project env vars (or .env.local for local dev) — see backend/.env.example."
    );
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export interface GoogleIdentity {
  providerAccountId: string; // Google's stable "sub" claim
  email: string;
  emailVerified: boolean;
  name: string | null;
}

// Verifies a Google-issued ID token's signature, expiry, issuer, and
// audience against our registered client ID(s) -- never trust an ID token's
// claims without this, since anyone can construct a JWT-shaped string.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const allowedClientIds = getAllowedClientIds();
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({ idToken, audience: allowedClientIds });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Google ID token did not include the expected claims.");
  }
  return {
    providerAccountId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? null,
  };
}

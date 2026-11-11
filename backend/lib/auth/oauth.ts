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
  // REQ-116: seconds since the epoch when Google issued the token. A
  // re-authentication (email change, MFA off on a Google-only account)
  // accepts only a token issued in the last few minutes.
  issuedAt: number | null;
}

// Tests replace the network call to Google with a stub.
let verifierOverride: ((idToken: string) => Promise<GoogleIdentity>) | null = null;
export function __setGoogleVerifierForTest(fn: ((idToken: string) => Promise<GoogleIdentity>) | null): void {
  verifierOverride = fn;
}

// REQ-219 (FAIL-1102): Google (or the signature, audience or clock) refused
// this token. That is the caller's problem -- a stale, forged or wrong-app
// token -- not a fault of ours, so routes answer 401 and do not report it.
// A server that is missing GOOGLE_OAUTH_CLIENT_IDS, or cannot reach Google's
// keys, still throws its own error: that one is ours, and a 500 reported.
export class GoogleTokenError extends Error {
  constructor(message = "Google sign-in couldn't be confirmed.") {
    super(message);
    this.name = "GoogleTokenError";
  }
}

// Network and server-side failures reaching Google's certificate endpoint.
function isTransportFailure(err: unknown): boolean {
  const e = err as { name?: string; code?: unknown; response?: { status?: number } } | null;
  if (e?.name === "GaxiosError" && !(typeof e.response?.status === "number" && e.response.status < 500)) return true;
  return typeof e?.code === "string" && /^(E[A-Z]+|UND_ERR.*)$/.test(e.code);
}

// Verifies a Google-issued ID token's signature, expiry, issuer, and
// audience against our registered client ID(s) -- never trust an ID token's
// claims without this, since anyone can construct a JWT-shaped string.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (verifierOverride) return verifierOverride(idToken);
  const allowedClientIds = getAllowedClientIds();
  const client = new OAuth2Client();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: allowedClientIds });
    payload = ticket.getPayload();
  } catch (err) {
    if (isTransportFailure(err)) throw err;
    throw new GoogleTokenError();
  }
  if (!payload || !payload.sub || !payload.email) throw new GoogleTokenError("Google ID token did not include the expected claims.");
  return {
    providerAccountId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? null,
    issuedAt: typeof payload.iat === "number" ? payload.iat : null,
  };
}

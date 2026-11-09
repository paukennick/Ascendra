// REQ-166: verification providers for verified group discounts. A provider
// confirms that a person belongs to a group (military, responder, nurse,
// student, teacher) through its own sign-in, and tells us only the result.
//
// This file is provider-agnostic. It defines the interface, the registry
// and the browser round trip (signed state + PKCE), and holds NO live
// provider: PROVIDERS is empty here, so with nothing registered the feature
// is unavailable whatever the switches say. A provider (ID.me under REQ-167,
// SheerID later) is one module implementing VerificationProvider plus one
// callback route that calls finishVerification; it is added to PROVIDERS.
//
// The round trip:
//   1. POST /api/discounts/verify { group, client } (signed in): we sign a
//      short-lived state naming the account, the group, the provider and
//      where to return, derive a PKCE verifier from it, and answer the
//      provider's authorization URL.
//   2. The learner signs in with the provider, which redirects to our
//      provider-specific callback with ?code&state.
//   3. The callback checks the state's signature and age, exchanges the code
//      (with the PKCE verifier) and records ONLY the result
//      (lib/verified-discounts.ts recordVerification), then redirects to the
//      app or web page named in the state -- never to a URL from the request.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { DiscountGroup } from "./verified-discounts-config";
import { idmeProvider } from "./discount-provider-idme";

type Env = Record<string, string | undefined>;

export interface VerificationOutcome {
  // The provider's opaque, stable id for the person (not an email or name).
  subject: string;
  // Groups the provider confirmed for this person. Only these count.
  verifiedGroups: string[];
  // When the provider says the verification ends, if it does.
  expiresAt?: Date | null;
}

export interface VerificationProvider {
  // "idme", "sheerid": lowercase, stored in verified_discounts.provider.
  id: string;
  // What the learner reads: "ID.me".
  label: string;
  // True only when its credentials are set. Never throws.
  configured(env: Env): boolean;
  // The groups this provider can verify.
  groups(env: Env): readonly DiscountGroup[];
  // The URL to send the learner to. `state` and `codeChallenge` (S256) must
  // be passed through unchanged.
  authorizationUrl(input: { group: DiscountGroup; state: string; codeChallenge: string }, env: Env): string;
  // Exchange the code for the result. Throws on any provider error.
  complete(input: { code: string; codeVerifier: string; group: DiscountGroup }, env: Env): Promise<VerificationOutcome>;
}

// The registry. REQ-166 left it empty; REQ-167 adds ID.me, which stays
// unconfigured (and the feature off) until IDME_CLIENT_ID,
// IDME_CLIENT_SECRET and IDME_REDIRECT_URI are set.
const PROVIDERS: VerificationProvider[] = [idmeProvider];

// Tests (and only tests) swap the registry for a mock provider.
let override: VerificationProvider[] | null = null;
export function __setProvidersForTest(list: VerificationProvider[] | null): void {
  override = list;
}

export function allProviders(): readonly VerificationProvider[] {
  return override ?? PROVIDERS;
}

export function configuredProviders(env: Env = process.env): VerificationProvider[] {
  return allProviders().filter((p) => {
    try {
      return p.configured(env);
    } catch {
      return false;
    }
  });
}

export function providerById(id: string, env: Env = process.env): VerificationProvider | null {
  return configuredProviders(env).find((p) => p.id === id) ?? null;
}

// The first configured provider that can verify the group.
export function providerForGroup(group: DiscountGroup, env: Env = process.env): VerificationProvider | null {
  return configuredProviders(env).find((p) => p.groups(env).includes(group)) ?? null;
}

export function verifiableGroups(env: Env = process.env): Set<string> {
  const out = new Set<string>();
  for (const p of configuredProviders(env)) for (const g of p.groups(env)) out.add(g);
  return out;
}

// ---------------------------------------------------------------------------
// Signed state and PKCE. The key is derived from AUTH_JWT_SECRET (always set
// in a deployed backend) with its own label, so no new secret is needed.
// ---------------------------------------------------------------------------

export type ReturnTo = "app" | "web";
export const STATE_TTL_MS = 15 * 60 * 1000;

export interface VerificationState {
  userId: string;
  group: DiscountGroup;
  provider: string;
  returnTo: ReturnTo;
  nonce: string;
  exp: number; // ms since epoch
}

function stateKey(env: Env): Buffer {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not set.");
  return createHmac("sha256", secret).update("ascendra:verified-discount-state:v1").digest();
}

const b64url = (b: Buffer) => b.toString("base64url");

export function signState(s: Omit<VerificationState, "nonce" | "exp">, env: Env = process.env, now = Date.now()): string {
  const full: VerificationState = { ...s, nonce: b64url(randomBytes(18)), exp: now + STATE_TTL_MS };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = b64url(createHmac("sha256", stateKey(env)).update(body).digest());
  return `${body}.${sig}`;
}

// null for anything forged, altered, expired or malformed.
export function readState(token: unknown, env: Env = process.env, now = Date.now()): VerificationState | null {
  if (typeof token !== "string" || token.length > 2000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const want = createHmac("sha256", stateKey(env)).update(body).digest();
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let s: any;
  try {
    s = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!s || typeof s.userId !== "string" || typeof s.group !== "string" || typeof s.provider !== "string") return null;
  if (s.returnTo !== "app" && s.returnTo !== "web") return null;
  if (typeof s.nonce !== "string" || typeof s.exp !== "number" || s.exp < now) return null;
  return s as VerificationState;
}

// The PKCE verifier is derived from the state's nonce, so nothing has to be
// stored between the two requests; the challenge is its S256 hash.
export function pkceVerifier(state: VerificationState, env: Env = process.env): string {
  return b64url(createHmac("sha256", stateKey(env)).update(`pkce:${state.nonce}`).digest());
}

export function pkceChallenge(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

// Where the learner lands afterwards. Fixed per client -- never taken from
// the request -- so the callback can't be used as an open redirect.
export const APP_RETURN_URL = "preplms://settings/discount";

export function returnUrl(returnTo: ReturnTo, result: "verified" | "not_verified" | "failed" | "taken" | "expired", env: Env = process.env): string {
  const q = `verify=${result}`;
  if (returnTo === "app") return `${APP_RETURN_URL}?${q}`;
  const base = (env.BILLING_WEB_RETURN_URL ?? env.APP_URL ?? "").replace(/\/$/, "");
  return `${base}/settings/discount?${q}`;
}

// REQ-167: ID.me as a verification provider for verified group discounts
// (REQ-166, lib/discount-providers.ts). OAuth 2.0 authorization code with
// PKCE, one ID.me community ("group") scope per request, then the
// attributes endpoint's status array decides the result.
//
// From ID.me's developer documentation (docs.id.me, checked 2026-11-09):
//   - Authorize: GET https://api.id.me/oauth/authorize with client_id,
//     redirect_uri, response_type=code, scope, state, code_challenge and
//     code_challenge_method=S256.
//   - Token: POST https://api.id.me/oauth/token with grant_type=
//     authorization_code, code, client_id, client_secret, redirect_uri and
//     code_verifier.
//   - Attributes: GET https://api.id.me/api/public/v3/attributes.json with
//     the access_token. The answer has `attributes` (handle, name, value;
//     the `uuid` handle is ID.me's id for the person) and `status` (group,
//     subgroups, verified).
//   - Community scopes: military, responder, student, teacher, nurse (and
//     others we don't offer). Our group ids are the same words.
//   - Sandbox host: https://api.idmelabs.com.
//
// We read only the uuid (stored as the opaque subject) and which groups are
// verified. Nothing else from the answer is kept or logged, and the access
// token is used once and dropped.
//
// Env: IDME_CLIENT_ID, IDME_CLIENT_SECRET, IDME_REDIRECT_URI (exactly
// <backend>/api/discounts/verify/idme/callback, registered with ID.me),
// IDME_ENVIRONMENT ("sandbox" or "production", default production),
// IDME_GROUPS (optional comma list limiting the groups sent to ID.me).
// Without the three credentials the provider is unconfigured and verified
// discounts stay off.

import type { VerificationOutcome, VerificationProvider } from "./discount-providers";
import { DISCOUNT_GROUPS, type DiscountGroup } from "./verified-discounts-config";

type Env = Record<string, string | undefined>;

export const IDME_HOSTS = { production: "https://api.id.me", sandbox: "https://api.idmelabs.com" } as const;

// Our group id -> ID.me's community scope.
export const IDME_SCOPES: Record<DiscountGroup, string> = {
  military: "military",
  responder: "responder",
  nurse: "nurse",
  student: "student",
  teacher: "teacher",
};

export const IDME_CALLBACK_PATH = "/api/discounts/verify/idme/callback";

export function idmeHost(env: Env): string {
  return env.IDME_ENVIRONMENT?.trim().toLowerCase() === "sandbox" ? IDME_HOSTS.sandbox : IDME_HOSTS.production;
}

function creds(env: Env): { id: string; secret: string; redirect: string } | null {
  const id = env.IDME_CLIENT_ID?.trim();
  const secret = env.IDME_CLIENT_SECRET?.trim();
  const redirect = env.IDME_REDIRECT_URI?.trim();
  if (!id || !secret || !redirect) return null;
  // The redirect must be our https callback (http only for a local backend).
  let u: URL;
  try {
    u = new URL(redirect);
  } catch {
    return null;
  }
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.pathname !== IDME_CALLBACK_PATH || (u.protocol !== "https:" && !(local && u.protocol === "http:"))) return null;
  return { id, secret, redirect };
}

class IdmeError extends Error {}

async function readJsonResponse(res: Response, what: string): Promise<any> {
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  // Only the status and ID.me's error code are logged -- never the body,
  // which carries personal attributes on success.
  if (!res.ok || !body || typeof body !== "object") {
    throw new IdmeError(`ID.me ${what} failed: ${res.status} ${typeof body?.error === "string" ? body.error : ""}`.trim());
  }
  return body;
}

// The pieces of an attributes.json answer we use. Exported for tests.
export function parseAttributes(body: any): VerificationOutcome {
  const attrs: any[] = Array.isArray(body?.attributes) ? body.attributes : [];
  const uuid = attrs.find((a) => a && a.handle === "uuid")?.value;
  const status: any[] = Array.isArray(body?.status) ? body.status : [];
  const verifiedGroups = [
    ...new Set(status.filter((s) => s && s.verified === true && typeof s.group === "string").map((s) => String(s.group).toLowerCase())),
  ];
  return { subject: typeof uuid === "string" || typeof uuid === "number" ? String(uuid) : "", verifiedGroups, expiresAt: null };
}

export const idmeProvider: VerificationProvider = {
  id: "idme",
  label: "ID.me",
  configured: (env) => creds(env) !== null,
  groups(env) {
    const raw = env.IDME_GROUPS?.trim();
    if (!raw) return DISCOUNT_GROUPS;
    const want = new Set(raw.split(",").map((s) => s.trim().toLowerCase()));
    return DISCOUNT_GROUPS.filter((g) => want.has(g));
  },
  authorizationUrl({ group, state, codeChallenge }, env) {
    const c = creds(env);
    if (!c) throw new IdmeError("ID.me isn't configured.");
    const q = new URLSearchParams({
      client_id: c.id,
      redirect_uri: c.redirect,
      response_type: "code",
      scope: IDME_SCOPES[group],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${idmeHost(env)}/oauth/authorize?${q.toString()}`;
  },
  async complete({ code, codeVerifier }, env) {
    const c = creds(env);
    if (!c) throw new IdmeError("ID.me isn't configured.");
    const host = idmeHost(env);
    const tokenRes = await fetch(`${host}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: c.id,
        client_secret: c.secret,
        redirect_uri: c.redirect,
        code_verifier: codeVerifier,
      }).toString(),
    });
    const token = await readJsonResponse(tokenRes, "token exchange");
    if (typeof token.access_token !== "string" || !token.access_token) throw new IdmeError("ID.me token exchange returned no access token");
    const attrRes = await fetch(`${host}/api/public/v3/attributes.json?${new URLSearchParams({ access_token: token.access_token })}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return parseAttributes(await readJsonResponse(attrRes, "attributes"));
  },
};

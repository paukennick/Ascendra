import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { query, queryOne, withTransaction } from "../db";
import { isPlaceholderSecret } from "../env-check";

// Access tokens are stateless JWTs -- short-lived specifically because they
// can't be revoked mid-flight. Refresh tokens are opaque random values;
// only their sha256 hash is ever stored, and they're rotated on every use
// (see rotateRefreshToken).
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_JWT_SECRET is not set. Add it in Vercel project env vars (or .env.local for local dev) — see backend/.env.example."
    );
  }
  // REQ-116: also refused per use, in case the startup hook didn't run.
  if (process.env.NODE_ENV === "production" && isPlaceholderSecret(secret)) {
    throw new Error("AUTH_JWT_SECRET still has the .env.example placeholder value. Set a real secret.");
  }
  return secret;
}

// REQ-116: `ver` is the account's token_version when the token was signed
// (migration 044). requireUser refuses a token whose version is behind the
// account's, which is how logout-all, a password change or reset, enabling
// MFA and account deletion end access tokens already handed out, instead of
// leaving them usable for up to 15 minutes. A token without `ver` (signed
// before 044) counts as version 0. `fam` is the refresh-token family of the
// session the token belongs to, so "sign out every other device" can keep
// the caller's own session.
export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  ver?: number;
  fam?: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const claims: Record<string, unknown> = { sub: payload.sub, email: payload.email };
  if (typeof payload.ver === "number") claims.ver = payload.ver;
  if (payload.fam) claims.fam = payload.fam;
  return jwt.sign(claims, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): Required<Pick<AccessTokenPayload, "sub" | "email" | "ver">> & {
  fam: string | null;
} {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & { email?: string; ver?: unknown; fam?: unknown };
  if (!decoded.sub || !decoded.email) {
    throw new Error("Malformed access token payload.");
  }
  return {
    sub: decoded.sub,
    email: decoded.email,
    ver: typeof decoded.ver === "number" && Number.isInteger(decoded.ver) ? decoded.ver : 0,
    fam: typeof decoded.fam === "string" ? decoded.fam : null,
  };
}

// REQ-203 (FAIL-866): sign-out accepts an access token that is validly signed
// but past its 15 minutes, because the app signs out after being away and the
// token is then stale. It still has to be a token this server signed, and not
// older than a refresh token can live. It only ever names a session to end.
const LOGOUT_TOKEN_MAX_AGE_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export function verifyAccessTokenForLogout(token: string): { sub: string; fam: string | null } | null {
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, getJwtSecret(), { ignoreExpiration: true }) as jwt.JwtPayload;
  } catch (err) {
    // A bad signature or a malformed token names nothing. Anything else (the
    // signing secret missing) is a server fault and propagates.
    if (err instanceof jwt.JsonWebTokenError) return null;
    throw err;
  }
  if (typeof decoded.sub !== "string" || !decoded.sub) return null;
  if (typeof decoded.iat !== "number" || Date.now() / 1000 - decoded.iat > LOGOUT_TOKEN_MAX_AGE_SECONDS) return null;
  const fam = (decoded as { fam?: unknown }).fam;
  return { sub: decoded.sub, fam: typeof fam === "string" ? fam : null };
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export interface RefreshTokenMeta {
  deviceLabel?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export interface IssuedRefreshToken {
  raw: string;
  familyId: string;
}

// Issues a brand-new refresh token family -- used at registration and fresh
// (non-refresh) login.
export async function createRefreshToken(
  userId: string,
  meta: RefreshTokenMeta = {}
): Promise<IssuedRefreshToken> {
  const raw = generateOpaqueToken();
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `insert into refresh_tokens (user_id, family_id, token_hash, device_label, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, familyId, hashToken(raw), meta.deviceLabel ?? null, meta.userAgent ?? null, meta.ip ?? null, expiresAt]
  );
  return { raw, familyId };
}

export class RefreshTokenError extends Error {}

// REQ-203 (FAIL-865): two tabs refreshing at the same moment each present
// the same token. One wins; the other used to look like a stolen-token replay
// and revoked the whole family, signing the learner out everywhere. A token
// replayed within this many seconds of its own rotation is that race, not
// theft, and gets its own live token in the same family. Later replays still
// revoke the family.
export const REFRESH_REUSE_GRACE_SECONDS = 10;
// A rotated token's successor plus this many grace replays; more than any tab
// count, small enough that a replayed stolen token can't mint without limit.
const REFRESH_GRACE_MAX_TOKENS = 6;

// Verifies + rotates a presented refresh token. Reuse of an already-revoked
// token is treated as a theft signal: the entire family is revoked and this
// throws, forcing the legitimate device to log in again too.
//
// The presented token is consumed with one guarded UPDATE (revoked_at is
// null), so of any number of concurrent rotations of the same token exactly
// one gets a row back; the rest are treated as reuse. Consuming and minting
// the successor share a transaction, so a failure can't leave the old token
// spent with no replacement.
export async function rotateRefreshToken(
  rawToken: string,
  meta: RefreshTokenMeta = {}
): Promise<{ userId: string; raw: string; familyId: string }> {
  const tokenHash = hashToken(rawToken);
  const newRaw = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const rotated = await withTransaction(async (tx) => {
    const consumed = await tx.queryOne<{
      id: string;
      user_id: string;
      family_id: string;
      device_label: string | null;
      user_agent: string | null;
    }>(
      `update refresh_tokens set revoked_at = now()
       where token_hash = $1 and revoked_at is null and expires_at > now()
       returning id, user_id, family_id, device_label, user_agent`,
      [tokenHash]
    );
    if (!consumed) return null;

    const inserted = await tx.queryOne<{ id: string }>(
      `insert into refresh_tokens (user_id, family_id, token_hash, device_label, user_agent, ip, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        consumed.user_id,
        consumed.family_id,
        hashToken(newRaw),
        meta.deviceLabel ?? consumed.device_label,
        meta.userAgent ?? consumed.user_agent,
        meta.ip ?? null,
        expiresAt,
      ]
    );
    await tx.query(`update refresh_tokens set replaced_by_id = $2 where id = $1`, [consumed.id, inserted?.id ?? null]);
    return { userId: consumed.user_id, familyId: consumed.family_id };
  });
  if (rotated) return { userId: rotated.userId, raw: newRaw, familyId: rotated.familyId };

  // Not consumed: work out why. A concurrent loser blocks on the winner's row
  // lock until it commits, so the winner's successor is already visible to
  // the family revoke below.
  const row = await queryOne<{ family_id: string; revoked_at: string | null }>(
    `select family_id, revoked_at from refresh_tokens where token_hash = $1`,
    [tokenHash]
  );
  if (!row) {
    throw new RefreshTokenError("Refresh token not recognized.");
  }
  if (row.revoked_at) {
    // REQ-203 (FAIL-865): a token rotated moments ago, whose session is still
    // live, is a cross-tab race. One guarded statement checks all of that and
    // mints the replay's own token, so it can't interleave with a logout.
    const graced = await queryOne<{ user_id: string; family_id: string }>(
      `insert into refresh_tokens (user_id, family_id, token_hash, device_label, user_agent, ip, expires_at)
       select o.user_id, o.family_id, $2, coalesce($3::text, o.device_label), coalesce($4::text, o.user_agent), $5, $6
         from refresh_tokens o
        where o.token_hash = $1
          and o.replaced_by_id is not null
          and o.revoked_at > now() - make_interval(secs => $7::int)
          and o.expires_at > now()
          and exists (select 1 from refresh_tokens l
                       where l.family_id = o.family_id and l.revoked_at is null and l.expires_at > now())
          and (select count(*) from refresh_tokens s
                where s.family_id = o.family_id and s.created_at >= o.revoked_at) < $8::int
       returning user_id, family_id`,
      [
        tokenHash,
        hashToken(newRaw),
        meta.deviceLabel ?? null,
        meta.userAgent ?? null,
        meta.ip ?? null,
        expiresAt,
        REFRESH_REUSE_GRACE_SECONDS,
        REFRESH_GRACE_MAX_TOKENS,
      ]
    );
    if (graced) return { userId: graced.user_id, raw: newRaw, familyId: graced.family_id };

    await query(`update refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null`, [
      row.family_id,
    ]);
    throw new RefreshTokenError("Refresh token already used. All sessions in this family were revoked.");
  }
  // Present, unrevoked, and not consumable: only expiry is left.
  throw new RefreshTokenError("Refresh token expired.");
}

// Ends the session a refresh token belongs to. REQ-203 (FAIL-867): this used
// to revoke only the presented token, so a token that had already rotated
// (the app signed out holding the previous one, or a second tab did) left its
// successor live. It revokes every live token of the token's family.
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await query(
    `update refresh_tokens set revoked_at = now()
      where revoked_at is null
        and family_id = (select family_id from refresh_tokens where token_hash = $1)`,
    [hashToken(rawToken)]
  );
}

// REQ-192: ends one session -- every live token of the family -- for the
// signed-in caller. Scoped by user so a family id alone revokes nothing.
export async function revokeRefreshFamily(userId: string, familyId: string): Promise<number> {
  const rows = await query(
    `update refresh_tokens set revoked_at = now()
     where user_id = $1 and family_id = $2 and revoked_at is null returning id`,
    [userId, familyId]
  );
  return rows.length;
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await query(`update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null`, [userId]);
}

import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { query, queryOne, withTransaction } from "../db";

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
  return secret;
}

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & { email?: string };
  if (!decoded.sub || !decoded.email) {
    throw new Error("Malformed access token payload.");
  }
  return { sub: decoded.sub, email: decoded.email };
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
): Promise<{ userId: string; raw: string }> {
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
    return { userId: consumed.user_id };
  });
  if (rotated) return { userId: rotated.userId, raw: newRaw };

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
    await query(`update refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null`, [
      row.family_id,
    ]);
    throw new RefreshTokenError("Refresh token already used. All sessions in this family were revoked.");
  }
  // Present, unrevoked, and not consumable: only expiry is left.
  throw new RefreshTokenError("Refresh token expired.");
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await query(`update refresh_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null`, [
    hashToken(rawToken),
  ]);
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await query(`update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null`, [userId]);
}

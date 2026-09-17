import crypto from "node:crypto";
import { query, queryOne } from "../db";

const CHALLENGE_TTL_MINUTES = 10;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export interface ChallengeMeta {
  deviceLabel?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

// Created by /api/auth/login once the password checks out on an
// mfa_enabled account, in place of issuing tokens directly. The raw token
// goes to the client; only its hash is stored (same convention as
// refresh_tokens). /api/auth/mfa/verify trades this plus a valid TOTP/backup
// code for real tokens.
export async function createLoginChallenge(userId: string, meta: ChallengeMeta = {}): Promise<string> {
  const raw = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MINUTES * 60 * 1000);
  await query(
    `insert into login_challenges (user_id, challenge_token_hash, device_label, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, $5, $6)`,
    [userId, hashToken(raw), meta.deviceLabel ?? null, meta.userAgent ?? null, meta.ip ?? null, expiresAt]
  );
  return raw;
}

export class ChallengeError extends Error {}

// Looks up a challenge WITHOUT consuming it -- a mistyped code shouldn't
// burn the user's one shot at this login. Callers verify the code first,
// then call markChallengeConsumed only once it's actually correct. The
// challenge's own 10-minute expiry plus the caller's own rate limiting
// (see checkRateLimit("mfa_verify_attempt", ...) in the verify route) is
// what bounds brute-force guessing, not single-use-ness.
export async function getLoginChallenge(rawToken: string): Promise<{ id: string; userId: string }> {
  const row = await queryOne<{ id: string; user_id: string; expires_at: string; consumed_at: string | null }>(
    `select id, user_id, expires_at, consumed_at from login_challenges where challenge_token_hash = $1`,
    [hashToken(rawToken)]
  );
  if (!row) throw new ChallengeError("Login challenge not recognized.");
  if (row.consumed_at) throw new ChallengeError("Login challenge already used.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new ChallengeError("Login challenge expired. Log in again.");
  return { id: row.id, userId: row.user_id };
}

export async function markChallengeConsumed(id: string): Promise<void> {
  await query(`update login_challenges set consumed_at = now() where id = $1`, [id]);
}

// Called by /api/auth/mfa/challenge/send-email-code once a fresh code is
// generated and emailed -- overwrites any earlier code for this same
// challenge, so only the most recently sent one still works.
export async function setChallengeEmailCode(id: string, codeHash: string, expiresAt: Date): Promise<void> {
  await query(`update login_challenges set email_code_hash = $1, email_code_expires_at = $2 where id = $3`, [
    codeHash,
    expiresAt,
    id,
  ]);
}

// Read by /api/auth/mfa/verify as a fallback once TOTP/backup-code checks
// fail -- null if no email code was ever sent for this challenge, or it
// already expired.
export async function getChallengeEmailCode(id: string): Promise<{ hash: string } | null> {
  const row = await queryOne<{ email_code_hash: string | null; email_code_expires_at: string | null }>(
    `select email_code_hash, email_code_expires_at from login_challenges where id = $1`,
    [id]
  );
  if (!row?.email_code_hash || !row.email_code_expires_at) return null;
  if (new Date(row.email_code_expires_at).getTime() < Date.now()) return null;
  return { hash: row.email_code_hash };
}

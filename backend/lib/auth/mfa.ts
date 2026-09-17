import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne } from "../db";
import { sendMfaDisableConfirmationEmail } from "../email";

const ISSUER = "Ascendra";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_SALT_ROUNDS = 10; // lighter than password hashing (12) -- these are single-use and short-lived by nature

export function generateTotpSecret(): string {
  return generateSecret();
}

// otpauth:// URI plus a ready-to-render QR code data URL, so the mobile app
// can show a scannable code without needing its own QR library.
export async function buildTotpProvisioning(email: string, secret: string): Promise<{ uri: string; qrDataUrl: string }> {
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { uri, qrDataUrl };
}

// One period of tolerance each side (30s window x3) absorbs normal clock
// drift between the phone and this server without meaningfully widening the
// guessable window.
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const result = await verify({ secret, token: code, epochTolerance: 30 });
  return result.valid;
}

function randomBackupCode(): string {
  // xxxx-xxxx, base32-ish alphabet (no 0/O/1/I) so codes stay readable when
  // handwritten or read off a screen.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3) out += "-";
  }
  return out;
}

export async function generateBackupCodes(): Promise<{ raw: string[]; hashed: string[] }> {
  const raw = Array.from({ length: BACKUP_CODE_COUNT }, randomBackupCode);
  const hashed = await Promise.all(raw.map((code) => bcrypt.hash(code, BACKUP_CODE_SALT_ROUNDS)));
  return { raw, hashed };
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.trim().toUpperCase(), hash);
}

const EMAIL_CODE_SALT_ROUNDS = 10; // same lighter rounds as backup codes -- single-use, short-lived

// crypto.randomInt is uniform over [0, 1_000_000), unlike Math.random -- the
// padStart keeps codes like "000482" six digits instead of silently
// shrinking, which would make them both confusing and marginally easier to
// guess (fewer possible characters in the string).
export function generateEmailCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function hashEmailCode(code: string): Promise<string> {
  return bcrypt.hash(code, EMAIL_CODE_SALT_ROUNDS);
}

export async function verifyEmailCode(code: string, hash: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  return bcrypt.compare(code, hash);
}

const DISABLE_CONFIRMATION_TTL_MINUTES = 10;

// Shared by /api/auth/mfa/disable and /api/auth/mfa/email/disable: emails a
// fresh code and stores it against `method` -- so a code issued while
// turning TOTP off can't later confirm turning email off instead, even if
// both requests happen close together.
export async function requestMfaDisableConfirmation(
  userId: string,
  userEmail: string,
  method: "totp" | "email",
  methodLabel: string
): Promise<void> {
  const code = generateEmailCode();
  const expiresAt = new Date(Date.now() + DISABLE_CONFIRMATION_TTL_MINUTES * 60 * 1000);
  await query(
    `update app_users set mfa_disable_confirmation_code_hash = $1, mfa_disable_confirmation_expires_at = $2,
       mfa_disable_confirmation_method = $3
     where id = $4`,
    [await hashEmailCode(code), expiresAt, method, userId]
  );
  await sendMfaDisableConfirmationEmail(userEmail, code, methodLabel);
}

// Verifies and, on success, consumes the pending confirmation -- one code
// authorizes exactly one disable.
export async function checkMfaDisableConfirmation(
  userId: string,
  method: "totp" | "email",
  suppliedCode: string
): Promise<boolean> {
  const row = await queryOne<{
    mfa_disable_confirmation_code_hash: string | null;
    mfa_disable_confirmation_expires_at: string | null;
    mfa_disable_confirmation_method: string | null;
  }>(
    `select mfa_disable_confirmation_code_hash, mfa_disable_confirmation_expires_at, mfa_disable_confirmation_method
     from app_users where id = $1`,
    [userId]
  );
  if (
    !row?.mfa_disable_confirmation_code_hash ||
    !row.mfa_disable_confirmation_expires_at ||
    row.mfa_disable_confirmation_method !== method
  ) {
    return false;
  }
  if (new Date(row.mfa_disable_confirmation_expires_at).getTime() < Date.now()) return false;

  const valid = await verifyEmailCode(suppliedCode, row.mfa_disable_confirmation_code_hash);
  if (valid) {
    await query(
      `update app_users set mfa_disable_confirmation_code_hash = null, mfa_disable_confirmation_expires_at = null,
         mfa_disable_confirmation_method = null
       where id = $1`,
      [userId]
    );
  }
  return valid;
}

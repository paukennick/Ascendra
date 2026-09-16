import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

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

import crypto from "node:crypto";

// A TOTP secret can't be hashed like a password -- verifying a 6-digit code
// needs the raw secret back to recompute the expected code. AES-256-GCM at
// rest is the standard middle ground: a DB leak alone doesn't hand over
// every user's MFA secret, only a DB leak *and* this server-side key.
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.AUTH_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "AUTH_ENCRYPTION_KEY is not set. Add it in Vercel project env vars (or .env.local for local dev) — see backend/.env.example. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("AUTH_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded random bytes).");
  }
  return key;
}

// Output is "iv:authTag:ciphertext", each base64 -- self-contained so no
// separate column is needed for the IV.
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted value.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

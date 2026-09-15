import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

async function verifyToken(token: string | undefined): Promise<{ ok: boolean; message: string }> {
  if (!token) {
    return { ok: false, message: "Missing verification token." };
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await queryOne<{ id: string; user_id: string }>(
    `select id, user_id from email_verification_tokens
     where token_hash = $1 and consumed_at is null and expires_at > now()`,
    [tokenHash]
  );
  if (!row) {
    return { ok: false, message: "This verification link is invalid or has expired. Request a new one from the app." };
  }
  await query(`update app_users set email_verified_at = now() where id = $1`, [row.user_id]);
  await query(`update email_verification_tokens set consumed_at = now() where id = $1`, [row.id]);
  return { ok: true, message: "Your email is verified. You can close this page and log in." };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const result = await verifyToken(searchParams.token);
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      <p>{result.message}</p>
    </main>
  );
}

import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { sendSecurityAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function confirmToken(token: string | undefined): Promise<{ ok: boolean; message: string }> {
  if (!token) {
    return { ok: false, message: "Missing confirmation token." };
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await queryOne<{ id: string; user_id: string; new_email: string }>(
    `select id, user_id, new_email from email_change_tokens
     where token_hash = $1 and consumed_at is null and expires_at > now()`,
    [tokenHash]
  );
  if (!row) {
    return { ok: false, message: "This link is invalid or has expired. Request the email change again from the app." };
  }

  const existing = await queryOne<{ id: string }>("select id from app_users where email = $1", [row.new_email]);
  if (existing) {
    return { ok: false, message: "That email is now in use by another account. Nothing was changed." };
  }

  const previous = await queryOne<{ email: string }>("select email from app_users where id = $1", [row.user_id]);
  await query(`update app_users set email = $1, email_verified_at = now() where id = $2`, [row.new_email, row.user_id]);
  await query(`update email_change_tokens set consumed_at = now() where id = $1`, [row.id]);

  if (previous?.email) {
    await sendSecurityAlertEmail(
      previous.email,
      "Your Ascendra email address was changed",
      `Your account's email address was changed to ${row.new_email}.`
    ).catch(() => undefined);
  }

  return { ok: true, message: "Your email address has been updated. You can close this page." };
}

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await confirmToken(token);
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      <p>{result.message}</p>
    </main>
  );
}

import { queryOne } from "../db";
import { ok, badRequest, unauthorized } from "../http";
import { verifyPassword } from "./passwords";
import { requestMfaDisableConfirmation, checkMfaDisableConfirmation } from "./mfa";
import { checkReauth, reauthFailure } from "./reauth";

// What both MFA "turn off" routes (/api/auth/mfa/disable for the
// authenticator, /api/auth/mfa/email/disable for email codes) require before
// they change anything. Returns "proceed" or the response to send.
//
// Accounts with a password: the password, and for the LAST remaining method
// also an emailed confirmation code (unchanged since REQ-098).
//
// REQ-116 (audit 3, low): accounts without a password (Google-only) could
// never turn MFA off -- the routes demanded a password they don't have.
// They now prove it's them with either
//   - a fresh Google sign-in (`googleIdToken`) or a current authenticator /
//     backup code (`reauth`), plus the emailed code when it's the last
//     method; or
//   - the emailed code alone: the first call without either sends it and
//     answers { confirmationRequired: true }, the second sends it back.
export async function mfaDisableGate(
  user: { id: string; email: string },
  body: Record<string, unknown>,
  method: "totp" | "email",
  methodLabel: string,
  isLastMethod: boolean
): Promise<"proceed" | Response> {
  const row = await queryOne<{ password_hash: string | null }>(`select password_hash from app_users where id = $1`, [user.id]);
  const confirmationCode = typeof body.confirmationCode === "string" ? body.confirmationCode : "";

  const emailedCodeStep = async (): Promise<"proceed" | Response> => {
    if (!confirmationCode) {
      await requestMfaDisableConfirmation(user.id, user.email, method, methodLabel);
      return ok({ confirmationRequired: true });
    }
    const confirmed = await checkMfaDisableConfirmation(user.id, method, confirmationCode);
    if (!confirmed) return unauthorized("Incorrect or expired confirmation code.");
    return "proceed";
  };

  if (row?.password_hash) {
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return badRequest("password is required");
    if (!(await verifyPassword(password, row.password_hash))) return unauthorized("Incorrect password.");
    return isLastMethod ? emailedCodeStep() : "proceed";
  }

  const hasOtherProof =
    (typeof body.googleIdToken === "string" && body.googleIdToken) || (typeof body.reauth === "string" && body.reauth);
  if (hasOtherProof) {
    const r = await checkReauth(user.id, { googleIdToken: body.googleIdToken, reauth: body.reauth });
    if (!r.ok) return reauthFailure(r);
    return isLastMethod ? emailedCodeStep() : "proceed";
  }
  return emailedCodeStep();
}

import { inspectVerifyToken, VERIFY_MESSAGES, type VerifyCode } from "@/lib/auth/emailTokens";
import { LinkPage, ConfirmForm, oneOf } from "../_components/LinkPage";
import { confirmVerifyEmail } from "./actions";

export const dynamic = "force-dynamic";

const CODES: readonly VerifyCode[] = ["missing", "invalid", "verified", "set_password", "already_verified"];
const RESET_TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

// REQ-191: opening the link (GET) changes nothing -- mail scanners open it
// too. The button posts to confirmVerifyEmail, which spends the token and
// comes back here with ?result=.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string; reset?: string }>;
}) {
  const { token, result, reset } = await searchParams;

  const code = oneOf(result, CODES);
  if (code) {
    return (
      <LinkPage>
        <p>{VERIFY_MESSAGES[code]}</p>
        {code === "set_password" && reset && RESET_TOKEN.test(reset) ? (
          <p>
            <a href={`/reset-password?token=${encodeURIComponent(reset)}`}>Choose your password</a>
          </p>
        ) : null}
      </LinkPage>
    );
  }

  const found = await inspectVerifyToken(token);
  if (found.state !== "ready") {
    return (
      <LinkPage>
        <p>{VERIFY_MESSAGES[found.state]}</p>
      </LinkPage>
    );
  }
  return (
    <LinkPage>
      {found.setPassword ? (
        <p>
          Confirm this is your email address. Any password set on this account before is removed, and you choose a
          new one next.
        </p>
      ) : (
        <p>Confirm your email address to finish creating your Ascendra account.</p>
      )}
      <ConfirmForm action={confirmVerifyEmail} token={token!} label="Verify my email" />
    </LinkPage>
  );
}

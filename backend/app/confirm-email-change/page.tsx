import { inspectEmailChangeToken, CHANGE_MESSAGES, type ChangeCode } from "@/lib/auth/emailTokens";
import { LinkPage, ConfirmForm, oneOf } from "../_components/LinkPage";
import { confirmEmailChange } from "./actions";

export const dynamic = "force-dynamic";

const CODES: readonly ChangeCode[] = ["missing", "invalid", "taken", "voided", "changed"];

// REQ-191: GET only reads the link; the button's POST confirms the change.
export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string }>;
}) {
  const { token, result } = await searchParams;
  const code = oneOf(result, CODES);
  if (code) {
    return (
      <LinkPage>
        <p>{CHANGE_MESSAGES[code]}</p>
      </LinkPage>
    );
  }
  const found = await inspectEmailChangeToken(token);
  if (found.state !== "ready") {
    return (
      <LinkPage>
        <p>{CHANGE_MESSAGES[found.state]}</p>
      </LinkPage>
    );
  }
  return (
    <LinkPage>
      <p>
        Confirm <strong>{found.newEmail}</strong> as the new email address for your Ascendra account.
      </p>
      <ConfirmForm action={confirmEmailChange} token={token!} label="Confirm email change" />
    </LinkPage>
  );
}

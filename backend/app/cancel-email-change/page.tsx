import { inspectCancelToken, CANCEL_MESSAGES, type CancelCode } from "@/lib/auth/emailTokens";
import { LinkPage, ConfirmForm, oneOf } from "../_components/LinkPage";
import { cancelEmailChange } from "./actions";

export const dynamic = "force-dynamic";

const CODES: readonly CancelCode[] = ["missing", "used", "cancelled"];

// REQ-116: the link in the alert sent to the current address when an email
// change is requested (lib/auth/emailTokens.ts). REQ-191: GET only reads the
// link; the button's POST cancels and signs out every device.
export default async function CancelEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string }>;
}) {
  const { token, result } = await searchParams;
  const code = oneOf(result, CODES);
  if (code) {
    return (
      <LinkPage>
        <p>{CANCEL_MESSAGES[code]}</p>
      </LinkPage>
    );
  }
  const found = await inspectCancelToken(token);
  if (found.state !== "ready") {
    return (
      <LinkPage>
        <p>{CANCEL_MESSAGES[found.state]}</p>
      </LinkPage>
    );
  }
  return (
    <LinkPage>
      <p>
        Someone asked to change your account&apos;s email address. Cancel it if it wasn&apos;t you: the change is
        stopped and every device is signed out.
      </p>
      <ConfirmForm action={cancelEmailChange} token={token!} label="Cancel the change and sign out everywhere" />
    </LinkPage>
  );
}

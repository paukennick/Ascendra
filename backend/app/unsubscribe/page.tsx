import { KIND_LABEL, readUnsubscribeToken, SERVICE_EMAIL_KINDS } from "@/lib/service-email-copy";
import { LinkPage, ConfirmForm, oneOf } from "../_components/LinkPage";
import { confirmUnsubscribe } from "./actions";

export const dynamic = "force-dynamic";

// REQ-197: the page an email's "Turn off ..." link opens. One button turns
// off that one kind of email; nothing else about the account changes.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string; kind?: string }>;
}) {
  const { token, result, kind } = await searchParams;
  const done = oneOf(result, ["done", "invalid"] as const);
  if (done === "done") {
    const k = oneOf(kind, SERVICE_EMAIL_KINDS);
    return (
      <LinkPage>
        <p>Done. You won&apos;t get {k ? KIND_LABEL[k] : "these emails"} any more.</p>
        <p>You can turn them back on in Ascendra under Settings &gt; Email. Account emails (sign-in codes, password resets) still arrive.</p>
      </LinkPage>
    );
  }
  const found = done === "invalid" ? null : readUnsubscribeToken(token);
  if (!found) {
    return (
      <LinkPage>
        <p>This unsubscribe link isn&apos;t valid. You can change your email choices in Ascendra under Settings &gt; Email.</p>
      </LinkPage>
    );
  }
  return (
    <LinkPage>
      <p>Turn off {KIND_LABEL[found.kind]} for your Ascendra account?</p>
      <ConfirmForm action={confirmUnsubscribe} token={token!} label="Turn them off" />
    </LinkPage>
  );
}

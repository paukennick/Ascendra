// REQ-205: the address people are told to write to for support, privacy and
// legal requests. Nick has not confirmed it (he first proposed
// support@mail.ascendra-learn.com, then asked for the root domain), so it
// lives in this one constant and, as an override, in the SUPPORT_EMAIL
// variable. The app's legal text keeps its own copy
// (mobile/src/content/legal.ts OWNER.contactEmail, a different package);
// lib/support-contact.test.ts fails when the two differ.
//
// The root domain's MX record already points at Resend, so mail sent to this
// address reaches POST /api/inbound/email, which forwards it to
// SUPPORT_FORWARD_TO (docs/operations-runbook.md "Support inbox").
export const DEFAULT_SUPPORT_EMAIL = "support@ascendra-learn.com";

const ADDRESS = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// The public support address: SUPPORT_EMAIL when it is a plain address, else
// the default. Never a placeholder.
export function supportEmail(env: Record<string, string | undefined> = process.env): string {
  const v = env.SUPPORT_EMAIL?.trim();
  return v && v.length <= 254 && ADDRESS.test(v) ? v : DEFAULT_SUPPORT_EMAIL;
}

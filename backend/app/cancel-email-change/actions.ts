"use server";

import { redirect, RedirectType } from "next/navigation";
import { cancelEmailChangeToken } from "@/lib/auth/emailTokens";
import { formToken } from "../_components/LinkPage";

// REQ-191: the only place a cancel link is spent (the button's POST). A
// scanner opening the link no longer signs every device out.
export async function cancelEmailChange(formData: FormData): Promise<void> {
  const r = await cancelEmailChangeToken(formToken(formData));
  redirect(`/cancel-email-change?result=${r.code}`, RedirectType.replace);
}

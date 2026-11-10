"use server";

import { redirect, RedirectType } from "next/navigation";
import { confirmEmailChangeToken } from "@/lib/auth/emailTokens";
import { formToken } from "../_components/LinkPage";

// REQ-191: the only place an email-change link is spent (the button's POST).
export async function confirmEmailChange(formData: FormData): Promise<void> {
  const r = await confirmEmailChangeToken(formToken(formData));
  redirect(`/confirm-email-change?result=${r.code}`, RedirectType.replace);
}

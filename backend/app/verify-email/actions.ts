"use server";

import { redirect, RedirectType } from "next/navigation";
import { verifyEmailToken } from "@/lib/auth/emailTokens";
import { formToken } from "../_components/LinkPage";

// REQ-191: the only place a verification link is spent (the button's POST).
// The result page is chosen by code; for a set_password link the one-hour
// reset token rides along so that page can link to it (REQ-116).
export async function confirmVerifyEmail(formData: FormData): Promise<void> {
  const r = await verifyEmailToken(formToken(formData));
  const qs = new URLSearchParams({ result: r.code });
  if (r.setPasswordUrl) {
    const reset = new URL(r.setPasswordUrl, "http://x").searchParams.get("token");
    if (reset) qs.set("reset", reset);
  }
  redirect(`/verify-email?${qs.toString()}`, RedirectType.replace);
}

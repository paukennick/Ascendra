"use server";

import { redirect, RedirectType } from "next/navigation";
import { readUnsubscribeToken } from "@/lib/service-email-copy";
import { unsubscribe } from "@/lib/service-emails";
import { formToken } from "../_components/LinkPage";

// REQ-197: the button's POST is the only place an emailed unsubscribe link
// changes anything (GET only shows the button, so a mail scanner opening
// the link turns nothing off).
export async function confirmUnsubscribe(formData: FormData): Promise<void> {
  const found = readUnsubscribeToken(formToken(formData));
  if (!found) redirect("/unsubscribe?result=invalid", RedirectType.replace);
  await unsubscribe(found.userId, found.kind);
  redirect(`/unsubscribe?result=done&kind=${found.kind}`, RedirectType.replace);
}

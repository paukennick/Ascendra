// REQ-191: what the "Check your email" screen says. It is reached two ways:
// right after sign-up (a link was just sent), or from a login refused with
// 403 { emailVerificationRequired } (nothing was sent by that login). The
// screen used to say "We sent a verification link" in both cases.

export type PendingReason = "register" | "login";

export function pendingReason(from: string | string[] | undefined): PendingReason {
  return from === "login" ? "login" : "register";
}

export interface PendingCopy {
  title: string;
  heading: string;
  body: string;
}

export function pendingCopy(reason: PendingReason, email: string | undefined): PendingCopy {
  const who = email || "your email";
  if (reason === "login") {
    return {
      title: "Verify your email",
      heading: "Your email isn't verified yet",
      body: `Before you can log in, confirm ${who}. Send a new verification link below, open it, tap "Verify my email", then log in.`,
    };
  }
  return {
    title: "Check your email",
    heading: "Verification link sent",
    body: `We sent a verification link to ${who}. Open it, tap "Verify my email", then come back and log in.`,
  };
}

export const RESENT_MESSAGE =
  "If this address has an unverified account, a new link is on its way. Older links still work for 24 hours. Check spam or junk too.";

export const RESET_ALSO_VERIFIES =
  "No email after a few minutes? Resetting your password from \"Forgot password\" also verifies your address.";

export function resendLabel(status: "idle" | "sending" | "sent"): string {
  return status === "sent" ? "Send another link" : "Resend verification email";
}

import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Body, Muted, Button, ErrorBanner, EmptyState, LiveAnnouncement } from "@/components/ui";
import { api, ApiError } from "@/api/client";
import {
  pendingCopy,
  pendingReason,
  resendLabel,
  RESENT_MESSAGE,
  RESET_ALSO_VERIFIES,
} from "@/lib/verifyEmailPending";
import { getVerifyEmailHandoff } from "@/lib/handoff";

// REQ-191: reached after sign-up (from=register) or from a login refused
// because the email isn't verified (from=login). Both offer a resend, and
// a way out through "Forgot password" (a completed reset verifies too).
export default function VerifyEmailPending() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  // REQ-206: in memory (src/lib/handoff.ts); gone after a reload, and then there is no resend button.
  const email = getVerifyEmailHandoff() ?? undefined;
  const copy = pendingCopy(pendingReason(from), email);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) return;
    setStatus("sending");
    setError(null);
    try {
      await api.post("/api/auth/resend-verification", { email });
      setStatus("sent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  };

  return (
    <Screen>
      <BrandMark />
      <H1 style={{ textAlign: "center" }}>{copy.title}</H1>
      <Card elevated>
        <EmptyState icon="mail" title={copy.heading} />
        <Body style={{ textAlign: "center" }}>{copy.body}</Body>
        {error ? <ErrorBanner message={error} /> : null}
        {/* REQ-206: the confirmation is read out; it used to appear silently. */}
        <LiveAnnouncement message={status === "sent" ? RESENT_MESSAGE : null} />
        {status === "sent" ? <Muted style={{ textAlign: "center" }}>{RESENT_MESSAGE}</Muted> : null}
        {email ? (
          <Button
            label={resendLabel(status)}
            variant={pendingReason(from) === "login" ? "primary" : "ghost"}
            icon="refresh-cw"
            loading={status === "sending"}
            onPress={resend}
          />
        ) : null}
        <Muted style={{ textAlign: "center" }}>{RESET_ALSO_VERIFIES}</Muted>
        <Button label="Forgot password" variant="link" onPress={() => router.push("/forgot-password")} />
      </Card>
      <Button label="Back to log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Body, Button, ErrorBanner, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/api/client";
import { fonts } from "@/lib/theme";

export default function VerifyEmailPending() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
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
      <H1 style={{ textAlign: "center" }}>Check your email</H1>
      <Card elevated>
        <EmptyState icon="mail" title="Verification link sent" />
        <Body style={{ textAlign: "center" }}>
          We sent a verification link to{" "}
          <Body style={{ fontFamily: fonts.bodyBold }}>{email ?? "your email"}</Body>. Open it, then come
          back and log in.
        </Body>
        {error ? <ErrorBanner message={error} /> : null}
        <Button
          label={status === "sent" ? "Link sent — resend again" : "Resend verification email"}
          variant="ghost"
          icon="refresh-cw"
          loading={status === "sending"}
          onPress={resend}
        />
      </Card>
      <Button label="Back to log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

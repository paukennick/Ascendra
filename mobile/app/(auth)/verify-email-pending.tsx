import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, H1, Body, Button, ErrorBanner, Loading } from "@/components/ui";
import { api, ApiError } from "@/api/client";

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
      <H1>Check your email</H1>
      <Card>
        <Body>
          We sent a verification link to {email ? <Body style={{ fontWeight: "700" }}>{email}</Body> : "your email"}.
          Open it, then come back and log in.
        </Body>
        {error ? <ErrorBanner message={error} /> : null}
        {status === "sending" ? (
          <Loading />
        ) : (
          <Button
            label={status === "sent" ? "Link sent — resend again" : "Resend verification email"}
            variant="ghost"
            onPress={resend}
          />
        )}
      </Card>
      <Button label="Back to log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

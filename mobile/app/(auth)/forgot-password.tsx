import React, { useState } from "react";
import { useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Muted, TextField, Button, ErrorBanner, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/api/client";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      setStatus("sent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <Screen>
        <Card elevated>
          <EmptyState
            icon="mail"
            title="Check your email"
            message="If that email is registered, a password reset link is on its way. Open it on this device or any browser to finish resetting your password."
          />
        </Card>
        <Button label="Back to log in" variant="link" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandMark />
      <H1 style={{ textAlign: "center" }}>Reset your password</H1>
      <Muted style={{ textAlign: "center", marginBottom: 4 }}>We'll email you a link to set a new password.</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          icon="mail"
        />
        <Button label="Send reset link" onPress={onSubmit} loading={status === "submitting"} icon="send" />
      </Card>
      <Button label="Back to log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

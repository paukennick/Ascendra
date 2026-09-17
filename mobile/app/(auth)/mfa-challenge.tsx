import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { api, ApiError } from "@/api/client";

export default function MfaChallenge() {
  const router = useRouter();
  const { completeMfaLogin } = useAuth();
  const { challengeToken, totp, email } = useLocalSearchParams<{ challengeToken: string; totp?: string; email?: string }>();
  const hasTotp = totp === "1";
  const hasEmail = email === "1";

  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  // Which live method is active when the account has more than one --
  // authenticator app is the default whenever it's available since it costs
  // no round trip, unlike emailing a code.
  const [activeMethod, setActiveMethod] = useState<"totp" | "email">(hasTotp ? "totp" : "email");
  const [emailCodeState, setEmailCodeState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function sendEmailCode() {
    setEmailCodeState("sending");
    setError(null);
    try {
      await api.post("/api/auth/mfa/challenge/send-email-code", { challengeToken });
      setEmailCodeState("sent");
    } catch (err) {
      setEmailCodeState("idle");
      setError(err instanceof ApiError ? err.message : "Couldn't send the code. Try again.");
    }
  }

  // Auto-send once, the first time email becomes the active method -- either
  // because it's the account's only method, or the user switched to it.
  useEffect(() => {
    if (activeMethod === "email" && emailCodeState === "idle") {
      sendEmailCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMethod]);

  const onSubmit = async () => {
    setError(null);
    if (!code.trim()) {
      setError(useBackupCode ? "Enter a backup code." : "Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await completeMfaLogin(challengeToken, code.trim());
      // Root layout's redirect effect handles navigation into the app once signed in.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const instructions = useBackupCode
    ? "Enter one of your unused backup codes."
    : activeMethod === "email"
      ? emailCodeState === "sending"
        ? "Sending a code to your email…"
        : "Enter the code we emailed you."
      : "Open your authenticator app and enter the current 6-digit code.";

  return (
    <Screen>
      <BrandMark />
      <H1 style={{ textAlign: "center" }}>Two-factor verification</H1>
      <Muted style={{ textAlign: "center", marginBottom: 4 }}>{instructions}</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <TextField
          label={useBackupCode ? "Backup code" : activeMethod === "email" ? "Emailed code" : "Authentication code"}
          value={code}
          onChangeText={setCode}
          placeholder={useBackupCode ? "XXXX-XXXX" : "123456"}
          keyboardType={useBackupCode ? "default" : "number-pad"}
          textContentType={useBackupCode ? undefined : "oneTimeCode"}
          maxLength={useBackupCode ? 9 : 6}
          icon="shield"
        />
        <Button label="Verify" onPress={onSubmit} loading={submitting} icon="check-circle" />
      </Card>
      {!useBackupCode && activeMethod === "email" ? (
        <Button
          label={emailCodeState === "sending" ? "Sending…" : "Resend code"}
          variant="link"
          disabled={emailCodeState === "sending"}
          onPress={sendEmailCode}
        />
      ) : null}
      {!useBackupCode && hasTotp && hasEmail ? (
        <Button
          label={activeMethod === "totp" ? "Email me a code instead" : "Use authenticator app instead"}
          variant="link"
          onPress={() => {
            setActiveMethod((m) => (m === "totp" ? "email" : "totp"));
            setCode("");
            setError(null);
          }}
        />
      ) : null}
      <Button
        label={useBackupCode ? "Use a code instead" : "Use a backup code instead"}
        variant="link"
        onPress={() => {
          setUseBackupCode((v) => !v);
          setCode("");
          setError(null);
        }}
      />
      <Button label="Back to log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

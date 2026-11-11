import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { api } from "@/api/client";
import { clearMfaHandoff, getMfaHandoff } from "@/lib/handoff";
import { messageOr } from "@/lib/errorMessage";

export default function MfaChallenge() {
  const router = useRouter();
  const { completeMfaLogin } = useAuth();
  // REQ-206: the challenge token is handed over in memory (src/lib/handoff.ts),
  // not in the URL. After a reload it is gone: back to sign-in.
  const handoff = useRef(getMfaHandoff()).current;
  const challengeToken = handoff?.challengeToken ?? "";
  const hasTotp = !!handoff?.totp;
  const hasEmail = !!handoff?.email;
  useEffect(() => {
    if (!handoff) router.replace("/login");
  }, [handoff, router]);

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
    if (!challengeToken) return; // reloaded: the effect above is already going back to sign-in
    setEmailCodeState("sending");
    setError(null);
    try {
      await api.post("/api/auth/mfa/challenge/send-email-code", { challengeToken });
      setEmailCodeState("sent");
    } catch (err) {
      setEmailCodeState("idle");
      setError(messageOr(err, "Couldn't send the code. Try again."));
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
    if (submitting) return;
    setError(null);
    if (!code.trim()) {
      setError(useBackupCode ? "Enter a backup code." : "Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await completeMfaLogin(challengeToken, code.trim());
      clearMfaHandoff();
      // Root layout's redirect effect handles navigation into the app once signed in.
    } catch (err) {
      setError(messageOr(err, "Something went wrong. Try again."));
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
          // REQ-212 (FAIL-1004): textContentType is iOS-only. Without
          // autoComplete, react-native marks the field not important for
          // autofill on Android, so a code could never be offered there.
          autoComplete={useBackupCode ? "off" : "one-time-code"}
          maxLength={useBackupCode ? 9 : 6}
          icon="shield"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
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

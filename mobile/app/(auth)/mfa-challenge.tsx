import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";

export default function MfaChallenge() {
  const router = useRouter();
  const { completeMfaLogin } = useAuth();
  const { challengeToken } = useLocalSearchParams<{ challengeToken: string }>();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!code.trim()) {
      setError(useBackupCode ? "Enter a backup code." : "Enter the 6-digit code from your authenticator app.");
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

  return (
    <Screen>
      <BrandMark />
      <H1 style={{ textAlign: "center" }}>Two-factor verification</H1>
      <Muted style={{ textAlign: "center", marginBottom: 4 }}>
        {useBackupCode
          ? "Enter one of your unused backup codes."
          : "Open your authenticator app and enter the current 6-digit code."}
      </Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <TextField
          label={useBackupCode ? "Backup code" : "Authentication code"}
          value={code}
          onChangeText={setCode}
          placeholder={useBackupCode ? "XXXX-XXXX" : "123456"}
          keyboardType={useBackupCode ? "default" : "number-pad"}
          maxLength={useBackupCode ? 9 : 6}
          icon="shield"
        />
        <Button label="Verify" onPress={onSubmit} loading={submitting} icon="check-circle" />
      </Card>
      <Button
        label={useBackupCode ? "Use authenticator code instead" : "Use a backup code instead"}
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

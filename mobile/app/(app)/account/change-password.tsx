import React, { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { Button, Card, ErrorBanner, Muted, Screen, TextField } from "@/components/ui";

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <Card elevated>
          <Muted>
            Password changed. Other devices have been signed out and will need to sign in again with your new
            password.
          </Muted>
          <Button label="Back to account" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        {error ? <ErrorBanner message={error} /> : null}
        <TextField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          icon="lock"
        />
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          icon="lock"
        />
        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          icon="lock"
        />
        <Button label="Change password" onPress={submit} loading={busy} disabled={!currentPassword || !newPassword} />
      </Card>
    </Screen>
  );
}

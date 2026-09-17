import React, { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button, Card, ErrorBanner, Muted, Screen, TextField } from "@/components/ui";

export default function ChangeEmail() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/account/email", { newEmail });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Muted>Current email: {user?.email}</Muted>
        {error ? <ErrorBanner message={error} /> : null}
        {sent ? (
          <Muted>
            Check {newEmail} for a confirmation link. Your email won't change until you tap it — this current
            address keeps working until then.
          </Muted>
        ) : (
          <>
            <TextField
              label="New email address"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              icon="mail"
            />
            <Button label="Send confirmation link" onPress={submit} loading={busy} disabled={!newEmail} />
          </>
        )}
      </Card>
    </Screen>
  );
}

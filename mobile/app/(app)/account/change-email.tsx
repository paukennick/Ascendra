import React, { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useGoogleAuthRequest } from "@/auth/googleSignIn";
import { Button, Card, ErrorBanner, Muted, Screen, TextField } from "@/components/ui";
import { reauthFields, reauthPromptFor } from "@/lib/reauth";

// REQ-116 (audit 3): changing the address now needs the learner to confirm
// it's them (password, an authenticator/backup code, or for a Google-only
// account a fresh Google sign-in), and the current address is emailed at
// once with a link to cancel.
export default function ChangeEmail() {
  const { user } = useAuth();
  const prompt = reauthPromptFor(user);
  const { clientId, signInAsync } = useGoogleAuthRequest();
  const [newEmail, setNewEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(fields: { reauth?: string; googleIdToken?: string }) {
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/account/email", { newEmail, ...fields });
      setSecret("");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (prompt.kind === "google") {
      setError(null);
      let idToken: string | null = null;
      try {
        idToken = await signInAsync();
      } catch {
        idToken = null;
      }
      if (!idToken) {
        setError("Google sign-in didn't finish. Try again.");
        return;
      }
      await send(reauthFields(prompt, idToken));
      return;
    }
    if (!secret) {
      setError(prompt.hint);
      return;
    }
    await send(reauthFields(prompt, secret));
  }

  return (
    <Screen>
      <Card>
        <Muted>Current email: {user?.email}</Muted>
        {error ? <ErrorBanner message={error} /> : null}
        {sent ? (
          <Muted>
            Check {newEmail} for a confirmation link. Your email won't change until you tap it — this current
            address keeps working until then. We've also emailed your current address, with a link to cancel if
            this wasn't you.
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
            <Muted>{prompt.hint}</Muted>
            {prompt.kind === "secret" ? (
              <TextField
                label={prompt.label}
                value={secret}
                onChangeText={setSecret}
                secureTextEntry={prompt.secure}
                placeholder={prompt.secure ? "••••••••" : "123456"}
                textContentType={prompt.secure ? "password" : "oneTimeCode"}
                autoComplete={prompt.secure ? "current-password" : "one-time-code"}
                icon="lock"
              />
            ) : null}
            <Button
              label={prompt.kind === "google" ? "Confirm with Google and send link" : "Send confirmation link"}
              onPress={submit}
              loading={busy}
              disabled={!newEmail || (prompt.kind === "secret" ? !secret : !clientId)}
            />
            {prompt.kind === "google" && !clientId ? (
              <Muted>Google sign-in isn't available here. Use the app on your phone to change your email.</Muted>
            ) : null}
          </>
        )}
      </Card>
    </Screen>
  );
}

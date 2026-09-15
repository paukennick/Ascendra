import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Card, H1, Muted, TextField, Button, ErrorBanner, Loading } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      router.replace({ pathname: "/verify-email-pending", params: { email: email.trim() } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <H1>Create your account</H1>
      <Muted>Two-factor login isn't set up yet in this build — coming in the next update.</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <TextField
          label="Name (optional)"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          secureTextEntry
          textContentType="newPassword"
        />
        {submitting ? <Loading /> : <Button label="Create account" onPress={onSubmit} />}
      </Card>
      <Button label="Already have an account? Log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

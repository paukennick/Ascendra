import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Card, H1, Muted, TextField, Button, ErrorBanner, Loading } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.emailVerificationRequired) {
        router.replace({ pathname: "/verify-email-pending", params: { email: email.trim() } });
      }
      // On success without verification pending, the root layout's own
      // redirect effect (driven by auth status) handles navigation into the app.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <H1>Welcome back</H1>
      <Muted>Log in to continue studying.</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
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
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
        />
        {submitting ? <Loading /> : <Button label="Log in" onPress={onSubmit} />}
      </Card>
      <Button label="Forgot password?" variant="link" onPress={() => router.push("/forgot-password")} />
      <Button label="Don't have an account? Sign up" variant="link" onPress={() => router.push("/register")} />
    </Screen>
  );
}

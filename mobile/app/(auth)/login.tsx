import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { BrandMark, Screen, Card, Divider, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { useGoogleAuthRequest, extractIdToken } from "@/auth/googleSignIn";

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const { clientId, request, response, promptAsync } = useGoogleAuthRequest();

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
      } else if (result.mfaRequired && result.challengeToken) {
        router.push({ pathname: "/mfa-challenge", params: { challengeToken: result.challengeToken } });
      }
      // Otherwise the root layout's own redirect effect (driven by auth status) handles navigation.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = extractIdToken(response);
    if (!idToken) return;
    (async () => {
      setError(null);
      setGoogleSubmitting(true);
      try {
        const result = await loginWithGoogle(idToken);
        if (result.mfaRequired && result.challengeToken) {
          router.push({ pathname: "/mfa-challenge", params: { challengeToken: result.challengeToken } });
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Google sign-in failed. Try again.");
      } finally {
        setGoogleSubmitting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <Screen>
      <BrandMark />
      <H1 style={{ textAlign: "center" }}>Welcome back</H1>
      <Muted style={{ textAlign: "center", marginBottom: 4 }}>Log in to continue studying.</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
          icon="mail"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
          icon="lock"
        />
        <Button label="Log in" onPress={onSubmit} loading={submitting} icon="log-in" />
        {clientId ? (
          <>
            <Divider style={{ marginVertical: 4 }} />
            <Button
              label="Continue with Google"
              variant="ghost"
              icon="chrome"
              loading={googleSubmitting}
              disabled={!request}
              onPress={() => promptAsync()}
            />
          </>
        ) : null}
      </Card>
      <Button label="Forgot password?" variant="link" onPress={() => router.push("/forgot-password")} />
      <Button label="Don't have an account? Sign up" variant="link" onPress={() => router.push("/register")} />
    </Screen>
  );
}

import React, { useState } from "react";
import { useRouter } from "expo-router";
import { BrandMark, Screen, Card, Divider, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { useGoogleAuthRequest } from "@/auth/googleSignIn";

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle, biometricAvailable, biometricEnabled, biometricLabel, unlockWithBiometric } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [biometricSubmitting, setBiometricSubmitting] = useState(false);
  const { clientId, request, signInAsync } = useGoogleAuthRequest();

  const onBiometricPress = async () => {
    setError(null);
    setBiometricSubmitting(true);
    const ok = await unlockWithBiometric();
    setBiometricSubmitting(false);
    if (!ok) setError("Couldn't unlock with " + biometricLabel + ". Sign in with your password instead.");
  };

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
        router.push({
          pathname: "/mfa-challenge",
          params: {
            challengeToken: result.challengeToken,
            totp: result.mfaMethods?.totp ? "1" : "0",
            email: result.mfaMethods?.email ? "1" : "0",
          },
        });
      }
      // Otherwise the root layout's own redirect effect (driven by auth status) handles navigation.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onGooglePress = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const idToken = await signInAsync();
      if (!idToken) return;
      const result = await loginWithGoogle(idToken);
      if (result.mfaRequired && result.challengeToken) {
        router.push({
          pathname: "/mfa-challenge",
          params: {
            challengeToken: result.challengeToken,
            totp: result.mfaMethods?.totp ? "1" : "0",
            email: result.mfaMethods?.email ? "1" : "0",
          },
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed. Try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

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
          textContentType="username"
          autoComplete="email"
          icon="mail"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          icon="lock"
        />
        {biometricAvailable && biometricEnabled ? (
          <Button
            label={`Use ${biometricLabel}`}
            variant="ghost"
            icon="unlock"
            loading={biometricSubmitting}
            onPress={onBiometricPress}
          />
        ) : null}
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
              onPress={onGooglePress}
            />
          </>
        ) : null}
      </Card>
      <Button label="Forgot password?" variant="link" onPress={() => router.push("/forgot-password")} />
      <Button label="Don't have an account? Sign up" variant="link" onPress={() => router.push("/register")} />
    </Screen>
  );
}

import React, { useState } from "react";
import { useRouter } from "expo-router";
import { BrandMark, Screen, Card, Divider, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { useGoogleAuthRequest } from "@/auth/googleSignIn";
import { Text } from "react-native";
import { ageCheckError, isAgeConfirmationRequired } from "@/lib/ageConfirmation";
import { AgeCheckbox } from "@/components/AgeCheckbox";
import { colors } from "@/lib/theme";
import { mfaHandoffFrom, setMfaHandoff, setVerifyEmailHandoff } from "@/lib/handoff";

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle, biometricAvailable, biometricEnabled, biometricLabel, unlockWithBiometric } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [biometricSubmitting, setBiometricSubmitting] = useState(false);
  // REQ-205: a first-time Google sign-up needs "I am 16 or older". The server
  // says so (and creates nothing); the Google sign-in is kept here and sent
  // again with the confirmation.
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [ageOk, setAgeOk] = useState(false);
  const { clientId, request, signInAsync } = useGoogleAuthRequest();

  const onBiometricPress = async () => {
    setError(null);
    setBiometricSubmitting(true);
    const ok = await unlockWithBiometric();
    setBiometricSubmitting(false);
    if (!ok) setError("Couldn't unlock with " + biometricLabel + ". Sign in with your password instead.");
  };

  const onSubmit = async () => {
    if (submitting) return;
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.emailVerificationRequired) {
        // REQ-206: the email is handed over in memory, not in the URL.
        setVerifyEmailHandoff(email.trim());
        router.replace({ pathname: "/verify-email-pending", params: { from: "login" } });
      } else {
        const mfa = mfaHandoffFrom(result);
        if (mfa) {
          setMfaHandoff(mfa);
          router.push("/mfa-challenge");
        }
      }
      // Otherwise the root layout's own redirect effect (driven by auth status) handles navigation.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const finishGoogle = async (idToken: string, ageConfirmed: boolean) => {
    const result = await loginWithGoogle(idToken, ageConfirmed);
    setGoogleToken(null);
    // REQ-206: the challenge is handed over in memory, not in the URL.
    const mfa = mfaHandoffFrom(result);
    if (mfa) {
      setMfaHandoff(mfa);
      router.push("/mfa-challenge");
    }
  };

  const onGooglePress = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const idToken = await signInAsync();
      if (!idToken) return;
      try {
        await finishGoogle(idToken, false);
      } catch (err) {
        if (!isAgeConfirmationRequired(err)) throw err;
        setGoogleToken(idToken);
        setAgeOk(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed. Try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const onGoogleAgeContinue = async () => {
    setError(null);
    const ageError = ageCheckError(ageOk);
    if (ageError || !googleToken) {
      setError(ageError ?? "Google sign-in failed. Try again.");
      return;
    }
    setGoogleSubmitting(true);
    try {
      await finishGoogle(googleToken, true);
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
          // "username" is the credential identifier that pairs with the
          // password field, where "email" is a plain-data hint in the same
          // bucket as street address and brings no password with it.
          // "username" only works once Android can verify this app and
          // ascendra-learn.com are the same product, via
          // /.well-known/assetlinks.json (REQ-027) -- confirmed live via
          // https://digitalassetlinks.googleapis.com/v1/statements:list, so
          // the saved web credential is now offerable here with its password.
          textContentType="username"
          autoComplete="username"
          importantForAutofill="yes"
          icon="mail"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          importantForAutofill="yes"
          icon="lock"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
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
            {googleToken ? (
              <>
                <Muted style={{ fontSize: 13 }}>
                  This Google account doesn&apos;t have an Ascendra account yet. To create one, confirm your age.
                </Muted>
                <AgeCheckbox checked={ageOk} onToggle={() => setAgeOk((v) => !v)} />
                <Button label="Create account with Google" icon="user-plus" loading={googleSubmitting} onPress={onGoogleAgeContinue} />
              </>
            ) : null}
            {/* REQ-119 (H5): Google sign-up used to create an account without
                the Terms ever being shown. A new account made here records
                this agreement (version and time). */}
            <Muted style={{ fontSize: 13, textAlign: "center" }}>
              By continuing with Google you agree to the{" "}
              <Text style={{ color: colors.link }} accessibilityRole="link" onPress={() => router.push("/terms")}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={{ color: colors.link }} accessibilityRole="link" onPress={() => router.push("/privacy")}>
                Privacy Policy
              </Text>
              .
            </Muted>
          </>
        ) : null}
      </Card>
      <Button label="Forgot password?" variant="link" onPress={() => router.push("/forgot-password")} />
      <Button label="Don't have an account? Sign up" variant="link" onPress={() => router.push("/register")} />
    </Screen>
  );
}

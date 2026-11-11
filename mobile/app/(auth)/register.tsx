import React, { useState } from "react";
import { Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { BrandMark, Screen, Card, H1, Muted, TextField, Button, ErrorBanner, Checkbox } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { TERMS_VERSION } from "@/lib/legal";
import { ageCheckError } from "@/lib/ageConfirmation";
import { AgeCheckbox } from "@/components/AgeCheckbox";
import { colors, fonts } from "@/lib/theme";
import { setVerifyEmailHandoff } from "@/lib/handoff";
import { messageOr } from "@/lib/errorMessage";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) return;
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
    if (!agreed) {
      setError("You need to agree to the Terms and Privacy Policy to create an account.");
      return;
    }
    // REQ-205: 16 or older, confirmed with one tick.
    const ageError = ageCheckError(ageOk);
    if (ageError) {
      setError(ageError);
      return;
    }
    setSubmitting(true);
    try {
      // REQ-119: the version agreed to is recorded with the account.
      await register(email.trim(), password, displayName.trim() || undefined, TERMS_VERSION, ageOk);
      setVerifyEmailHandoff(email.trim());
      router.replace({ pathname: "/verify-email-pending", params: { from: "register" } });
    } catch (err) {
      setError(messageOr(err, "Something went wrong. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <BrandMark />
      <H1 style={{ textAlign: "center" }}>Create your account</H1>
      <Muted style={{ textAlign: "center", marginBottom: 4 }}>
        Start your Ascendra account in a minute.
      </Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <Card>
        <TextField
          label="Name (optional)"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          icon="user"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="username"
          autoComplete="username"
          icon="mail"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          icon="lock"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          icon="lock"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        {/* REQ-206: its own 48 dp checkbox; the links sit beside it, not inside the toggle. */}
        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label="I agree to the Terms and Disclaimer and the Privacy Policy"
        >
          <Text style={{ color: colors.mutedDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
            I agree to the{" "}
            <Link href="/terms" style={{ color: colors.link, fontFamily: fonts.bodySemiBold }}>
              Terms & Disclaimer
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: colors.link, fontFamily: fonts.bodySemiBold }}>
              Privacy Policy
            </Link>
            .
          </Text>
        </Checkbox>
        <AgeCheckbox checked={ageOk} onToggle={() => setAgeOk((v) => !v)} />
        <Button label="Create account" onPress={onSubmit} loading={submitting} icon="user-plus" />
      </Card>
      <Button label="Already have an account? Log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

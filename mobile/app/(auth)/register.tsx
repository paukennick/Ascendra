import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BrandMark, Screen, Card, H1, Muted, TextField, Button, ErrorBanner } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { colors, fonts } from "@/lib/theme";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
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
    if (!agreed) {
      setError("You need to agree to the Terms and Privacy Policy to create an account.");
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
        />
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <Feather
            name={agreed ? "check-square" : "square"}
            size={18}
            color={agreed ? colors.accent : colors.mutedDim}
            style={{ marginTop: 2 }}
          />
          <Text style={{ color: colors.mutedDim, fontFamily: fonts.body, flex: 1, fontSize: 13, lineHeight: 18 }}>
            I agree to the{" "}
            <Text
              style={{ color: colors.accent, fontFamily: fonts.bodySemiBold }}
              onPress={() => router.push("/terms")}
            >
              Terms & Disclaimer
            </Text>{" "}
            and{" "}
            <Text
              style={{ color: colors.accent, fontFamily: fonts.bodySemiBold }}
              onPress={() => router.push("/privacy")}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>
        <Button label="Create account" onPress={onSubmit} loading={submitting} icon="user-plus" />
      </Card>
      <Button label="Already have an account? Log in" variant="link" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

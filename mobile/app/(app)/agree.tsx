import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Button, Card, ErrorBanner, H1, Muted, Screen } from "@/components/ui";
import { useOnboarding } from "@/auth/OnboardingContext";
import { useAuth } from "@/auth/AuthContext";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";

// REQ-119 (Audit 3 product H5): asked once, with one tap, of an account that
// hasn't accepted the current Terms and Privacy Policy (everyone who signed
// up before acceptance was recorded, and everyone again when the text
// changes). Both pages stay one tap away; someone who would rather not
// agree can still export their data or delete the account from Account,
// or sign out. Since the 2026-11-07 merge this is the one prompt: line B's
// LegalAcceptGate overlay (REQ-093) is folded in here -- it names which
// document changed and offers Sign out.
export default function Agree() {
  const router = useRouter();
  const { state, acceptTerms } = useOnboarding();
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const changed = !!state?.terms.acceptedVersion;
  const pending = state?.terms.pending ?? ["terms", "privacy"];
  const updated =
    pending.length === 1
      ? pending[0] === "terms"
        ? "Terms of Service has"
        : "Privacy Policy has"
      : "Terms of Service and Privacy Policy have";

  async function agree() {
    setError(null);
    try {
      await acceptTerms();
      // The root navigator moves on to first run if that is next; otherwise Home.
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Screen>
      <H1>{changed ? "We've updated our terms" : "One quick thing"}</H1>
      <Body>
        {changed
          ? `Our ${updated} changed since you last agreed. Have a look whenever you like; agreeing lets you carry on as before.`
          : "Before you carry on, please agree to our Terms of Service and Privacy Policy. They explain what Ascendra does with your data, including which features send your answers to our AI provider."}
      </Body>
      <Card style={{ gap: spacing.sm }}>
        <Button label="Read the Terms of Service" variant="link" fullWidth={false} icon="file-text" onPress={() => router.push("/terms")} />
        <Button label="Read the Privacy Policy" variant="link" fullWidth={false} icon="shield" onPress={() => router.push("/privacy")} />
      </Card>
      {error ? <ErrorBanner message={error} onRetry={agree} /> : null}
      <Button label="Agree and continue" icon="check" onPress={agree} />
      <View style={{ marginTop: spacing.md }}>
        <Muted style={{ textAlign: "center" }}>
          Rather not agree? You can download your data or delete your account in Account settings.
        </Muted>
        <Button label="Account settings" variant="link" fullWidth={false} onPress={() => router.push("/account")} />
        <Button label="Sign out" variant="ghost" fullWidth={false} onPress={() => logout()} />
      </View>
    </Screen>
  );
}

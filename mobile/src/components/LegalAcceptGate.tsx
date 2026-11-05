// REQ-093: shown over the app when the signed-in user hasn't accepted the
// current Terms of Service and Privacy Policy -- everyone who signed up
// before consent was recorded, and everyone after a version change. The
// versions shown are the ones sent back, so the server records exactly what
// the user saw.
import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Body, Button, Card, ErrorBanner, H2, Muted } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { TERMS, PRIVACY } from "@/content/legal";

export function LegalAcceptGate() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = user?.legalPending ?? [];
  if (pending.length === 0) return null;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/legal/accept", { termsVersion: TERMS.version, privacyVersion: PRIVACY.version });
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updated = pending.length === 2 ? "Terms of Service and Privacy Policy" : pending[0] === "terms" ? "Terms of Service" : "Privacy Policy";
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bg,
        justifyContent: "center",
        padding: spacing.lg,
      }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Card elevated style={{ gap: spacing.sm }}>
          <H2>Please review our {updated}</H2>
          <Body>
            Before you continue, please read and accept the current {updated}. They explain what Ascendra is, how
            lessons are written, and what we do with your data.
          </Body>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button label="Read the Terms" variant="link" fullWidth={false} onPress={() => router.push("/terms")} />
            <Button label="Read the Privacy Policy" variant="link" fullWidth={false} onPress={() => router.push("/privacy")} />
          </View>
          {error ? <ErrorBanner message={error} /> : null}
          <Button label="I agree" icon="check" loading={busy} onPress={accept} />
          <Button label="Sign out" variant="ghost" onPress={() => logout()} />
          <Muted style={{ fontSize: 12 }}>Last updated {TERMS.updated}.</Muted>
        </Card>
      </ScrollView>
    </View>
  );
}

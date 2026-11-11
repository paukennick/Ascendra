// REQ-217 (FAIL-1041): a session is stored on this device but the server could
// not be reached to resume it (offline, a timeout, a 5xx). The token is kept;
// this offers Try again, and Sign out for someone who would rather start over.
import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark, Button, ErrorBanner, H1, Muted } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export function SessionRetry() {
  const { restoreSession, restoreError, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md }}>
        <BrandMark />
        <H1>We couldn't reach Ascendra</H1>
        <Muted>You're still signed in on this phone. Check your connection and try again.</Muted>
        {restoreError ? <ErrorBanner message={restoreError} /> : null}
        <Button
          label="Try again"
          icon="rotate-cw"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await restoreSession();
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button label="Sign out" variant="ghost" onPress={() => void logout()} disabled={busy} />
      </SafeAreaView>
    </View>
  );
}

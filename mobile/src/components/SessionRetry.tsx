// REQ-217 (FAIL-1041): a session is stored on this device but the server could
// not be reached to resume it (offline, a timeout, a 5xx). The token is kept;
// this offers Try again, and Sign out for someone who would rather start over.
import React, { useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark, Button, ErrorBanner, H1, Muted } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { useWideWeb } from "@/components/WebColumn";
import { sessionRetryLayout } from "@/lib/webColumn";

export function SessionRetry() {
  const { restoreSession, restoreError, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  // REQ-322 (FAIL-2340): on a wide web window this sat across the whole
  // monitor (title at the left edge, buttons 1,400px wide) and said "on this
  // phone". It now sits in a narrow centered column and says "in this
  // browser". Phones and narrow windows are unchanged.
  const wide = useWideWeb();
  const layout = sessionRetryLayout(Platform.OS, wide);
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md }}>
        <View style={layout.maxWidth ? { width: "100%", maxWidth: layout.maxWidth, alignSelf: "center", gap: spacing.md } : { gap: spacing.md }}>
        <BrandMark />
        <H1>We couldn't reach Ascendra</H1>
        <Muted>You're still signed in {layout.where}. Check your connection and try again.</Muted>
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
        </View>
      </SafeAreaView>
    </View>
  );
}

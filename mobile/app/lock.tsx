import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark, Button, H1, Muted } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function LockScreen() {
  const { biometricLabel, unlockWithBiometric, useFallbackSignIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const attemptUnlock = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const ok = await unlockWithBiometric();
    setBusy(false);
    if (!ok) setFailed(true);
  }, [unlockWithBiometric]);

  // Prompt automatically as soon as the screen appears, matching how this
  // pattern normally behaves -- the buttons below exist for retry/fallback,
  // not as the only way in.
  useEffect(() => {
    attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg }}>
      <BrandMark size={64} />
      <View style={{ alignItems: "center", gap: 6 }}>
        <H1>Ascendra is locked</H1>
        <Muted style={{ textAlign: "center" }}>Use {biometricLabel} to continue.</Muted>
      </View>

      {failed ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="alert-circle" size={14} color={colors.bad} />
          <Muted style={{ color: colors.bad }}>Couldn't unlock. Try again.</Muted>
        </View>
      ) : null}

      <View style={{ width: "100%", maxWidth: 360, gap: spacing.sm }}>
        <Button label={`Unlock with ${biometricLabel}`} icon="unlock" onPress={attemptUnlock} loading={busy} />
        <Button label="Use password instead" variant="ghost" onPress={useFallbackSignIn} />
      </View>
    </SafeAreaView>
  );
}

import React, { useState } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Card, Divider, ListRow, Muted, Screen, SectionHeader } from "@/components/ui";
import { Alert } from "@/lib/alert";
import { colors } from "@/lib/theme";
import { useAuth } from "@/auth/AuthContext";

export default function Settings() {
  const router = useRouter();
  const { user, biometricAvailable, biometricEnabled, biometricLabel, enableBiometric, disableBiometric } = useAuth();
  const [biometricBusy, setBiometricBusy] = useState(false);

  async function toggleBiometric(next: boolean) {
    setBiometricBusy(true);
    try {
      if (next) {
        const res = await enableBiometric();
        if (!res.ok) Alert.alert("Couldn't enable", res.error ?? "Something went wrong.");
      } else {
        await disableBiometric();
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <Screen>
      <SectionHeader label="Account" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="user" label="Profile & sign-in" value={user?.displayName ?? user?.email} onPress={() => router.push("/account")} />
      </Card>

      <SectionHeader label="Security" />
      <Card style={{ gap: 0 }}>
        <ListRow
          icon="shield"
          label="Two-factor authentication"
          value={user?.mfaEnabled ? "Enabled" : "Disabled"}
          onPress={() => router.push("/settings/mfa")}
        />
        {biometricAvailable ? (
          <>
            <Divider />
            <ListRow
              icon="unlock"
              label={`Use ${biometricLabel}`}
              right={
                biometricBusy ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ true: colors.accent, false: colors.border }}
                  />
                )
              }
            />
          </>
        ) : null}
      </Card>

      <SectionHeader label="About" />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Version</Muted>
          <Muted>{Constants.expoConfig?.version ?? "1.0.0"}</Muted>
        </View>
        <Divider />
        <Muted>
          Ascendra tracks your course progress, generates lessons and practice questions, and
          keeps everything in sync across devices.
        </Muted>
      </Card>
    </Screen>
  );
}

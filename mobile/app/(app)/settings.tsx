import React from "react";
import { View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Avatar, Card, Divider, H2, ListRow, Muted, Screen, SectionHeader } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";

export default function Settings() {
  const router = useRouter();
  const { user, logout, logoutAll } = useAuth();

  return (
    <Screen>
      <Card style={{ alignItems: "center", gap: 4, paddingVertical: 24 }}>
        <Avatar name={user?.displayName ?? user?.email} size={64} />
        <H2 style={{ marginTop: 8 }}>{user?.displayName ?? "Signed in"}</H2>
        <Muted>{user?.email}</Muted>
      </Card>

      <SectionHeader label="Security" />
      <Card style={{ gap: 0 }}>
        <ListRow
          icon="shield"
          label="Two-factor authentication"
          value={user?.mfaEnabled ? "Enabled" : "Disabled"}
          onPress={() => router.push("/settings/mfa")}
        />
      </Card>

      <SectionHeader label="Account" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="log-out" label="Log out" onPress={() => logout()} />
        <Divider />
        <ListRow icon="shield-off" label="Log out of all devices" onPress={() => logoutAll()} danger />
      </Card>

      <SectionHeader label="About" />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Version</Muted>
          <Muted>{Constants.expoConfig?.version ?? "1.0.0"}</Muted>
        </View>
        <Divider />
        <Muted>
          Ascendra mobile companion — it does not replace Pak's existing Claude Artifact study
          coaches, it adds an offline-friendly mobile front end backed by its own database and its
          own Anthropic API calls.
        </Muted>
      </Card>
    </Screen>
  );
}

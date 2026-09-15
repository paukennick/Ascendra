import React from "react";
import Constants from "expo-constants";
import { Screen, Card, H1, H2, Muted, Button } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";

export default function Settings() {
  const { user, logout, logoutAll } = useAuth();

  return (
    <Screen>
      <H1>Settings</H1>
      <Card>
        <H2>Account</H2>
        <Muted>{user?.email ?? "Signed in"}</Muted>
        <Button label="Log out" variant="ghost" onPress={() => logout()} />
        <Button label="Log out of all devices" variant="link" onPress={() => logoutAll()} />
      </Card>
      <Card>
        <H2>App</H2>
        <Muted>Ascendra mobile companion, version {Constants.expoConfig?.version ?? "1.0.0"}</Muted>
        <Muted>
          This app is a companion to Pak's existing Claude Artifact study coaches — it does not
          replace them, it adds an offline-friendly mobile front end backed by its own database and
          its own Anthropic API calls.
        </Muted>
      </Card>
    </Screen>
  );
}

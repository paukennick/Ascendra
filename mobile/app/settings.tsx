import React from "react";
import Constants from "expo-constants";
import { Screen, Card, H1, H2, Body, Muted } from "@/components/ui";

export default function Settings() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "(not set)";
  return (
    <Screen>
      <H1>Settings</H1>
      <Card>
        <H2>Backend connection</H2>
        <Body>API URL: {apiUrl}</Body>
        <Muted>
          Set with EXPO_PUBLIC_API_URL in mobile/.env.local for local dev, or in mobile/eas.json
          for a production build. See the project README for exact steps.
        </Muted>
      </Card>
      <Card>
        <H2>App</H2>
        <Muted>Prep LMS mobile companion, version {Constants.expoConfig?.version ?? "1.0.0"}</Muted>
        <Muted>
          This app is a companion to Pak's existing Claude Artifact study coaches — it does not
          replace them, it adds an offline-friendly mobile front end backed by its own database and
          its own Anthropic API calls.
        </Muted>
      </Card>
    </Screen>
  );
}

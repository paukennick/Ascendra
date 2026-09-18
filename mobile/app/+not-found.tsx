// Shown for any route the app cannot match.
//
// Expo Router has a built-in unmatched-route screen, but it is a developer
// affordance: it says "this page could not be found" and offers no way out
// other than the system back gesture. A user who arrives here from a deep
// link -- an OAuth callback, a stale notification, a shared URL from an
// older build -- is simply stuck.
//
// This replaces it with somewhere to go. Where "somewhere" is depends on
// whether they are signed in, which is the same question the root layout
// asks, so the answer is taken from the same place rather than guessed.

import React from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Button, H1, Muted, Screen } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function NotFoundScreen() {
  const router = useRouter();
  const { status } = useAuth();

  const signedIn = status === "signedIn";
  const destination = signedIn ? "/" : "/login";
  const label = signedIn ? "Go to my courses" : "Go to sign in";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Not found", headerShown: false }} />
      <View style={{ alignItems: "center", marginTop: spacing.xl, gap: spacing.md }}>
        <Feather name="compass" size={28} color={colors.muted} />
        <H1>We couldn't find that page</H1>
        <Muted style={{ textAlign: "center" }}>
          The link may be out of date, or it may have been meant for a different part of the app.
        </Muted>
        <View style={{ alignSelf: "stretch", marginTop: spacing.md }}>
          <Button label={label} onPress={() => router.replace(destination)} />
        </View>
      </View>
    </Screen>
  );
}

// REQ-175: shown over everything when the server says this build is below
// MIN_APP_VERSION (a 426 { code: "update_required" }; src/lib/appVersion.ts).
// Native gets a link to its store; web reloads, which fetches the current
// bundle. Replaces the raw error strings older builds showed in this case.
import React from "react";
import { Linking, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, Button, H1, Muted } from "@/components/ui";
import type { UpdateRequired as UpdateRequiredInfo } from "@/lib/appVersion";
import { colors, spacing } from "@/lib/theme";

export function UpdateRequired({ info }: { info: UpdateRequiredInfo }) {
  const web = Platform.OS === "web";
  return (
    <SafeAreaView
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <BrandMark size={64} />
      <View style={{ alignItems: "center", gap: 6 }}>
        <H1>Update required</H1>
        <Muted style={{ textAlign: "center" }}>
          {web ? "A newer version of Ascendra is available. Reload to get it." : info.message}
        </Muted>
      </View>
      <View style={{ width: "100%", maxWidth: 360, gap: spacing.sm }}>
        {web ? (
          <Button
            label="Reload"
            icon="refresh-cw"
            onPress={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          />
        ) : info.storeUrl ? (
          <Button label="Update Ascendra" icon="download" onPress={() => Linking.openURL(info.storeUrl!).catch(() => undefined)} />
        ) : (
          <Muted style={{ textAlign: "center" }}>Open your app store and update Ascendra to keep going.</Muted>
        )}
      </View>
    </SafeAreaView>
  );
}

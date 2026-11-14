// REQ-175: shown over everything when the server says this build is below
// MIN_APP_VERSION (a 426 { code: "update_required" }; src/lib/appVersion.ts).
// Web reloads, which fetches the current bundle. A phone first looks for an
// over-the-air update and applies it (REQ-300); when there is none it gets a
// link to its store (src/lib/updatePrompt.ts). Replaces the raw error strings
// older builds showed in this case.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { BrandMark, Button, H1, Loading, Muted } from "@/components/ui";
import { APP_VERSION, type AppPlatform, type UpdateRequired as UpdateRequiredInfo } from "@/lib/appVersion";
import { shouldTryOta, updatePromptView, type UpdatePhase } from "@/lib/updatePrompt";
import { colors, spacing } from "@/lib/theme";

const platform: AppPlatform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";

// Over-the-air first (REQ-300): look for an update, fetch and apply it. Returns
// false when there is none or updates are off, so the screen shows the store.
async function applyOtaUpdate(onInstalling: () => void): Promise<boolean> {
  if (!shouldTryOta(platform, Updates.isEnabled && !__DEV__)) return false;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    onInstalling();
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return false; // offline or a bad update: the store link still works
  }
}

export function UpdateRequired({ info }: { info: UpdateRequiredInfo }) {
  const [phase, setPhase] = useState<UpdatePhase>(platform === "web" ? "store" : "checking");
  const live = useRef(true);

  const tryOta = useCallback(() => {
    setPhase("checking");
    void applyOtaUpdate(() => live.current && setPhase("installing")).then((applied) => {
      if (!applied && live.current) setPhase("store");
    });
  }, []);

  useEffect(() => {
    live.current = true;
    if (platform !== "web") tryOta();
    return () => {
      live.current = false;
    };
  }, [tryOta]);

  const view = updatePromptView(platform, phase, info, APP_VERSION);
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
        <H1>{view.title}</H1>
        <Muted style={{ textAlign: "center" }}>{view.message}</Muted>
      </View>
      <View style={{ width: "100%", maxWidth: 360, gap: spacing.sm }}>
        {view.busy ? <Loading /> : null}
        {view.action === "reload" ? (
          <Button
            label={view.actionLabel!}
            icon="refresh-cw"
            onPress={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          />
        ) : null}
        {view.action === "store" && info.storeUrl ? (
          <Button label={view.actionLabel!} icon="download" onPress={() => Linking.openURL(info.storeUrl!).catch(() => undefined)} />
        ) : null}
        {view.action === "check-again" ? <Button label={view.actionLabel!} icon="refresh-cw" variant="ghost" onPress={tryOta} /> : null}
      </View>
    </SafeAreaView>
  );
}

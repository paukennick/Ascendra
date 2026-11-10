import React, { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Muted } from "@/components/ui";
import { localDataGuard } from "@/lib/localData";
import { DICTATION_HINT, dictationHintKey, showDictationHint } from "@/lib/dictation";
import { colors, spacing } from "@/lib/theme";

// REQ-197: the one-time "dictate with your keyboard's mic" tip (src/lib/dictation.ts).
export function DictationHint() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!userId || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
    let live = true;
    AsyncStorage.getItem(dictationHintKey(userId))
      .then((v) => live && setDismissed(v === "1"))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);

  if (!showDictationHint(Platform.OS, dismissed, userId)) return null;

  const dismiss = () => {
    setDismissed(true);
    const key = dictationHintKey(userId!);
    if (localDataGuard.mayWrite(key)) void AsyncStorage.setItem(key, "1").catch(() => undefined);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }} accessibilityLiveRegion="polite">
      <Feather name="mic" size={14} color={colors.mutedDim} />
      <Muted style={{ flex: 1, fontSize: 13 }}>{DICTATION_HINT}</Muted>
      <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss tip" hitSlop={12}>
        <Feather name="x" size={16} color={colors.mutedDim} />
      </Pressable>
    </View>
  );
}

// The prompt shown when an update has been downloaded and is waiting.
//
// Styled as information, not alarm: accent rather than warning colour, and a
// dismiss that actually dismisses. Nothing here is urgent to the user -- the
// app works as it stands -- so it should read as an offer, not a demand.
//
// Mirrors IdleWarningBanner's shape in app/_layout.tsx so the two read as the
// same kind of object when either appears.

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";

export function UpdateBanner({
  onApply,
  onDismiss,
}: {
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.lg,
        backgroundColor: colors.accentDim,
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: radius.md,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        ...shadow.sm,
      }}
    >
      <Feather name="arrow-up-circle" size={16} color={colors.accent} />
      <Text style={{ color: colors.text, fontFamily: fonts.body, flex: 1 }}>
        An update is ready to install.
      </Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss update prompt"
        hitSlop={8}
        style={{ paddingVertical: 6, paddingHorizontal: 10 }}
      >
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Later</Text>
      </Pressable>
      <Pressable
        onPress={onApply}
        accessibilityRole="button"
        accessibilityLabel="Restart now to install the update"
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: radius.sm,
          backgroundColor: colors.accent,
        }}
      >
        <Text style={{ color: colors.bg, fontFamily: fonts.bodySemiBold }}>Restart</Text>
      </Pressable>
    </View>
  );
}

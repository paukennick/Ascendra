import React from "react";
import { View } from "react-native";
import { Body, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// REQ-314: small pieces the facility console, the sandbox report and the client
// trainer share. Every row is one accessible element whose label says its
// state in words, at least 48 dp tall, and focusable so a keyboard on web
// reaches it with Tab in the order it is on screen (react-native-web maps
// `focusable` to tabIndex 0).

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

export function Row({ a11y, strong, children, color, indent = 0 }: { a11y: string; strong?: boolean; children: React.ReactNode; color?: string; indent?: number }) {
  return (
    <View
      accessible
      focusable
      accessibilityLabel={a11y}
      style={{ minHeight: MIN_TOUCH, marginLeft: indent * spacing.md, borderWidth: strong ? 2 : 1, borderColor: color ?? colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
    >
      {children}
    </View>
  );
}

export function Meters({ meters }: { meters: { id: string; label: string; text: string }[] }) {
  return (
    <>
      {meters.map((m) => (
        <View key={m.id} accessible focusable accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
          <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
          <Body>{m.text}</Body>
        </View>
      ))}
    </>
  );
}

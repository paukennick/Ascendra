import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetModal } from "@/components/SheetModal";
import { Body, Button, Checkbox, ErrorBanner } from "@/components/ui";
import {
  MATURE_CONFIRM_LABEL,
  MATURE_CONFIRM_STATEMENT,
  MATURE_DECLINE_LABEL,
  MATURE_NOTICE_LINES,
  MATURE_NOTICE_TITLE,
} from "@/lib/matureContent";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

// REQ-224: the 18+ mature-content notice (text in src/lib/matureContent.ts),
// shown by MatureContentProvider over the intake form, Explore, or any screen
// whose request the server refused for a missing confirmation. The learner
// ticks the age statement, then confirms; "Not now" sends nothing. A
// SheetModal, so it hides under the app lock (REQ-192).
export function MatureContentSheet({
  visible,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [ticked, setTicked] = useState(false);
  useEffect(() => {
    if (!visible) setTicked(false);
  }, [visible]);
  if (!visible) return null;
  return (
    <SheetModal transparent visible animationType={reduced ? "none" : "slide"} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close without confirming" />
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title} accessibilityRole="header">
              {MATURE_NOTICE_TITLE}
            </Text>
            {MATURE_NOTICE_LINES.map((line) => (
              <Body key={line} style={{ fontSize: 15, lineHeight: 22 }}>
                {line}
              </Body>
            ))}
            <Checkbox checked={ticked} onChange={setTicked} label={MATURE_CONFIRM_STATEMENT} />
            {error ? <ErrorBanner message={error} /> : null}
          </ScrollView>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label={MATURE_CONFIRM_LABEL} icon="check" loading={busy} disabled={!ticked} onPress={onConfirm} />
            <Button label={MATURE_DECLINE_LABEL} variant="ghost" onPress={onCancel} accessibilityLabel="Not now, don't open mature content" />
          </View>
        </View>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 20 },
});

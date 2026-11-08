import React, { useCallback, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useOnboarding } from "@/auth/OnboardingContext";
import { Body, Button, Muted } from "@/components/ui";
import { longDate } from "@/lib/datePicker";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  entryToShow,
  iconOrFallback,
  itemA11yLabel,
  mayOfferWhatsNew,
  parseWhatsNew,
  sessionDismissed,
  type WhatsNewEntry,
  type WhatsNewItem,
} from "@/lib/whatsNew";

// REQ-140: the "What's new" sheet on Home and the item list the history
// screen (app/(app)/whats-new.tsx) shares.

type IconName = React.ComponentProps<typeof Feather>["name"];
const glyphs = (Feather as unknown as { glyphMap?: Record<string, number> }).glyphMap ?? {};
const hasGlyph = (n: string) => n in glyphs;

export function WhatsNewItemRow({ item }: { item: WhatsNewItem }) {
  return (
    <View style={styles.item} accessible accessibilityLabel={itemA11yLabel(item)}>
      <View style={styles.iconWrap}>
        <Feather name={iconOrFallback(item.icon, hasGlyph) as IconName} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.headline}>{item.headline}</Text>
        <Body style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{item.body}</Body>
      </View>
    </View>
  );
}

export function noteDate(entry: WhatsNewEntry): string {
  return longDate(entry.date);
}

// Home calls this. On focus, when the launch questions are settled, it asks
// the server whether there is an unseen note and shows it. Any failure is
// silent (Home works without it) and the next focus tries again. Leaving
// Home hides the sheet without marking it, so it never sits over a lesson,
// exam or lab.
export function useWhatsNewOnFocus() {
  const { user } = useAuth();
  const { state: onboarding, gate } = useOnboarding();
  const [entry, setEntry] = useState<WhatsNewEntry | null>(null);
  const focused = useRef(false);
  const userId = user?.id ?? null;
  const allowed = mayOfferWhatsNew(onboarding !== null, gate);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      let live = true;
      if (userId && allowed) {
        api
          .get<unknown>("/api/whats-new")
          .then((data) => {
            if (!live || !focused.current) return;
            setEntry(entryToShow(parseWhatsNew(data), sessionDismissed(userId)));
          })
          .catch(() => undefined);
      }
      return () => {
        live = false;
        focused.current = false;
        setEntry(null);
      };
    }, [userId, allowed])
  );

  const dismiss = useCallback(() => {
    if (!entry || !userId) return;
    sessionDismissed(userId).add(entry.id);
    setEntry(null);
    api.post("/api/whats-new/seen", { id: entry.id }).catch(() => undefined);
  }, [entry, userId]);

  return { entry, dismiss };
}

export function WhatsNewSheet({ entry, onDismiss }: { entry: WhatsNewEntry | null; onDismiss: () => void }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  if (!entry) return null;
  return (
    <Modal transparent visible animationType={reduced ? "none" : "slide"} onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close what's new" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 2 }}>
              <Text style={styles.kicker}>What's new</Text>
              <Text style={styles.title} accessibilityRole="header">
                {entry.title}
              </Text>
              <Muted>{noteDate(entry)}</Muted>
            </View>
            {entry.items.map((item) => (
              <WhatsNewItemRow key={item.headline} item={item} />
            ))}
          </ScrollView>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Got it" accessibilityLabel="Got it, close what's new" onPress={onDismiss} />
            <Button
              label="See all updates"
              variant="ghost"
              onPress={() => {
                onDismiss();
                router.push("/whats-new");
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  kicker: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.link,
  },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 19 },
  item: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
});

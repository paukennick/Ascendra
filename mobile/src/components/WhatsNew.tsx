import React, { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SheetModal } from "@/components/SheetModal";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useOnboarding } from "@/auth/OnboardingContext";
import { Body, Button, H2, Muted, MIN_TOUCH } from "@/components/ui";
import { longDate } from "@/lib/datePicker";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  entryToShow,
  iconOrFallback,
  itemA11yLabel,
  mayOfferWhatsNew,
  parseWhatsNew,
  RELEASE_NOTES_LINK_LABEL,
  RELEASE_NOTES_ROUTE,
  sessionDismissed,
  versionLabel,
  dialogA11yLabel,
  WHATS_NEW_CLOSE_LABEL,
  WHATS_NEW_GOT_IT,
  WHATS_NEW_KICKER,
  type WhatsNewEntry,
  type WhatsNewItem,
} from "@/lib/whatsNew";

// REQ-140, REQ-299: the "What's new" dialog on Home and the item list the
// Release notes screen (app/(app)/release-notes.tsx) shares.

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
// the server whether there is an unseen note and shows it (as a dialog). Any failure is
// silent (Home works without it) and the next focus tries again. Leaving
// Home hides the dialog without marking it, so it never sits over a lesson,
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

// REQ-299: the newest unseen note, once, as a centered dialog (it was a sheet
// from the bottom). On the web react-native-web's Modal is a real dialog: role
// "dialog" and aria-modal, Tab kept inside it, Escape closes it, and focus goes
// back to where it was; the first stop inside is the Close button. On a phone
// the Modal is its own window, so a screen reader stays inside it
// (accessibilityViewIsModal) and the back button closes it. Every way out
// (Close, Got it, tapping outside, Escape, back) marks the note seen -- it
// appears once -- and "See all release notes" does the same on its way to
// the Release notes screen. Reduce motion turns the fade off.
export function WhatsNewDialog({ entry, onDismiss }: { entry: WhatsNewEntry | null; onDismiss: () => void }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  if (!entry) return null;
  const date = noteDate(entry);
  const version = versionLabel(entry);
  // react-native-web hands extra props to the dialog element; a phone ignores them.
  const webDialog = { "aria-label": dialogA11yLabel(entry, date) } as object;
  return (
    <SheetModal transparent visible animationType={reduced ? "none" : "fade"} onRequestClose={onDismiss} {...webDialog}>
      <View style={styles.backdrop}>
        {/* Tapping outside closes it; not a tab stop, since Close and Got it are. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessible={false}
          focusable={false}
          importantForAccessibility="no"
        />
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.kicker}>{WHATS_NEW_KICKER}</Text>
              <H2>{entry.title}</H2>
              <Muted>{version ? `${date} · ${version}` : date}</Muted>
            </View>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={WHATS_NEW_CLOSE_LABEL}
              hitSlop={4}
              style={({ pressed }) => [styles.close, pressed ? { opacity: 0.7 } : null]}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false} style={styles.body}>
            {entry.items.map((item) => (
              <WhatsNewItemRow key={item.headline} item={item} />
            ))}
          </ScrollView>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label={WHATS_NEW_GOT_IT} accessibilityLabel={`${WHATS_NEW_GOT_IT}, ${WHATS_NEW_CLOSE_LABEL.toLowerCase()}`} onPress={onDismiss} />
            <Button
              label={RELEASE_NOTES_LINK_LABEL}
              variant="ghost"
              onPress={() => {
                onDismiss();
                router.push(RELEASE_NOTES_ROUTE);
              }}
            />
          </View>
        </View>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  dialog: {
    maxHeight: "88%",
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  body: { flexShrink: 1 },
  close: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.link,
  },
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

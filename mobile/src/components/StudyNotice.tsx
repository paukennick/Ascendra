import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SheetModal } from "@/components/SheetModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Button } from "@/components/ui";
import {
  AI_DATA_HEADING,
  STUDY_NOTICE_ACCEPT_LABEL,
  STUDY_NOTICE_CONTINUE_LABEL,
  STUDY_NOTICE_SUMMARY,
  STUDY_NOTICE_TITLE,
  sectionsFor,
  type NoticePage,
} from "@/lib/studyNotice";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

// REQ-165: one page of the study notice (src/lib/studyNotice.ts), shared by
// the launch screen (app/(app)/notice.tsx) and the backstop sheet below.
// "content" is the disclaimer; "data" is the AI data disclosure on its own.
export function StudyNoticeBody({ page, onReadPrivacy }: { page: NoticePage; onReadPrivacy: () => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      {page === "content" ? <Body style={{ fontSize: 16, lineHeight: 24 }}>{STUDY_NOTICE_SUMMARY}</Body> : null}
      {sectionsFor(page).map((s) => (
        <View key={s.heading} style={{ gap: spacing.xs }}>
          {page === "content" ? (
            <Text style={styles.heading} accessibilityRole="header">
              {s.heading}
            </Text>
          ) : null}
          {s.lines.map((line) => (
            <Body key={line} style={{ fontSize: 15, lineHeight: 22 }}>
              {line}
            </Body>
          ))}
        </View>
      ))}
      {page === "data" ? (
        <Button label="Read the Privacy Policy" variant="link" fullWidth={false} icon="shield" onPress={onReadPrivacy} />
      ) : null}
    </View>
  );
}

// Shown by OnboardingProvider over whatever screen made an AI request while
// the launch state was unknown. The same two pages; "I agree" sends that
// request, anything else sends nothing.
export function StudyNoticeSheet({
  visible,
  busy,
  onAccept,
  onCancel,
  onReadPrivacy,
}: {
  visible: boolean;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onReadPrivacy: () => void;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<NoticePage>("content");
  if (!visible) return null;
  const close = () => {
    setPage("content");
    onCancel();
  };
  return (
    <SheetModal transparent visible animationType={reduced ? "none" : "slide"} onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close without sending" />
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]} accessibilityViewIsModal>
          <ScrollView key={page} contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title} accessibilityRole="header">
              {page === "content" ? STUDY_NOTICE_TITLE : AI_DATA_HEADING}
            </Text>
            <StudyNoticeBody page={page} onReadPrivacy={onReadPrivacy} />
          </ScrollView>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {page === "content" ? (
              <Button label={STUDY_NOTICE_CONTINUE_LABEL} icon="arrow-right" onPress={() => setPage("data")} />
            ) : (
              <Button
                label={STUDY_NOTICE_ACCEPT_LABEL}
                icon="check"
                loading={busy}
                onPress={() => {
                  setPage("content");
                  onAccept();
                }}
              />
            )}
            <Button label="Not now" variant="ghost" onPress={close} accessibilityLabel="Not now, send nothing" />
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
  heading: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 },
});

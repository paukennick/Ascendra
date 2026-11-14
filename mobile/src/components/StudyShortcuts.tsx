import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SheetModal } from "@/components/SheetModal";
import { Body, Button, H2, IconButton, LiveAnnouncement, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { isReducedMotion } from "@/lib/useReducedMotion";
import {
  SHORTCUTS_HINT,
  SHORTCUTS_OFF_LABEL,
  SHORTCUTS_OFF_NOTE,
  SHORTCUTS_RULES_NOTE,
  SHORTCUTS_SAVE_FAILED,
  SHORTCUTS_TITLE,
  shortcutRows,
  type Surface,
} from "@/lib/studyShortcuts";
import { attachStudyShortcuts, type HandlerResult } from "@/lib/studyShortcutsDom";
import { studyShortcutsSetting, useStudyShortcutsSetting } from "@/lib/useStudyShortcutsSetting";
import { Alert } from "@/lib/alert";

// REQ-290 (Nick, 2026-11-09): study keyboard shortcuts, web only. One question
// area per screen wraps what the learner works on; the keys act only while
// focus is in it, never in a text box, and the learner can turn them off
// (Settings > Study). The rules are src/lib/studyShortcuts.ts, the listening is
// src/lib/studyShortcutsDom.ts. A handler returns false to decline (the key
// keeps its normal job), true when it acted, or a sentence for a screen reader
// to hear (the keyboard learner has no tap to hear it from).
//
// On a phone this is a plain View: React Native gives a View no key events from
// a hardware keyboard, and Expo has no API for them, so the shortcuts are not
// offered there and Settings does not show the switch.

// What an answer list carries so an option inside it counts as an answer.
export const answerListProps: object = Platform.OS === "web" ? { dataSet: { studyAnswers: "1" } } : {};

export interface StudyShortcutAreaProps {
  surface: Surface;
  // How many answer keys are live right now; 0 or absent when no choices are on screen.
  choices?: number;
  onChoose?: (index: number) => HandlerResult;
  onEnter?: () => HandlerResult;
  onNext?: () => HandlerResult;
  onPrevious?: () => HandlerResult;
  onFlag?: () => HandlerResult;
  onPause?: () => HandlerResult;
  // Layout of the wrapper (the card's own gap, so it looks as it did).
  style?: ViewStyle;
  children: React.ReactNode;
}

export function StudyShortcutArea(props: StudyShortcutAreaProps) {
  if (Platform.OS !== "web") return <View style={props.style}>{props.children}</View>;
  return <WebArea {...props} />;
}

// The number that picks an option, drawn at the end of the row in the places
// that show no letter (a lesson check, Today's review, comparison practice).
// Web with shortcuts on only; hidden from a screen reader, which hears the
// number in what the key announces and the shortcuts list.
export function ChoiceKey({ index }: { index: number }) {
  const { enabled } = useStudyShortcutsSetting();
  if (Platform.OS !== "web" || !enabled || index > 8) return null;
  return (
    <Text {...({ "aria-hidden": true } as object)} style={styles.choiceKey}>
      {index + 1}
    </Text>
  );
}

function WebArea(props: StudyShortcutAreaProps) {
  const { enabled, setEnabled } = useStudyShortcutsSetting();
  const ref = useRef<View>(null);
  const latest = useRef(props);
  latest.current = props;
  const [helpOpen, setHelpOpen] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) return;
    return attachStudyShortcuts({
      node,
      doc: document,
      surface: props.surface,
      choices: () => latest.current.choices ?? 0,
      enabled: () => studyShortcutsSetting.isEnabled(),
      handlers: () => {
        const p = latest.current;
        return {
          choose: p.onChoose,
          enter: p.onEnter,
          next: p.onNext,
          previous: p.onPrevious,
          flag: p.onFlag,
          pause: p.onPause,
          help: () => {
            setHelpOpen(true);
            return true;
          },
        };
      },
      announce: setSaid,
    });
  }, [props.surface]);

  return (
    <View ref={ref} style={props.style}>
      {props.children}
      {enabled ? <Muted style={{ fontSize: 12 }}>{SHORTCUTS_HINT}</Muted> : null}
      <LiveAnnouncement message={said} />
      <ShortcutHelp
        visible={helpOpen}
        surface={props.surface}
        onClose={() => setHelpOpen(false)}
        onTurnOff={async () => {
          setHelpOpen(false);
          const saved = await setEnabled(false);
          if (!saved) Alert.alert("Keyboard shortcuts are off", SHORTCUTS_SAVE_FAILED);
        }}
      />
    </View>
  );
}

// The "?" list. A dialog with a name (aria-label on the modal, which react
// native web draws as role="dialog" aria-modal), focus moves to its first
// control (Close) and comes back to where it was on close, and Escape closes it
// (the modal's own handling). Rows are a list, each read as one sentence.
function ShortcutHelp({
  visible,
  surface,
  onClose,
  onTurnOff,
}: {
  visible: boolean;
  surface: Surface;
  onClose: () => void;
  onTurnOff: () => void;
}) {
  if (!visible) return null;
  const rows = shortcutRows(surface);
  return (
    <SheetModal
      transparent
      visible
      animationType={isReducedMotion() ? "none" : "fade"}
      onRequestClose={onClose}
      {...({ "aria-label": SHORTCUTS_TITLE } as object)}
    >
      <Pressable style={styles.backdrop} onPress={onClose} focusable={false}>
        <Pressable style={styles.sheet} onPress={() => undefined} focusable={false}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <H2>{SHORTCUTS_TITLE}</H2>
            </View>
            <IconButton icon="x" accessibilityLabel="Close keyboard shortcuts" onPress={onClose} />
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.sm }}>
            <View {...({ role: "list" } as object)} style={{ gap: spacing.sm }}>
              {rows.map((r) => (
                <View key={r.keys} {...({ role: "listitem" } as object)} style={styles.row}>
                  <Text style={styles.keys}>{r.keys}</Text>
                  <Body style={{ flex: 1 }}>{r.does}</Body>
                </View>
              ))}
            </View>
            <Muted>{SHORTCUTS_RULES_NOTE}</Muted>
            <Button label={SHORTCUTS_OFF_LABEL} variant="ghost" onPress={onTurnOff} />
            <Muted>{SHORTCUTS_OFF_NOTE}</Muted>
          </ScrollView>
          <Button label="Close" onPress={onClose} />
        </Pressable>
      </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.md },
  sheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  choiceKey: { color: colors.mutedDim, fontFamily: fonts.monoMedium, fontSize: 12, minWidth: 14, textAlign: "right" },
  keys: {
    minWidth: 120,
    maxWidth: 140,
    color: colors.text,
    fontFamily: fonts.monoMedium,
    fontSize: 13,
    lineHeight: 22,
  },
});

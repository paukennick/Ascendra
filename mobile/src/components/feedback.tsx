import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Body, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { describeMark, optionLetter, type MarkTone, type ReasonRow } from "@/lib/lessonFeedback";

// REQ-105: the pieces that explain a graded answer -- why each option is or
// isn't right, the model answer, and the one thing to fix next. Shared by the
// lesson checks and the PBQ simulator. Calm by design: a missed pick is marked
// in the amber "warn" tone, never a wall of red, and every mark has visible
// text and a spoken label so nothing depends on colour. Text uses the theme's
// body/muted styles (no fixed heights), so it reflows with large text.

const TONE: Record<MarkTone, string> = {
  good: colors.good,
  warn: colors.warn,
  bad: colors.bad,
  neutral: colors.muted,
};

// A disclosure row: closed by default, announced as a button with its
// expanded state.
export function Collapsible({
  label,
  children,
  initiallyOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.collapsible}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={styles.collapsibleHead}
      >
        <Feather name={open ? "chevron-down" : "chevron-right"} size={18} color={colors.accent} />
        <Body style={{ flex: 1, color: colors.link, fontFamily: fonts.bodySemiBold }}>{label}</Body>
      </Pressable>
      {open ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

// The single most useful fix, phrased as a next step.
export function NextStep({ text }: { text: string }) {
  return (
    <View style={styles.nextStep} accessible accessibilityLabel={`Next step: ${text}`}>
      <Feather name="arrow-right-circle" size={18} color={colors.warn} />
      <View style={{ flex: 1, gap: 2 }}>
        <Muted style={{ color: colors.warn, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>Next step</Muted>
        <Body>{text}</Body>
      </View>
    </View>
  );
}

// Why each option is or isn't right, the learner's pick and the correct one
// first (order decided by reasonRows). Falls back to the single explanation
// for a lesson cached before option reasons existed.
export function OptionReasons({
  rows,
  choices,
  fallbackWhy,
}: {
  rows: ReasonRow[] | null;
  choices: string[];
  fallbackWhy: string | null;
}) {
  if (!rows) {
    return fallbackWhy ? <Muted>Why: {fallbackWhy}</Muted> : null;
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <Muted style={{ fontFamily: fonts.bodySemiBold }}>Why each option is or isn't right</Muted>
      {rows.map((row) => {
        const d = describeMark(row.mark);
        const tone = TONE[d?.tone ?? "neutral"];
        const head = `${optionLetter(row.index)}. ${choices[row.index] ?? ""}`;
        return (
          <View
            key={row.index}
            accessible
            accessibilityLabel={`${d ? `${d.a11y}. ` : ""}Option ${head}. ${row.reason}`}
            style={[styles.reason, { borderLeftColor: d ? tone : colors.border }]}
          >
            <Body style={{ fontFamily: fonts.bodySemiBold }}>{head}</Body>
            {d ? <Muted style={{ color: tone, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>{d.tag}</Muted> : null}
            <Body>{row.reason}</Body>
          </View>
        );
      })}
    </View>
  );
}

// A graded result's feedback, next step and model answer -- what stays in
// view while the learner revises.
export function FeedbackPanel({
  title,
  result,
}: {
  title?: string;
  result: { feedback: string; missedParts?: string[]; fixNext?: string | null; modelAnswer?: string | null };
}) {
  return (
    <View style={styles.panel}>
      {title ? <Muted style={{ fontFamily: fonts.bodySemiBold }}>{title}</Muted> : null}
      <Body>{result.feedback}</Body>
      {result.missedParts && result.missedParts.length ? <Muted>Missed: {result.missedParts.join(", ")}</Muted> : null}
      {result.fixNext ? <NextStep text={result.fixNext} /> : null}
      {result.modelAnswer ? (
        <Collapsible label="Show a model answer">
          <Body>{result.modelAnswer}</Body>
        </Collapsible>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsible: { gap: spacing.sm },
  collapsibleHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 },
  nextStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warnDim,
  },
  reason: { gap: 2, paddingLeft: spacing.md, borderLeftWidth: 3 },
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
});

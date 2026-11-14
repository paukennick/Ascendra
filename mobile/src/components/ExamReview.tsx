import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Body, Button, H3, LiveAnnouncement, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { navCounts, reviewFilterAnnouncement, reviewRows, submitWarning, type ReviewFilter } from "@/lib/examPractice";
import type { ExamItem } from "@/types/exam";

// REQ-298: the review screen a real exam shows before you end it -- every
// question with whether it has an answer and whether you flagged it, a filter
// for the unanswered and the flagged ones, a tap to go back to any of them,
// and the one way to finish. The clock keeps running behind it (it is the
// parent's clock; this screen has none of its own).
export function ExamReview({
  items,
  currentIndex,
  timed,
  submitting,
  onGo,
  onBack,
  onSubmit,
}: {
  items: Pick<ExamItem, "answered" | "flagged" | "unitTitle">[];
  currentIndex: number;
  timed: boolean;
  submitting: boolean;
  onGo: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const counts = navCounts(items);
  const rows = reviewRows(items, filter);
  const FILTERS: { key: ReviewFilter; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "unanswered", label: `Unanswered (${counts.unanswered})` },
    { key: "flagged", label: `Flagged (${counts.flagged})` },
  ];
  return (
    <View style={{ gap: spacing.sm }}>
      <H3>Review your answers</H3>
      <Muted>
        {submitWarning(counts)}
        {timed ? " The clock keeps running while you review." : ""}
      </Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} accessibilityRole="radiogroup">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            label={f.label}
            variant={filter === f.key ? "primary" : "ghost"}
            size="sm"
            fullWidth={false}
            selected={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>
      <LiveAnnouncement message={reviewFilterAnnouncement(filter, rows.length)} />
      {rows.length === 0 ? (
        <Body>{filter === "flagged" ? "Nothing is flagged." : filter === "unanswered" ? "Every question has an answer." : "No questions."}</Body>
      ) : null}
      {rows.map((r) => (
        <Pressable
          key={r.index}
          onPress={() => onGo(r.index)}
          accessibilityRole="button"
          accessibilityLabel={r.label}
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.sm,
            borderWidth: r.index === currentIndex ? 2 : 1,
            borderColor: r.index === currentIndex ? colors.accent : colors.border,
            backgroundColor: r.answered ? colors.accentDim : undefined,
          }}
        >
          <Body style={{ fontFamily: fonts.monoMedium, minWidth: 28 }}>{r.number}</Body>
          <View style={{ flex: 1 }}>
            <Body>{r.answered ? "Answered" : "Not answered"}</Body>
            <Muted style={{ fontSize: 12 }}>{r.unitTitle}</Muted>
          </View>
          {r.flagged ? <Feather name="flag" size={16} color={colors.warn} accessibilityLabel="Flagged" /> : null}
        </Pressable>
      ))}
      <Button label="Back to the questions" variant="ghost" icon="arrow-left" onPress={onBack} />
      <Button label="Submit and see results" icon="send" onPress={onSubmit} loading={submitting} />
    </View>
  );
}

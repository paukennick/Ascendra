import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { ExamItem, ExamResponse, Exhibit } from "@/types/exam";
import { Body, Button, ChoiceSheet, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { formatInstruction, initialOrder, moveStep, toggleChoice } from "@/lib/examPractice";

// REQ-109: one exam-style question -- multiple choice, multiple response,
// ordering, matching -- with its exhibit. Built for phones and screen
// readers first:
//   - every control is a real button / radio / checkbox with a spoken label
//     and state; nothing depends on colour alone (icons and words too)
//   - ordering uses Move up / Move down buttons, no drag gesture
//   - matching uses a select per item (a bottom sheet of the answers)
//   - text wraps instead of truncating, and no fixed heights, so large
//     system text sizes work
// After submit (`review`), the learner's answer and the right one are shown
// side by side, with the explanation.

export function ExamQuestion({
  item,
  response,
  onChange,
  review = false,
}: {
  item: ExamItem;
  response: ExamResponse | null;
  onChange?: (r: ExamResponse | null) => void;
  review?: boolean;
}) {
  const disabled = review || !onChange;
  return (
    <View style={{ gap: spacing.sm }}>
      <Body style={{ fontFamily: fonts.bodySemiBold }}>{item.stem}</Body>
      {item.exhibit ? <ExhibitView exhibit={item.exhibit} /> : null}
      {!review ? <Muted>{formatInstruction(item)}</Muted> : null}
      {item.format === "multiple_choice" || item.format === "multiple_response" ? (
        <Choices item={item} response={response} onChange={onChange} disabled={disabled} review={review} />
      ) : null}
      {item.format === "ordering" ? (
        <Ordering item={item} response={response} onChange={onChange} disabled={disabled} review={review} />
      ) : null}
      {item.format === "matching" ? (
        <Matching item={item} response={response} onChange={onChange} disabled={disabled} review={review} />
      ) : null}
      {review ? <ReviewNote item={item} /> : null}
    </View>
  );
}

function ExhibitView({ exhibit }: { exhibit: Exhibit }) {
  const kindLabel = { log: "Log excerpt", policy: "Policy", table: "Table", diagram: "Network diagram (described)" }[exhibit.kind];
  return (
    <View style={styles.exhibit} accessible accessibilityLabel={`Exhibit, ${kindLabel}: ${exhibit.title}`}>
      <Muted style={{ fontFamily: fonts.monoMedium, fontSize: 12 }}>
        EXHIBIT · {kindLabel.toUpperCase()}
      </Muted>
      <Body style={{ fontFamily: fonts.bodySemiBold }}>{exhibit.title}</Body>
      {exhibit.kind === "table" && exhibit.columns && exhibit.rows ? (
        // A row per card rather than a wide grid: readable at any text size
        // and read out as "Column: value" by a screen reader.
        <View style={{ gap: spacing.xs }}>
          {exhibit.rows.map((row, r) => (
            <View
              key={r}
              style={styles.tableRow}
              accessible
              accessibilityLabel={`Row ${r + 1}: ${row.map((cell, c) => `${exhibit.columns![c]} ${cell}`).join(", ")}`}
            >
              {row.map((cell, c) => (
                <Text key={c} style={styles.mono}>
                  <Text style={{ color: colors.muted }}>{exhibit.columns![c]}: </Text>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.mono} selectable>
          {exhibit.text}
        </Text>
      )}
    </View>
  );
}

const LETTERS = "ABCDEF";

function Choices({
  item,
  response,
  onChange,
  disabled,
  review,
}: {
  item: ExamItem;
  response: ExamResponse | null;
  onChange?: (r: ExamResponse | null) => void;
  disabled: boolean;
  review: boolean;
}) {
  const multi = item.format === "multiple_response";
  const picked = multi ? response?.choices ?? [] : response?.choice != null ? [response.choice] : [];
  const right = new Set(item.correct?.choices ?? []);
  return (
    <View style={{ gap: spacing.xs }} accessibilityRole={multi ? undefined : "radiogroup"}>
      {(item.choices ?? []).map((c, i) => {
        const on = picked.includes(i);
        const isRight = review && right.has(i);
        const isWrongPick = review && on && !right.has(i);
        return (
          <Pressable
            key={i}
            disabled={disabled}
            onPress={() => {
              if (!onChange) return;
              if (multi) onChange({ choices: toggleChoice(picked, i, item.selectCount ?? 2) });
              else onChange({ choice: i });
            }}
            accessibilityRole={multi ? "checkbox" : "radio"}
            accessibilityState={{ checked: on, disabled }}
            accessibilityLabel={`${LETTERS[i]}. ${c}${review ? (isRight ? ", correct answer" : "") + (on ? ", your answer" : "") : ""}`}
            style={({ pressed }) => [
              styles.option,
              on && styles.optionOn,
              isRight && styles.optionRight,
              isWrongPick && styles.optionWrong,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather
              name={multi ? (on ? "check-square" : "square") : on ? "check-circle" : "circle"}
              size={20}
              color={on ? colors.accent : colors.mutedDim}
            />
            <Body style={{ flex: 1 }}>
              {LETTERS[i]}. {c}
            </Body>
            {isRight ? <Feather name="check" size={18} color={colors.good} /> : null}
            {isWrongPick ? <Feather name="x" size={18} color={colors.bad} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Ordering({
  item,
  response,
  onChange,
  disabled,
  review,
}: {
  item: ExamItem;
  response: ExamResponse | null;
  onChange?: (r: ExamResponse | null) => void;
  disabled: boolean;
  review: boolean;
}) {
  const steps = item.steps ?? [];
  const order = initialOrder({ steps, response });
  const rightOrder = item.correct?.order;
  return (
    <View style={{ gap: spacing.xs }}>
      {order.map((stepIndex, pos) => {
        const ok = review && rightOrder ? rightOrder[pos] === stepIndex : null;
        return (
          <View
            key={stepIndex}
            style={[styles.option, ok === true && styles.optionRight, ok === false && styles.optionWrong]}
          >
            <Text style={styles.positionBadge} accessibilityElementsHidden importantForAccessibility="no">
              {pos + 1}
            </Text>
            <Text
              style={styles.stepText}
              accessibilityLabel={`Position ${pos + 1}: ${steps[stepIndex]}${ok === false ? ", out of place" : ""}`}
            >
              {steps[stepIndex]}
            </Text>
            {!disabled ? (
              <View style={{ gap: 4 }}>
                <MoveButton
                  icon="arrow-up"
                  label={`Move up: ${steps[stepIndex]}`}
                  disabled={pos === 0}
                  onPress={() => onChange?.({ order: moveStep(order, pos, -1) })}
                />
                <MoveButton
                  icon="arrow-down"
                  label={`Move down: ${steps[stepIndex]}`}
                  disabled={pos === order.length - 1}
                  onPress={() => onChange?.({ order: moveStep(order, pos, 1) })}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      {!disabled && !response?.order ? (
        <Button
          label="Keep this order as my answer"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => onChange?.({ order })}
        />
      ) : null}
    </View>
  );
}

function MoveButton({ icon, label, disabled, onPress }: { icon: "arrow-up" | "arrow-down"; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [styles.moveButton, disabled && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}
    >
      <Feather name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

function Matching({
  item,
  response,
  onChange,
  disabled,
  review,
}: {
  item: ExamItem;
  response: ExamResponse | null;
  onChange?: (r: ExamResponse | null) => void;
  disabled: boolean;
  review: boolean;
}) {
  const prompts = item.prompts ?? [];
  const answers = item.responses ?? [];
  const matches = response?.matches ?? prompts.map(() => null);
  const right = item.correct?.matches;
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ gap: spacing.xs }}>
      {prompts.map((p, i) => {
        const chosen = matches[i];
        const ok = review && right ? right[i] === chosen : null;
        return (
          <View key={i} style={[styles.matchRow, ok === true && styles.optionRight, ok === false && styles.optionWrong]}>
            <Body style={{ fontFamily: fonts.bodySemiBold }}>{p}</Body>
            <Pressable
              disabled={disabled}
              onPress={() => setOpen(i)}
              accessibilityRole="button"
              accessibilityLabel={`Match for ${p}: ${chosen == null ? "not chosen" : answers[chosen]}${disabled ? "" : ". Double tap to choose."}`}
              style={({ pressed }) => [styles.select, pressed && { opacity: 0.8 }]}
            >
              <Body style={{ flex: 1, color: chosen == null ? colors.muted : colors.text }}>
                {chosen == null ? "Choose..." : answers[chosen]}
              </Body>
              {!disabled ? <Feather name="chevron-down" size={18} color={colors.muted} /> : null}
            </Pressable>
            {review && ok === false && right && right[i] != null ? (
              <Muted style={{ fontSize: 13 }}>Right answer: {answers[right[i] as number]}</Muted>
            ) : null}
          </View>
        );
      })}
      <ChoiceSheet
        visible={open != null}
        title={open != null ? `Match for: ${prompts[open]}` : ""}
        options={[
          ...answers.map((a, r) => ({
            label: a,
            onPress: () => {
              const next = [...matches];
              next[open!] = r;
              onChange?.({ matches: next });
            },
          })),
          ...(open != null && matches[open] != null
            ? [
                {
                  label: "Clear this match",
                  onPress: () => {
                    const next = [...matches];
                    next[open!] = null;
                    onChange?.({ matches: next });
                  },
                },
              ]
            : []),
        ]}
        onCancel={() => setOpen(null)}
      />
    </View>
  );
}

function ReviewNote({ item }: { item: ExamItem }) {
  const verdictText =
    item.verdict === "correct" ? "Right" : item.verdict === "partial" ? "Partly right" : item.response ? "Not quite" : "Not answered";
  const color = item.verdict === "correct" ? colors.good : item.verdict === "partial" ? colors.warn : colors.muted;
  const share =
    item.verdict !== "correct" && item.partialScore != null && item.partialScore > 0 && item.format !== "multiple_choice"
      ? ` (${Math.round(item.partialScore * 100)}% of it right)`
      : "";
  return (
    <View style={{ gap: 4 }}>
      <Body style={{ color, fontFamily: fonts.bodyBold }}>
        {verdictText}
        {share}
      </Body>
      {item.format !== "matching" && item.correctText?.length && item.verdict !== "correct" ? (
        <Muted>
          {item.format === "ordering" ? "Right order: " : "Right answer: "}
          {item.correctText.join(item.format === "ordering" ? " → " : "; ")}
        </Muted>
      ) : null}
      {item.explanation ? <Body>{item.explanation}</Body> : null}
      {item.repeat ? (
        <Muted style={{ fontSize: 12 }}>You'd answered this question before, so it counts for less toward mastery.</Muted>
      ) : null}
    </View>
  );
}

// Confidence for calibration: same 1-5 scale as the lesson, as radios.
export function ExamConfidence({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Muted>How sure are you?</Muted>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === n }}
            accessibilityLabel={`Confidence ${n} of 5${n === 1 ? ", guessing" : n === 5 ? ", certain" : ""}`}
            style={[styles.confidence, value === n && styles.confidenceOn]}
          >
            <Body style={value === n ? { color: colors.accentText, fontFamily: fonts.bodyBold } : undefined}>{n}</Body>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Muted style={{ fontSize: 12 }}>guessing</Muted>
        <Muted style={{ fontSize: 12 }}>certain</Muted>
      </View>
    </View>
  );
}

export function FlagButton({ flagged, onPress }: { flagged: boolean; onPress: () => void }) {
  return (
    <Button
      label={flagged ? "Flagged for review" : "Flag for review"}
      accessibilityLabel={flagged ? "Flagged for review. Double tap to remove the flag." : "Flag for review"}
      icon="flag"
      variant="ghost"
      size="sm"
      fullWidth={false}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  exhibit: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  stepText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  mono: { fontFamily: fonts.mono, color: colors.text, fontSize: 13, lineHeight: 19 },
  tableRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs, gap: 2 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  optionRight: { borderColor: colors.good, borderWidth: 2 },
  optionWrong: { borderColor: colors.bad, borderWidth: 2 },
  positionBadge: {
    fontFamily: fonts.monoSemiBold,
    color: colors.link,
    minWidth: 22,
    textAlign: "center",
  },
  moveButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardAlt,
  },
  matchRow: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
  },
  confidence: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  confidenceOn: { borderColor: colors.accent, backgroundColor: colors.accent },
});

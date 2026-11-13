// REQ-252 (levels phase 1A): the pieces of learner levels the lesson screen
// and the course page show -- the level chip, the one-tap hunch, the mastery
// ladder, the level-change notice with Undo, the start-of-course goal
// question, and the progress card on the lesson's done screen. The rules and
// wording live in src/lib/learnerLevel.ts.
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Body, Button, Card, ErrorBanner, H2, LiveAnnouncement, Muted, VerdictBadge } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import {
  AUTO_LEVEL_NOTE,
  CHIP_HINT,
  GOAL_CHOICES,
  GOAL_QUESTION,
  HUNCH_INTRO,
  HUNCH_TITLE,
  JUST_TEACH_ME,
  LEVEL_NAMES,
  NO_IDEA,
  RATING_QUESTION,
  RUNG_MEANING,
  SAME_BAR_NOTE,
  chipLabel,
  hunchFeedback,
  ladderAnnouncement,
  levelChangeNotice,
  levelMeaning,
  ratingChoices,
  suggestionFor,
  type BeforeAfter,
  type CourseGoal,
  type HunchQuestion,
  type Ladder,
  type Level,
  type LevelChange,
  type LevelState,
} from "@/lib/learnerLevel";
import type { Hunch } from "@/lib/lessonProgress";

// "Level: New · change". One tap opens the course's level settings.
export function LevelChip({ level, onPress }: { level: Level; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${chipLabel(level)}. Change`}
      accessibilityHint={CHIP_HINT}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.75 }]}
    >
      <Feather name="sliders" size={13} color={colors.muted} />
      <Muted style={styles.chipText}>
        {chipLabel(level)} <Muted style={[styles.chipText, { color: colors.link }]}>· change</Muted>
      </Muted>
    </Pressable>
  );
}

// The one-tap hunch for New learners: 3-4 options plus "No idea yet", one
// tap and no typing, with "Just teach me" always visible.
export function HunchStep({
  question,
  onPick,
  onNoIdea,
  onSkip,
}: {
  question: HunchQuestion;
  onPick: (choice: string) => void;
  onNoIdea: () => void;
  onSkip: () => void;
}) {
  return (
    <Card elevated>
      <View style={styles.headingRow}>
        <Feather name="zap" size={18} color={colors.accent} />
        <H2>{HUNCH_TITLE}</H2>
      </View>
      <Muted style={{ fontSize: 13 }}>{HUNCH_INTRO}</Muted>
      <Body>{question.prompt}</Body>
      <View style={{ gap: 8 }}>
        {question.choices.map((c, i) => (
          <Pressable
            key={i}
            onPress={() => onPick(c)}
            accessibilityRole="button"
            accessibilityLabel={`My hunch: ${c}`}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Body style={{ flex: 1 }}>{c}</Body>
          </Pressable>
        ))}
        <Pressable
          onPress={onNoIdea}
          accessibilityRole="button"
          accessibilityLabel={NO_IDEA}
          style={({ pressed }) => [styles.option, styles.optionQuiet, pressed && styles.optionPressed]}
        >
          <Feather name="help-circle" size={16} color={colors.muted} />
          <Body style={{ flex: 1, color: colors.muted }}>{NO_IDEA}</Body>
        </Pressable>
      </View>
      <Button label={JUST_TEACH_ME} variant="link" icon="book-open" fullWidth={false} onPress={onSkip} />
    </Card>
  );
}

// At the top of Teach: the hunch and one line back (never a verdict).
export function HunchNote({ hunch, choice }: { hunch: Hunch; choice: string }) {
  return (
    <View style={styles.note}>
      <Muted>Your hunch</Muted>
      <Body>{hunch === "no_idea" ? NO_IDEA : choice}</Body>
      <Muted style={{ color: colors.text, fontSize: 13 }}>{hunchFeedback(hunch)}</Muted>
    </View>
  );
}

// The mastery ladder: five rungs, a higher rung fills those under it. Each
// rung has a text mark (filled or not), so nothing depends on colour.
export function LadderView({ ladder, compact = false }: { ladder: Ladder; compact?: boolean }) {
  return (
    <View style={{ gap: 4, alignSelf: "stretch" }} accessible accessibilityLabel={ladderAnnouncement(ladder)}>
      <View style={styles.ladderRow}>
        {ladder.rungs.map((r) => (
          <View key={r.name} style={styles.rung}>
            <View style={[styles.rungBar, { backgroundColor: r.filled ? colors.good : colors.border }]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              {r.filled ? <Feather name="check" size={11} color={colors.good} /> : null}
              <Muted style={{ fontSize: 11, color: r.filled ? colors.text : colors.mutedDim }}>{r.name}</Muted>
            </View>
          </View>
        ))}
      </View>
      {!compact && ladder.filled > 0 ? (
        <Muted style={{ fontSize: 12 }}>{RUNG_MEANING[ladder.rungs[ladder.filled - 1].name]}</Muted>
      ) : null}
      {ladder.note ? <Muted style={{ fontSize: 12 }}>{ladder.note}</Muted> : null}
    </View>
  );
}

// An automatic level change: what changed and why, with OK and Undo.
export function LevelNotice({
  change,
  flow,
  onSeen,
  onUndo,
}: {
  change: LevelChange;
  flow: boolean;
  onSeen: () => Promise<unknown> | void;
  onUndo: () => Promise<unknown> | void;
}) {
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown> | void) => async () => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const text = levelChangeNotice(change, flow);
  return (
    <View style={styles.notice}>
      <LiveAnnouncement message={text} />
      <View style={styles.headingRow}>
        <Feather name="trending-up" size={16} color={colors.accent} />
        <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>Level changed</Muted>
      </View>
      <Body style={{ fontSize: 14 }}>{text}</Body>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label="OK" size="sm" fullWidth={false} onPress={run(onSeen)} />
        <Button label="Undo" size="sm" variant="ghost" icon="rotate-ccw" fullWidth={false} onPress={run(onUndo)} />
      </View>
      {error ? <ErrorBanner message={error} /> : null}
    </View>
  );
}

// The lesson's done screen, for the pilot courses: what the learner can do
// now, their first guess beside their answer now, credit for a comeback, and
// the ladder. No points, no confetti.
export function DoneProgress({
  canDo,
  beforeAfter,
  comeback,
  ladder,
}: {
  canDo: string | null;
  beforeAfter: BeforeAfter | null;
  comeback: string | null;
  ladder: Ladder;
}) {
  return (
    <View style={{ gap: spacing.sm, alignSelf: "stretch" }}>
      {canDo ? (
        <View style={styles.headingRow}>
          <Feather name="check-circle" size={16} color={colors.good} />
          <Body style={{ flex: 1, fontFamily: fonts.bodySemiBold }}>{canDo}</Body>
        </View>
      ) : null}
      {comeback ? <Body style={{ fontSize: 14 }}>{comeback}</Body> : null}
      {beforeAfter ? (
        <View style={styles.beforeAfter}>
          <View style={{ flex: 1, minWidth: 120, gap: 2 }}>
            <Muted style={{ fontSize: 12 }}>Your first guess</Muted>
            <Body style={{ fontSize: 14 }}>{beforeAfter.before}</Body>
          </View>
          <Feather name="arrow-right" size={16} color={colors.mutedDim} style={{ alignSelf: "center" }} />
          <View style={{ flex: 1, minWidth: 120, gap: 2 }}>
            <Muted style={{ fontSize: 12 }}>{beforeAfter.nowLabel}</Muted>
            <Body style={{ fontSize: 14 }}>{beforeAfter.now}</Body>
            {beforeAfter.verdict ? <VerdictBadge verdict={beforeAfter.verdict} /> : null}
          </View>
        </View>
      ) : null}
      <LadderView ladder={ladder} />
    </View>
  );
}

// The start-of-course question and the level on one screen (course page and
// course level settings). `compact` hides the explanations once answered.
export function GoalAndLevelForm({
  state,
  saving,
  submitLabel,
  onSave,
  onSkip,
}: {
  state: LevelState;
  saving: boolean;
  submitLabel: string;
  onSave: (goal: CourseGoal | null, level: Level) => void;
  onSkip?: () => void;
}) {
  const [goal, setGoal] = useState<CourseGoal | null>(state.goal);
  const [level, setLevel] = useState<Level>(state.courseLevel ?? state.suggestion.level);
  // Until the learner picks a level themselves, it follows the goal.
  const [levelTouched, setLevelTouched] = useState(state.courseLevelSource === "self");
  const pickGoal = (g: CourseGoal) => {
    setGoal(g);
    if (!levelTouched) setLevel(suggestionFor(g, state));
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>{GOAL_QUESTION}</Muted>
      <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={GOAL_QUESTION}>
        {GOAL_CHOICES.map((g) => (
          <Choice key={g.id} label={g.label} selected={goal === g.id} onPress={() => pickGoal(g.id)} />
        ))}
      </View>
      <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold, marginTop: spacing.sm }}>{RATING_QUESTION}</Muted>
      <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={RATING_QUESTION}>
        {ratingChoices(state.trackCode).map((r) => (
          <Choice
            key={r.id}
            label={r.label}
            sub={LEVEL_NAMES[r.id]}
            selected={level === r.id}
            onPress={() => {
              setLevel(r.id);
              setLevelTouched(true);
            }}
          />
        ))}
      </View>
      <Muted style={{ fontSize: 12 }}>{levelMeaning(level, state.levelFlow)}</Muted>
      <Muted style={{ fontSize: 12 }}>{SAME_BAR_NOTE}</Muted>
      <Muted style={{ fontSize: 12 }}>{AUTO_LEVEL_NOTE}</Muted>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label={submitLabel} icon="check" fullWidth={false} loading={saving} onPress={() => onSave(goal, level)} />
        {onSkip ? <Button label="Skip for now" variant="ghost" fullWidth={false} disabled={saving} onPress={onSkip} /> : null}
      </View>
    </View>
  );
}

export function Choice({ label, sub, selected, onPress }: { label: string; sub?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}
    >
      <Feather name={selected ? "check-circle" : "circle"} size={16} color={selected ? colors.accent : colors.mutedDim} />
      <View style={{ flex: 1 }}>
        <Body style={{ fontSize: 14 }}>{label}</Body>
        {sub ? <Muted style={{ fontSize: 12 }}>{sub}</Muted> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  optionQuiet: { borderStyle: "dashed" },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  optionPressed: { opacity: 0.8 },
  note: { backgroundColor: colors.accentDim, borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  notice: {
    gap: spacing.sm,
    alignSelf: "stretch",
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  ladderRow: { flexDirection: "row", gap: 4 },
  rung: { flex: 1, gap: 3, alignItems: "flex-start" },
  rungBar: { height: 6, borderRadius: 3, alignSelf: "stretch" },
  beforeAfter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
});

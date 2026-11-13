// REQ-252 (levels phase 1A): the pieces of learner levels the lesson screen
// and the course page show -- the level chip, the one-tap hunch, the mastery
// ladder, the level-change notice with Undo, the goal question (REQ-255: the
// "Start course" sheet, the first-lesson card and the course page's summary
// line; the full form in the course's level settings), and the progress card
// on the lesson's done screen. The rules and
// wording live in src/lib/learnerLevel.ts.
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { SheetModal } from "@/components/SheetModal";
import { Body, Button, Card, ErrorBanner, H2, LiveAnnouncement, Muted, VerdictBadge } from "@/components/ui";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import {
  AUTO_LEVEL_NOTE,
  CHIP_HINT,
  GOAL_CHOICES,
  GOAL_QUESTION,
  GOAL_SUMMARY_LABEL,
  LESSON_GOAL_INTRO,
  NOT_NOW,
  SKIP_FOR_NOW,
  START_SHEET_INTRO,
  START_SHEET_TITLE,
  STARTING_LEVEL,
  goalSummary,
  startingLevelLine,
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

// The goal question and the level on one screen: the course's level
// settings (REQ-255: the course page no longer holds it).
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

// REQ-255: one tap on a reason answers the goal question (the start sheet
// and the lesson card). A plain button per reason, 48 dp, in reading order.
function GoalButtons({ disabled, onPick }: { disabled: boolean; onPick: (g: CourseGoal) => void }) {
  return (
    <View style={{ gap: 6 }} accessibilityRole="list" accessibilityLabel={GOAL_QUESTION}>
      {GOAL_CHOICES.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => onPick(g.id)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${GOAL_QUESTION} ${g.label}`}
          accessibilityState={{ disabled }}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed, disabled && { opacity: 0.6 }]}
        >
          <Body style={{ flex: 1, fontSize: 14 }}>{g.label}</Body>
          <Feather name="chevron-right" size={16} color={colors.mutedDim} />
        </Pressable>
      ))}
    </View>
  );
}

// REQ-255: "Start course" on a course never asked about opens this sheet.
// The starting level is pre-selected from the suggestion and folded into one
// line ("Change" opens the self-rating); one tap on a reason saves and starts
// the lesson; "Skip for now" keeps the suggested level and starts it too.
// Closing the sheet (backdrop, Back) starts nothing and asks nothing.
export function GoalStartSheet({
  state,
  visible,
  saving,
  error,
  onAnswer,
  onSkip,
  onClose,
}: {
  state: LevelState;
  visible: boolean;
  saving: boolean;
  error: string | null;
  onAnswer: (goal: CourseGoal, pickedLevel: Level | null) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<Level | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  if (!visible) return null;
  const shown = picked ?? state.suggestion.level;
  return (
    <SheetModal transparent visible animationType={reduced ? "none" : "slide"} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close without starting" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {START_SHEET_TITLE}
            </Text>
            <Muted style={{ fontSize: 13 }}>{START_SHEET_INTRO}</Muted>
            <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>{GOAL_QUESTION}</Muted>
            <GoalButtons disabled={saving} onPick={(g) => onAnswer(g, picked)} />
            <View style={styles.levelLine}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Muted style={{ fontSize: 12 }}>{STARTING_LEVEL}</Muted>
                <Body style={{ fontSize: 14 }}>{startingLevelLine(shown, picked !== null)}</Body>
              </View>
              <Button
                label={ratingOpen ? "Done" : "Change"}
                accessibilityLabel={ratingOpen ? "Done choosing a starting level" : `Change starting level, now ${LEVEL_NAMES[shown]}`}
                variant="link"
                fullWidth={false}
                disabled={saving}
                onPress={() => setRatingOpen((o) => !o)}
              />
            </View>
            {ratingOpen ? (
              <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={RATING_QUESTION}>
                <Muted style={{ fontSize: 12 }}>{RATING_QUESTION}</Muted>
                {ratingChoices(state.trackCode).map((r) => (
                  <Choice key={r.id} label={r.label} sub={LEVEL_NAMES[r.id]} selected={shown === r.id} onPress={() => setPicked(r.id)} />
                ))}
                <Muted style={{ fontSize: 12 }}>{levelMeaning(shown, state.levelFlow)}</Muted>
              </View>
            ) : null}
            {error ? <ErrorBanner message={error} /> : null}
            <Button label={SKIP_FOR_NOW} accessibilityLabel={`${SKIP_FOR_NOW} and start the lesson`} variant="ghost" disabled={saving} onPress={onSkip} />
          </ScrollView>
        </View>
      </View>
    </SheetModal>
  );
}

// REQ-255: the fallback in the first lesson opened in a course never asked
// about. Above the lesson, never in its way: one tap on a reason, or "Not
// now" (which counts as asked). Afterwards one line says what happened.
export function LessonGoalCard({
  done,
  saving,
  error,
  onAnswer,
  onDismiss,
}: {
  done: string | null;
  saving: boolean;
  error: string | null;
  onAnswer: (goal: CourseGoal) => void;
  onDismiss: () => void;
}) {
  if (done) {
    return (
      <View style={styles.note}>
        <LiveAnnouncement message={done} />
        <Muted style={{ color: colors.text, fontSize: 13 }}>{done}</Muted>
      </View>
    );
  }
  return (
    <View style={styles.goalCard}>
      <View style={styles.headingRow}>
        <Feather name="compass" size={16} color={colors.accent} />
        <Text style={styles.goalCardTitle} accessibilityRole="header">
          {GOAL_QUESTION}
        </Text>
      </View>
      <Muted style={{ fontSize: 13 }}>{LESSON_GOAL_INTRO}</Muted>
      <GoalButtons disabled={saving} onPick={onAnswer} />
      {error ? <ErrorBanner message={error} /> : null}
      <Button label={NOT_NOW} accessibilityLabel={`${NOT_NOW}: don't ask why I'm taking this course`} variant="link" fullWidth={false} disabled={saving} onPress={onDismiss} />
    </View>
  );
}

// REQ-255: the course page's goal line -- the current answer and "Change",
// which opens the course's level settings. It never asks.
export function GoalSummaryRow({ state, onChange }: { state: LevelState; onChange: () => void }) {
  const summary = goalSummary(state);
  return (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1, minWidth: 160 }}>
        <Muted style={{ fontSize: 12 }}>{GOAL_SUMMARY_LABEL}</Muted>
        <Body style={{ fontSize: 14 }}>{summary}</Body>
      </View>
      <Button
        label="Change"
        accessibilityLabel={`Change why you're taking this course, now ${summary}`}
        variant="link"
        fullWidth={false}
        onPress={onChange}
      />
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
  sheetTitle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 19 },
  levelLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  goalCard: {
    gap: spacing.sm,
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.card,
  },
  goalCardTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15, flex: 1 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
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

import React, { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, PanResponder, StyleSheet, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Body, Button, H3, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import {
  cardAnnouncement,
  claimsPan,
  clampCard,
  swipeDirection,
  type TeachCards as TeachCardsData,
  type TeachState,
} from "@/lib/lessonExperience";

// REQ-106 (research #14, #13): the Teach step as short cards, one at a time,
// with Back / Next buttons, a sideways swipe, and progress dots. The card
// number is visible text ("2 of 4") and is announced to screen readers on
// every move; the dots are decorative. Nothing has a fixed height, so the
// cards reflow with large text. The worked-example card carries one
// self-explanation question: free text, skippable, never graded, never
// mastery evidence; a short model explanation shows after the learner
// answers or skips.
export function TeachCards({
  data,
  state,
  onChange,
  onCardChange,
  footer,
}: {
  data: TeachCardsData;
  state: TeachState;
  onChange: (next: TeachState) => void;
  // Called after a move (not on first render), e.g. to scroll the card's top into view.
  onCardChange?: (index: number) => void;
  // Shown under the last card: the way on to practice.
  footer: React.ReactNode;
}) {
  const count = data.cards.length;
  const index = clampCard(state.card, count);
  const card = data.cards[index];
  const isLast = index === count - 1;

  const stateRef = useRef(state);
  stateRef.current = state;
  const go = (to: number) => {
    const next = clampCard(to, count);
    if (next !== clampCard(stateRef.current.card, count)) onChange({ ...stateRef.current, card: next });
  };
  const goRef = useRef(go);
  goRef.current = go;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => claimsPan(g.dx, g.dy),
        onPanResponderRelease: (_e, g) => {
          const dir = swipeDirection(g.dx, g.dy);
          if (dir) goRef.current(clampCard(stateRef.current.card, count) + dir);
        },
      }),
    [count]
  );

  // Announce each move, not the first render (the screen reader reads the
  // visible heading itself when the step opens).
  const shown = useRef(index);
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    AccessibilityInfo.announceForAccessibility(cardAnnouncement(index, count, card.title));
    onCardChange?.(index);
  }, [index, count, card.title, onCardChange]);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.progressRow}>
        <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {data.cards.map((c, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive, i < index && styles.dotPast]} />
          ))}
        </View>
        <Muted style={{ fontSize: 12 }}>
          {index + 1} of {count}
        </Muted>
      </View>

      <View {...pan.panHandlers} style={styles.card}>
        <View accessible accessibilityRole="header" accessibilityLabel={cardAnnouncement(index, count, card.title)}>
          <H3>{card.title}</H3>
        </View>
        {card.body ? <Body>{card.body}</Body> : null}
        {card.kind === "example" && card.steps?.length ? (
          <View style={{ gap: 6 }}>
            {card.steps.map((s, i) => (
              <View key={i} style={styles.stepRow} accessible accessibilityLabel={`Step ${i + 1}. ${s}`}>
                <View style={[styles.stepNum, data.selfExplain?.step === i + 1 && styles.stepNumAsked]}>
                  <Body style={styles.stepNumText}>{i + 1}</Body>
                </View>
                <Body style={{ flex: 1 }}>{s}</Body>
              </View>
            ))}
          </View>
        ) : null}
        {card.kind === "example" && data.selfExplain ? (
          <SelfExplain prompt={data.selfExplain} state={state} onChange={onChange} />
        ) : null}
      </View>

      <View style={styles.navRow}>
        <Button
          label="Back"
          icon="arrow-left"
          variant="ghost"
          size="sm"
          fullWidth={false}
          disabled={index === 0}
          accessibilityLabel={index === 0 ? "Back (this is the first card)" : `Back to card ${index}`}
          onPress={() => go(index - 1)}
        />
        {!isLast ? (
          <Button
            label="Next card"
            icon="arrow-right"
            size="sm"
            fullWidth={false}
            accessibilityLabel={`Next card, ${index + 2} of ${count}: ${data.cards[index + 1].title}`}
            onPress={() => go(index + 1)}
          />
        ) : null}
      </View>
      {isLast ? footer : null}
    </View>
  );
}

function SelfExplain({
  prompt,
  state,
  onChange,
}: {
  prompt: NonNullable<TeachCardsData["selfExplain"]>;
  state: TeachState;
  onChange: (next: TeachState) => void;
}) {
  const answered = state.explainDone && state.explain.trim().length > 0;
  return (
    <View style={styles.explainBox}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name="help-circle" size={16} color={colors.accent} />
        <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>Explain it to yourself</Muted>
      </View>
      <Body>{prompt.question}</Body>
      {!state.explainDone ? (
        <>
          <TextInput
            multiline
            accessibilityLabel={`Your explanation. ${prompt.question}`}
            accessibilityHint="Optional. Not graded."
            placeholder="A sentence or two, in your own words"
            placeholderTextColor={colors.mutedDim}
            value={state.explain}
            onChangeText={(t) => onChange({ ...state, explain: t.slice(0, 2000) })}
            style={styles.input}
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button
              label="Compare with an explanation"
              size="sm"
              fullWidth={false}
              icon="check"
              disabled={!state.explain.trim()}
              onPress={() => onChange({ ...state, explainDone: true })}
            />
            <Button label="Skip" size="sm" variant="ghost" fullWidth={false} onPress={() => onChange({ ...state, explainDone: true })} />
          </View>
          <Muted style={{ fontSize: 12 }}>Optional and not graded. Putting the reason in your own words helps it stick.</Muted>
        </>
      ) : (
        <View style={{ gap: 4 }}>
          {answered ? (
            <>
              <Muted style={{ fontSize: 12 }}>You wrote</Muted>
              <Body>{state.explain}</Body>
            </>
          ) : null}
          <Muted style={{ fontSize: 12 }}>One way to put it</Muted>
          <Body>{prompt.modelExplanation}</Body>
          <Muted style={{ fontSize: 12 }}>
            {answered ? "Not graded -- compare the reasoning, not the wording." : "Skipped -- that's fine."}
          </Muted>
          <Button
            label="Try it again"
            variant="link"
            size="sm"
            fullWidth={false}
            onPress={() => onChange({ ...state, explainDone: false })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dots: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotPast: { backgroundColor: colors.good },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.cardAlt,
  },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepNum: {
    minWidth: 24,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  stepNumAsked: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  stepNumText: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  explainBox: { gap: 6, backgroundColor: colors.accentDim, borderRadius: radius.md, padding: spacing.sm, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.card,
    minHeight: 60,
    textAlignVertical: "top",
  },
  navRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
});

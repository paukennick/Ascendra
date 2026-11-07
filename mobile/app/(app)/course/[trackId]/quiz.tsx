import React, { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { friendlyError } from "@/lib/errorMessage";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "@/api/client";
import { ReportProblem } from "@/components/ReportProblem";
import type { QuizTurn } from "@/types/plan";
import { Body, Button, Card, EmptyState, ErrorBanner, H1, H2, Loading, Muted, Screen } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { quizTriesLine } from "@/lib/studyPlan";

// REQ-110 (research #8): "Quiz me on my weak spots". The coach picks one of
// the learner's weakest objectives and asks; a miss earns a hint and another
// try (Socratic: the answer is shown only after the last try). This is
// coached practice: it is saved to the learner's history but never counts as
// unassisted evidence toward mastery.

const LETTERS = ["A", "B", "C", "D"];

export default function QuizScreen() {
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const router = useRouter();
  const [turn, setTurn] = useState<QuizTurn | null>(null);
  const [empty, setEmpty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  // One id per try, reused if that same try is resent after a network failure.
  const pending = useRef<{ key: string; id: string } | null>(null);
  // REQ-113 (Audit 3 mobile L5): two quick taps on different options used to
  // both pass the `busy` state check and use up two tries. A ref is set at once.
  const inFlight = useRef(false);

  const next = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    setPicked([]);
    try {
      const res = await api.post<{ turn: QuizTurn | null; reason?: string }>("/api/coach/quiz", { trackId });
      setTurn(res.turn);
      setEmpty(!res.turn);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      if (!turn) next();
    }, [next, turn])
  );

  async function answer(i: number) {
    if (!turn || inFlight.current || turn.status !== "open") return;
    inFlight.current = true;
    const key = `${turn.id}:${turn.tries}:${i}`;
    if (pending.current?.key !== key) pending.current = { key, id: Crypto.randomUUID() };
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ turn: QuizTurn; correct?: boolean; message?: string }>("/api/coach/quiz/answer", {
        turnId: turn.id,
        choice: i,
        clientAttemptId: pending.current.id,
      });
      pending.current = null;
      setTurn(res.turn);
      if (res.message) setMessage(res.message);
      if (res.correct === false) setPicked((p) => [...p, i]);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const closed = turn && turn.status !== "open";
  return (
    <Screen>
      <H1>Quiz me</H1>
      <Muted>{trackTitle ? `${trackTitle} · ` : ""}Practice on your weak spots, with hints. It doesn't count against your mastery.</Muted>
      {error ? <ErrorBanner message={error} onRetry={!turn && !empty ? next : undefined} /> : null}
      {busy && !turn && !empty ? <Loading label="Picking a question..." /> : null}

      {empty ? (
        <Card>
          <EmptyState
            icon="target"
            title="No weak spots to quiz yet"
            message="Answer a few lesson questions first. Once there's something to strengthen, the coach will quiz you on it."
          />
          <Button label="Back to the course" variant="ghost" onPress={() => router.back()} />
        </Card>
      ) : null}

      {turn ? (
        <Card>
          <Muted style={{ fontSize: 13 }}>On: {turn.objectiveTitle}</Muted>
          <H2>{turn.question}</H2>
          <View style={{ gap: spacing.sm }}>
            {turn.choices.map((c, i) => {
              const isRight = closed && turn.correctIndex === i;
              const tried = picked.includes(i);
              return (
                <Pressable
                  key={`${turn.id}-${i}`}
                  onPress={() => answer(i)}
                  disabled={busy || !!closed || tried}
                  accessibilityRole="button"
                  accessibilityLabel={`Option ${LETTERS[i]}: ${c}${isRight ? ", correct answer" : tried ? ", already tried" : ""}`}
                  accessibilityState={{ disabled: busy || !!closed || tried }}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.sm,
                      padding: spacing.md,
                      minHeight: 48,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: isRight ? colors.good : colors.border,
                      backgroundColor: isRight ? colors.goodDim : colors.cardAlt,
                      opacity: tried && !isRight ? 0.55 : 1,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Muted style={{ color: colors.accentHover, fontFamily: fonts.bodyBold }}>{LETTERS[i]}</Muted>
                  <Body style={{ flex: 1 }}>{c}</Body>
                  {isRight ? <Feather name="check" size={16} color={colors.good} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Muted>{quizTriesLine(turn)}</Muted>
          {message ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}
            >
              <Body>{message}</Body>
            </View>
          ) : turn.hints.length ? (
            <View style={{ gap: 4 }}>
              {turn.hints.map((h) => (
                <Muted key={h}>Hint: {h}</Muted>
              ))}
            </View>
          ) : null}
          {closed ? <ReportProblem target={{ kind: "quiz", turnId: turn.id }} /> : null}
          {closed ? <Button label="Next question" icon="arrow-right" loading={busy} onPress={next} /> : null}
          <Button
            label="Ask the coach about this"
            variant="link"
            onPress={() => router.push({ pathname: `/course/${trackId}/chat`, params: { trackTitle, unitId: turn.unitId } })}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

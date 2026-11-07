import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { api } from "@/api/client";
import { ReportProblem } from "@/components/ReportProblem";
import type { ReviewAnswerResult, ReviewSession, ReviewSessionItem } from "@/types";
import { Body, Button, Card, EmptyState, ErrorBanner, H2, Loading, Muted, Screen, VerdictBadge } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import {
  nextOpen,
  nextReviewLabel,
  progressLabel,
  sessionDoneLabel,
  utcToday,
  verdictHeadline,
} from "@/lib/reviewSession";

// REQ-108: Today's review, one question at a time. Each question is new
// (written for the objective, not the lesson's own Guided/Solo item) and is
// graded on the server; the key arrives only with the verdict. Answer in your
// own words first; "Show choices" is a hint the server records, so a typed
// answer after it does not count as recall. "Stop for today" is on every
// screen: what is left stays due, nothing is lost.
export default function ReviewSessionScreen() {
  const router = useRouter();
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [unavailable, setUnavailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-question state, reset when the question changes.
  const [answer, setAnswer] = useState("");
  const [choices, setChoices] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<ReviewAnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptId = useRef<{ position: number; id: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .post<{ session: ReviewSession | null; unavailable: number }>("/api/review/sessions", trackId ? { trackId } : {})
      .then((res) => {
        if (cancelled) return;
        if (!res.session) setEmpty(true);
        setSession(res.session);
        setUnavailable(res.unavailable ?? 0);
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const current: ReviewSessionItem | null = session ? nextOpen(session.items) : null;
  // While a result is on screen the answered item is still "current" for display.
  const [shown, setShown] = useState<ReviewSessionItem | null>(null);
  const item = result ? shown : current;

  function resetQuestion() {
    setAnswer("");
    setChoices(null);
    setPicked(null);
    setResult(null);
    setShown(null);
    attemptId.current = null;
  }

  async function stop() {
    if (session) {
      // Best effort: the session closes at the end of the day anyway.
      await api.patch(`/api/review/sessions/${session.id}`, { action: "finish" }).catch(() => undefined);
    }
    router.back();
  }

  async function revealChoices() {
    if (!session || !item) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ choices: string[] }>(
        `/api/review/sessions/${session.id}/items/${item.position}/choices`,
        {}
      );
      setChoices(res.choices);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(format: "open" | "mc") {
    if (!session || !item) return;
    setBusy(true);
    setError(null);
    // One id per question: a resend after a dropped connection gets the
    // stored result instead of a second answer.
    if (!attemptId.current || attemptId.current.position !== item.position) {
      attemptId.current = { position: item.position, id: Crypto.randomUUID() };
    }
    try {
      const res = await api.post<ReviewAnswerResult>(
        `/api/review/sessions/${session.id}/items/${item.position}/answer`,
        {
          clientAttemptId: attemptId.current.id,
          format,
          ...(format === "mc" ? { chosenIndex: picked } : { answer }),
        }
      );
      setShown(item);
      setResult(res);
      setSession((s) =>
        s
          ? {
              ...s,
              answered: s.answered + 1,
              items: s.items.map((i) => (i.position === item.position ? { ...i, answered: true, verdict: res.verdict } : i)),
            }
          : s
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Today's review" }} />
        <Loading label="Preparing today's questions..." />
      </Screen>
    );
  }

  if (empty || !session) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Today's review" }} />
        {error ? <ErrorBanner message={error} /> : null}
        <Card>
          <EmptyState icon="check-circle" title="Nothing to review right now" message="Come back when something is due." />
        </Card>
        <Button label="Back to Review" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const finished = !item;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Today's review" }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
        <View accessibilityLiveRegion="polite" style={{ flex: 1 }}>
          <Muted>{finished ? "Done for today" : progressLabel(session.items, item)}</Muted>
        </View>
        {!finished ? <Button label="Stop for today" size="sm" variant="ghost" fullWidth={false} onPress={stop} /> : null}
      </View>
      {session.gentleStart && session.answered === 0 ? (
        <Muted>A shorter set today, starting with one you know well.</Muted>
      ) : null}
      {unavailable > 0 && session.answered === 0 ? (
        <Muted>{unavailable} couldn't be prepared just now; they'll be back next time.</Muted>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {finished ? (
        <Card elevated>
          <H2>Done for today</H2>
          <Body>{sessionDoneLabel(session.items)}</Body>
          <Button label="Back to Review" onPress={() => router.back()} />
        </Card>
      ) : (
        <Card elevated>
          <Muted numberOfLines={2}>
            {item!.unitTitle} · {item!.objectiveTitle}
          </Muted>
          <Body>{item!.question}</Body>

          {!result ? (
            choices ? (
              <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
                {choices.map((c, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setPicked(i)}
                    accessibilityRole="radio"
                    accessibilityLabel={c}
                    accessibilityState={{ selected: picked === i }}
                    style={[styles.choice, picked === i && styles.choiceActive]}
                  >
                    <Body style={{ flex: 1 }}>{c}</Body>
                  </Pressable>
                ))}
                <Button label="Check" icon="send" loading={busy} disabled={busy || picked == null} onPress={() => submit("mc")} />
                <Muted style={{ fontSize: 13 }}>
                  Picking from choices is recognition: it keeps this in your review, but only an answer in your own words
                  moves it to a longer gap.
                </Muted>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <TextInput
                  multiline
                  placeholder="Your answer, in your own words"
                  placeholderTextColor={colors.mutedDim}
                  accessibilityLabel="Your answer"
                  value={answer}
                  onChangeText={setAnswer}
                  style={styles.input}
                />
                <Button label="Check my answer" icon="send" loading={busy} disabled={busy || !answer.trim()} onPress={() => submit("open")} />
                <Button label="Show choices (hint)" variant="link" fullWidth={false} disabled={busy} onPress={revealChoices} />
              </View>
            )
          ) : (
            <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
              <VerdictBadge verdict={result.verdict} />
              <Body>{verdictHeadline(result.verdict, result.assisted)}</Body>
              {result.feedback ? <Body>{result.feedback}</Body> : null}
              {result.verdict !== "correct" && result.correctAnswer ? (
                <Muted>Answer: {result.correctAnswer}</Muted>
              ) : null}
              {result.why && result.verdict !== "correct" ? <Muted>{result.why}</Muted> : null}
              {result.terms.length ? <Muted>This question checked: {result.terms.join(", ")}</Muted> : null}
              <ReportProblem target={{ kind: "review", sessionId: session.id, position: item.position }} />
              {nextReviewLabel(result.nextDueOn, utcToday()) ? (
                <Muted>{nextReviewLabel(result.nextDueOn, utcToday())}</Muted>
              ) : null}
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <Button label={nextOpen(session.items) ? "Next" : "Finish"} icon="arrow-right" fullWidth={false} onPress={resetQuestion} />
                {nextOpen(session.items) ? (
                  <Button label="Stop for today" variant="ghost" fullWidth={false} onPress={stop} />
                ) : null}
              </View>
            </View>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.cardAlt,
    minHeight: 110,
    textAlignVertical: "top",
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 48,
    backgroundColor: colors.cardAlt,
  },
  choiceActive: { borderColor: colors.accent, borderWidth: 2 },
});

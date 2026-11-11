import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { friendlyError } from "@/lib/errorMessage";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import { ReportProblem } from "@/components/ReportProblem";
import { Body, Button, Card, EmptyState, ErrorBanner, H1, LiveAnnouncement, Loading, Muted, Screen, VERDICT_LABEL, VerdictBadge } from "@/components/ui";
import { ComparisonCard, MisconceptionNote } from "@/components/Understanding";
import { assistNote } from "@/lib/lessonFeedback";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import type { ComparisonSet, Diagnosis } from "@/lib/understanding";
import { COMPARE_EMPTY } from "@/lib/emptyStates";
import { useGoBack } from "@/lib/useGoBack";
import { courseHome } from "@/lib/goBack";

// REQ-111: comparison cards for look-alike concepts. A card shows 2-4
// concepts side by side on the dimensions that tell them apart; "Test
// yourself" then hides it and asks which concept fits a new scenario. The
// answer is graded on the server and counts as evidence. Reopening the card
// mid-question is allowed (it is recorded, and the answer then counts as
// practice), so the learner is never stuck.

interface Question {
  id: string;
  scenario: string;
  options: string[];
}

interface AnswerResult {
  verdict: "correct" | "incorrect";
  feedback: string;
  correctIndex: number;
  assistReason?: string | null;
  diagnosis?: Diagnosis | null;
}

export default function CompareScreen() {
  const { trackId, objectiveId } = useLocalSearchParams<{ trackId: string; objectiveId?: string }>();
  const [sets, setSets] = useState<ComparisonSet[] | null>(null);
  const [pending, setPending] = useState(false);
  // REQ-113 (Audit 3 mobile L4): the course's cards failed to generate (the
  // server tries again later). This used to say "No look-alike concepts were
  // found", which was not true.
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const goBack = useGoBack(courseHome(trackId));

  const load = useCallback(() => {
    const q = objectiveId ? `?objectiveId=${encodeURIComponent(objectiveId)}` : "";
    setError(null);
    api
      .get<{ pending: boolean; failed?: boolean; sets: ComparisonSet[] }>(`/api/courses/${trackId}/comparisons${q}`)
      .then((res) => {
        setSets(res.sets);
        setPending(res.pending);
        setFailed(!!res.failed);
      })
      .catch((err) => setError(friendlyError(err)));
  }, [trackId, objectiveId]);

  useEffect(() => {
    load();
  }, [load]);

  // The course's cards are being written for the first time: check back.
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(load, 8000);
    return () => clearTimeout(t);
  }, [pending, load]);

  return (
    <Screen>
        <H1>Compare look-alikes</H1>
        <Muted>
          Concepts that are easy to mix up, side by side. Mixing them up is normal — this is where they come apart.
        </Muted>
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        {sets === null && !error ? <Loading label="Loading comparisons..." /> : null}
        {sets && sets.length === 0 && pending ? (
          <Loading label="Preparing this course's comparisons for the first time..." />
        ) : null}
        {sets && sets.length === 0 && !pending && failed ? (
          <ErrorBanner
            message="Comparison cards for this course couldn't be prepared just now. It isn't anything you did; try again in a few minutes."
            onRetry={load}
          />
        ) : null}
        {sets && sets.length === 0 && !pending && !failed ? (
          <EmptyState
            icon="columns"
            title={COMPARE_EMPTY.title}
            message={COMPARE_EMPTY.message}
            action={{ label: COMPARE_EMPTY.action!.label, icon: "arrow-left", onPress: goBack }}
          />
        ) : null}
        {sets?.map((set) => (
          <Card key={set.id} elevated>
            {activeId === set.id ? (
              <Quiz set={set} onClose={() => { setActiveId(null); load(); }} />
            ) : (
              <>
                <ComparisonCard set={set} />
                {set.questionCount > 0 ? (
                  <Button label="Test yourself" icon="target" onPress={() => setActiveId(set.id)} />
                ) : null}
              </>
            )}
          </Card>
        ))}
    </Screen>
  );
}

function Quiz({ set, onClose }: { set: ComparisonSet; onClose: () => void }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [seen, setSeen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [peeking, setPeeking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptId = useRef<string | null>(null);

  const next = useCallback(() => {
    setBusy(true);
    setError(null);
    setResult(null);
    setPicked(null);
    setPeeking(false);
    attemptId.current = null;
    api
      .get<{ item: Question; seen: boolean }>(`/api/comparisons/${set.id}/question`)
      .then((res) => {
        setQuestion(res.item);
        setSeen(res.seen);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setBusy(false));
  }, [set.id]);

  useEffect(() => {
    next();
  }, [next]);

  async function peek() {
    if (!question) return;
    // Recorded before the card is shown again, so the server knows.
    try {
      await api.post(`/api/comparison-items/${question.id}/peek`);
      setPeeking(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit() {
    if (!question || picked === null) return;
    setBusy(true);
    setError(null);
    // One id per question: a resend after a dropped connection is replayed,
    // not counted twice.
    attemptId.current ??= Crypto.randomUUID();
    try {
      const res = await api.post<AnswerResult>(`/api/comparison-items/${question.id}/answer`, {
        chosenIndex: picked,
        clientAttemptId: attemptId.current,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (peeking) {
    return (
      <View style={{ gap: spacing.sm }}>
        <ComparisonCard set={set} />
        <Button label="Back to the question" icon="arrow-left" onPress={() => setPeeking(false)} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Muted style={{ fontFamily: fonts.bodyBold }}>Which one fits?</Muted>
      {error ? <ErrorBanner message={error} onRetry={!question ? next : undefined} /> : null}
      {!question && busy ? <Loading /> : null}
      {question ? (
        <>
          {seen ? <Muted>You've seen this one before, so it's practice — it won't change your level.</Muted> : null}
          <Body>{question.scenario}</Body>
          <View accessibilityRole="radiogroup" style={{ gap: spacing.xs }}>
            {question.options.map((opt, i) => {
              const isPicked = picked === i;
              const isRight = result && result.correctIndex === i;
              const isWrongPick = result && isPicked && !isRight;
              const border = isRight ? colors.good : isWrongPick ? colors.bad : isPicked ? colors.accent : colors.border;
              const mark = isRight ? "check-circle" : isWrongPick ? "x-circle" : isPicked ? "disc" : "circle";
              return (
                <Pressable
                  key={opt}
                  onPress={result ? undefined : () => setPicked(i)}
                  disabled={!!result}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isPicked, disabled: !!result }}
                  accessibilityLabel={`${opt}${isRight ? ", correct answer" : ""}${isWrongPick ? ", your answer" : ""}`}
                  style={{
                    borderWidth: 2,
                    borderColor: border,
                    borderRadius: radius.md,
                    backgroundColor: colors.cardAlt,
                    padding: spacing.sm,
                    minHeight: 48,
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Feather name={mark} size={18} color={border} />
                  <Body style={{ flex: 1 }}>{opt}</Body>
                </Pressable>
              );
            })}
          </View>
          <LiveAnnouncement message={result ? `${VERDICT_LABEL[result.verdict] ?? result.verdict}. ${result.feedback}` : null} />
          {!result ? (
            <>
              <Button label="Check" icon="check" loading={busy} disabled={picked === null || busy} onPress={submit} />
              <Button label="Look at the comparison again" variant="ghost" icon="eye" onPress={peek} />
            </>
          ) : (
            <>
              <VerdictBadge verdict={result.verdict} />
              <Body>{result.feedback}</Body>
              <MisconceptionNote diagnosis={result.diagnosis} />
              {assistNote(result.assistReason) ? <Muted style={{ fontSize: 12 }}>{assistNote(result.assistReason)}</Muted> : null}
              <ReportProblem target={{ kind: "comparison", itemId: question.id }} />
              <Button label="Another scenario" icon="refresh-cw" onPress={next} />
              <Button label="Back to the card" variant="ghost" icon="columns" onPress={onClose} />
            </>
          )}
        </>
      ) : null}
    </View>
  );
}

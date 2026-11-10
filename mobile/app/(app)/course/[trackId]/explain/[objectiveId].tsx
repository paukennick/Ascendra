import React, { useCallback, useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { friendlyError } from "@/lib/errorMessage";
import { useAnswerDraft } from "@/lib/useAnswerDraft";
import { Body, Button, Card, ErrorBanner, H1, Loading, Muted, Screen, VerdictBadge } from "@/components/ui";
import { MisconceptionNote, RefresherOffer } from "@/components/Understanding";
import { DictationHint } from "@/components/DictationHint";
import { lengthCounter, lengthProblem } from "@/lib/dictation";
import { colors, radius, spacing } from "@/lib/theme";
import {
  EXPLAIN_MIN_WORDS,
  explainAssistNote,
  explainBackLockedNote,
  rubricLines,
  wordCount,
  type Diagnosis,
  type ExplainRubric,
} from "@/lib/understanding";

// REQ-111 explain-it-back: once an objective is at Guided or above, the
// learner explains it to a beginner in their own words. Graded on the server
// against the lesson's teaching (correct, complete, key terms, no mix-ups),
// with feedback on the gaps. Optional: reached from the lesson's done card.

interface Info {
  eligible: boolean;
  status: string;
  question: string;
  last: { verdict: string; feedback: string | null; created_at: string } | null;
}

interface Result {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  rubric: ExplainRubric | null;
  diagnosis: Diagnosis | null;
  assistReason: string | null;
}

// The server's cap (app/api/objectives/[id]/explain-back MAX_ANSWER). Not a
// maxLength: REQ-197 keeps dictated text whole and holds the send instead.
const EXPLAIN_MAX_CHARS = 4000;

export default function ExplainBackScreen() {
  const { trackId, objectiveId, objectiveTitle } = useLocalSearchParams<{
    trackId: string;
    objectiveId: string;
    objectiveTitle?: string;
  }>();
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // REQ-113 (Audit 3 mobile M3): up to 4000 characters, kept on the device
  // until graded instead of only in memory.
  const draft = useAnswerDraft("explain", objectiveId ?? null);
  const answer = draft.text;
  const setAnswer = draft.setText;

  const load = useCallback(() => {
    setLoadError(null);
    api
      .get<Info>(`/api/objectives/${objectiveId}/explain-back`)
      .then(setInfo)
      .catch((err) => setLoadError(friendlyError(err)));
  }, [objectiveId]);

  useEffect(load, [load]);

  async function submit() {
    const text = answer.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    // The same text resent after a dropped connection keeps its id, so it is
    // replayed instead of graded twice; any edit is a new answer.
    const clientAttemptId = draft.idFor(text, () => Crypto.randomUUID());
    try {
      setResult(await api.post<Result>(`/api/objectives/${objectiveId}/explain-back`, { answer: text, clientAttemptId }));
    } catch (err) {
      setError(friendlyError(err, { kept: true }));
    } finally {
      setBusy(false);
    }
  }

  const words = wordCount(answer);
  return (
    <Screen>
      <H1>Explain it back</H1>
      {objectiveTitle ? <Muted style={{ color: colors.link }}>{objectiveTitle}</Muted> : null}
      {loadError ? <ErrorBanner message={loadError} onRetry={load} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!info && !loadError ? <Loading /> : null}
      {info && !info.eligible ? (
        <Card>
          <Body>{explainBackLockedNote(info.status)}</Body>
          <Button label="Back to the lesson" variant="ghost" icon="arrow-left" onPress={() => router.back()} />
        </Card>
      ) : null}
      {info?.eligible ? (
        <>
          <Card elevated>
            <Body>{info.question}</Body>
            <Muted>
              Write it the way you'd say it to a friend. Gaps are useful — the feedback points you straight at them.
            </Muted>
          </Card>
          {!result ? (
            <Card>
              <DictationHint />
              <TextInput
                multiline
                accessibilityLabel="Your explanation"
                placeholder="In my own words..."
                placeholderTextColor={colors.mutedDim}
                value={answer}
                onChangeText={setAnswer}
                style={{
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: radius.md,
                  padding: 12,
                  color: colors.text,
                  backgroundColor: colors.cardAlt,
                  minHeight: 140,
                  textAlignVertical: "top",
                  fontSize: 16,
                }}
              />
              {words > 0 && words < EXPLAIN_MIN_WORDS ? (
                <Muted>A few sentences is plenty — keep going.</Muted>
              ) : null}
              {lengthProblem(answer, EXPLAIN_MAX_CHARS) ? (
                <ErrorBanner message={lengthProblem(answer, EXPLAIN_MAX_CHARS)!} />
              ) : lengthCounter(answer, EXPLAIN_MAX_CHARS) ? (
                <Muted style={{ textAlign: "right" }}>{lengthCounter(answer, EXPLAIN_MAX_CHARS)}</Muted>
              ) : null}
              <Button
                label="Check my explanation"
                icon="send"
                loading={busy}
                disabled={busy || words < EXPLAIN_MIN_WORDS || answer.length > EXPLAIN_MAX_CHARS}
                onPress={submit}
              />
            </Card>
          ) : (
            <Card elevated style={{ gap: spacing.sm }}>
              <VerdictBadge verdict={result.verdict} />
              <Body>{result.feedback}</Body>
              {rubricLines(result.rubric).map((line) => (
                <View
                  key={line.label}
                  accessible
                  accessibilityLabel={`${line.met ? "Met" : "To work on"}: ${line.label}`}
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <Feather name={line.met ? "check-circle" : "circle"} size={16} color={line.met ? colors.good : colors.warn} />
                  <Body style={{ flex: 1 }}>{line.label}</Body>
                </View>
              ))}
              <MisconceptionNote diagnosis={result.diagnosis} />
              {explainAssistNote(result.assistReason) ? (
                <Muted style={{ fontSize: 12 }}>{explainAssistNote(result.assistReason)}</Muted>
              ) : null}
              <RefresherOffer objectiveId={objectiveId} verdict={result.verdict} />
              <Button
                label="Edit and try again"
                variant="ghost"
                icon="edit-3"
                onPress={() => setResult(null)}
              />
              <Button
                label="Back to the course"
                icon="arrow-left"
                onPress={() => {
                  // Graded and done with: the kept copy isn't needed any more.
                  draft.clear();
                  router.dismissTo(`/course/${trackId}`);
                }}
              />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}

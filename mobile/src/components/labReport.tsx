import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { api } from "@/api/client";
import { Body, Button, ErrorBanner, H3, Loading, Muted, VerdictBadge } from "@/components/ui";
import { Collapsible, NextStep } from "@/components/feedback";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { LAB_COUNTS_NOTE, LAB_SAFETY_NOTES, labReportReady } from "@/lib/lessonExperience";
import { gradeSubmitError, isMiss } from "@/lib/lessonFeedback";
import { useStoredDraft } from "@/lib/useStoredDraft";

// REQ-106 (research #7): the optional hands-on lab on a lesson's Done card,
// then a short report (up to three questions) graded by the free-response
// grader. The report is recorded but does not change the mastery level on
// this version -- the server keeps it out of mastery (lab_objective_id,
// migration 035) and the copy here says so. Answers are kept as a device
// draft until sent, so leaving the screen doesn't lose them.

interface LabReportResult {
  verdict: string;
  feedback: string;
  missedParts: string[];
  modelAnswer?: string | null;
  fixNext?: string | null;
}

export function LabCard({ objectiveId, userId }: { objectiveId: string; userId: string | null }) {
  const [lab, setLab] = useState<{ prompt: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<LabReportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per report sent; a resend after a failure reuses it so the server
  // returns the first grade instead of recording a second report.
  const [sent, setSent] = useState<{ id: string; signature: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ lab: { prompt: string } | null; report: LabReportResult | null }>(`/api/objectives/${objectiveId}/lab`)
      .then((res) => {
        if (cancelled) return;
        setLab(res.lab);
        setResult(res.report);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [objectiveId]);

  const draftKey = userId && lab ? `ascendra.labDraft.${userId}.${objectiveId}` : null;
  const draft = questions && answers.some((a) => a.trim()) ? JSON.stringify({ questions, answers }) : null;
  useStoredDraft(
    draftKey,
    draft,
    useCallback((payload: string | null) => {
      if (!payload) return;
      try {
        const d = JSON.parse(payload) as { questions?: unknown; answers?: unknown };
        if (Array.isArray(d.questions) && Array.isArray(d.answers) && d.questions.length === d.answers.length) {
          setQuestions(d.questions.map(String));
          setAnswers(d.answers.map(String));
          setResult(null);
        }
      } catch {
        // A malformed draft is ignored.
      }
    }, [])
  );

  if (!loaded || !lab) return null;

  async function startReport() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ questions: string[] }>(`/api/objectives/${objectiveId}/lab/questions`);
      setQuestions(res.questions);
      setAnswers(res.questions.map(() => ""));
      setResult(null);
    } catch (err) {
      setError(gradeSubmitError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!questions || !labReportReady(answers, questions.length)) return;
    setBusy(true);
    setError(null);
    const signature = JSON.stringify(answers);
    const id = sent && sent.signature === signature ? sent.id : Crypto.randomUUID();
    setSent({ id, signature });
    try {
      const res = await api.post<LabReportResult>(`/api/objectives/${objectiveId}/lab/report`, {
        clientAttemptId: id,
        answers,
      });
      setResult(res);
      setQuestions(null);
      setAnswers([]);
    } catch (err) {
      setError(gradeSubmitError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather name="terminal" size={18} color={colors.accent} />
        <H3>Optional hands-on lab</H3>
      </View>
      <Body>{lab.prompt}</Body>
      <View style={{ gap: 4 }} accessibilityRole="list">
        {LAB_SAFETY_NOTES.map((n) => (
          <View key={n} style={{ flexDirection: "row", gap: 6 }} accessible accessibilityLabel={`Safety: ${n}`}>
            <Feather name="shield" size={14} color={colors.warn} style={{ marginTop: 3 }} />
            <Muted style={{ flex: 1, fontSize: 13 }}>{n}</Muted>
          </View>
        ))}
      </View>
      <Muted style={{ fontSize: 12 }}>{LAB_COUNTS_NOTE}</Muted>

      {questions ? (
        <View style={{ gap: spacing.sm }}>
          <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold }}>Lab report</Muted>
          {questions.map((q, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Body>
                {i + 1}. {q}
              </Body>
              <TextInput
                multiline
                accessibilityLabel={`Answer ${i + 1} of ${questions.length}: ${q}`}
                placeholder="What you saw"
                placeholderTextColor={colors.mutedDim}
                value={answers[i] ?? ""}
                onChangeText={(t) => setAnswers((prev) => prev.map((a, j) => (j === i ? t.slice(0, 2000) : a)))}
                style={styles.input}
              />
            </View>
          ))}
          <Button
            label={error ? "Retry" : "Send my report"}
            icon={error ? "refresh-cw" : "send"}
            loading={busy}
            disabled={busy || !labReportReady(answers, questions.length)}
            onPress={submit}
          />
          <Button
            label="Not now"
            variant="ghost"
            onPress={() => {
              setQuestions(null);
              setAnswers([]);
              setError(null);
            }}
          />
        </View>
      ) : result ? (
        <View style={{ gap: 6 }}>
          <Muted style={{ fontSize: 12 }}>Your latest lab report</Muted>
          <VerdictBadge verdict={result.verdict} />
          <Body>{result.feedback}</Body>
          {result.missedParts?.length ? <Muted>Missed: {result.missedParts.join(", ")}</Muted> : null}
          {isMiss(result.verdict) && result.fixNext ? <NextStep text={result.fixNext} /> : null}
          {result.modelAnswer ? (
            <Collapsible label="Show a model report">
              <Body>{result.modelAnswer}</Body>
            </Collapsible>
          ) : null}
          <Muted style={{ fontSize: 12 }}>Saved. Lab reports don't change your mastery level yet.</Muted>
          <Button label="Write a new report" variant="ghost" icon="edit-3" loading={busy} onPress={startReport} />
        </View>
      ) : busy ? (
        <Loading label="Getting the report questions..." />
      ) : (
        <Button label="I did the lab -- write a short report" icon="clipboard" variant="ghost" onPress={startReport} />
      )}
      {error ? <ErrorBanner message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: "stretch",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.cardAlt,
    minHeight: 60,
    textAlignVertical: "top",
  },
});

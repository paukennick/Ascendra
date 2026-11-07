import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import { Body, Button, Card, Chip, ErrorBanner, H1, H2, Loading, Muted, Screen, SectionHeader, TextField } from "@/components/ui";
import { DateField } from "@/components/DatePicker";
import { Alert } from "@/lib/alert";
import { friendlyError } from "@/lib/errorMessage";
import { longDate } from "@/lib/datePicker";
import { localToday } from "@/lib/studyPlan";
import {
  outcomeDateError,
  outcomeResponse,
  parseScore,
  RESULT_LABELS,
  RESULT_SHORT,
  type ExamOutcome,
  type OutcomeResult,
} from "@/lib/examOutcome";
import { spacing } from "@/lib/theme";

// REQ-119 (Audit 3 product, "I took the exam"): record, change or delete how
// the real exam went. Optional in every part but the date and the choice
// (which includes "rather not say"). Answered kindly either way.
export default function ExamOutcomeScreen() {
  const { trackId, trackTitle, examDate: suggestedDate } = useLocalSearchParams<{
    trackId: string;
    trackTitle?: string;
    examDate?: string;
  }>();
  const [outcomes, setOutcomes] = useState<ExamOutcome[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // outcome id, or null for a new one
  const [date, setDate] = useState<string | null>(suggestedDate ?? null);
  const [result, setResult] = useState<OutcomeResult | null>(null);
  const [score, setScore] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    api
      .get<{ outcomes: ExamOutcome[] }>(`/api/exam-outcomes?trackId=${encodeURIComponent(trackId)}&today=${localToday()}`)
      .then((r) => setOutcomes(r.outcomes))
      .catch((err) => setLoadError(friendlyError(err)));
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function resetForm() {
    setEditing(null);
    setDate(null);
    setResult(null);
    setScore("");
    setFormError(null);
  }

  function startEdit(o: ExamOutcome) {
    setEditing(o.id);
    setDate(o.exam_date);
    setResult(o.result);
    setScore(o.score == null ? "" : String(o.score));
    setFormError(null);
    setResponse(null);
  }

  async function save() {
    setFormError(null);
    const today = localToday();
    const dateError = outcomeDateError(date, today);
    if (dateError) return setFormError(dateError);
    if (!result) return setFormError("Choose how it went (\"rather not say\" is fine).");
    const s = parseScore(score);
    if (!s.ok) return setFormError(s.error);
    setSaving(true);
    try {
      const body = { examDate: date, result, score: s.value, today };
      if (editing) await api.patch(`/api/exam-outcomes/${editing}`, body);
      else await api.post("/api/exam-outcomes", { ...body, trackId });
      setResponse(outcomeResponse(result));
      resetForm();
      load();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function remove(o: ExamOutcome) {
    Alert.alert("Delete this result?", "It's removed from your account and from our counts.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          api
            .delete(`/api/exam-outcomes/${o.id}`)
            .then(() => {
              if (editing === o.id) resetForm();
              load();
            })
            .catch((err) => setLoadError(friendlyError(err)));
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "I took the exam" }} />
      <H1>How did it go?</H1>
      <Muted>
        {trackTitle ? `${trackTitle}. ` : ""}This is just for you and for checking that our readiness estimate is honest.
        Only the date and the result are needed; you can change or delete it any time.
      </Muted>

      {response ? (
        <View accessibilityLiveRegion="polite">
          <Card elevated>
            <H2>{response.title}</H2>
            <Body>{response.message}</Body>
          </Card>
        </View>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <H2>{editing ? "Change this result" : "Add a result"}</H2>
        {formError ? <ErrorBanner message={formError} /> : null}
        <DateField label="The day you took it" value={date} onChange={setDate} />
        <View style={{ gap: spacing.xs }}>
          <Muted>How it went</Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {(Object.keys(RESULT_LABELS) as OutcomeResult[]).map((r) => (
              <Chip key={r} label={RESULT_LABELS[r]} active={result === r} onPress={() => setResult(r)} />
            ))}
          </View>
        </View>
        <TextField
          label="Score (optional)"
          value={score}
          onChangeText={setScore}
          placeholder="e.g. 750"
          keyboardType="decimal-pad"
          maxLength={10}
        />
        <Button label={editing ? "Save changes" : "Save"} icon="check" onPress={save} loading={saving} />
        {editing ? <Button label="Cancel" variant="ghost" onPress={resetForm} /> : null}
      </Card>

      <SectionHeader label="Your results" />
      {loadError ? <ErrorBanner message={loadError} onRetry={load} /> : null}
      {outcomes === null && !loadError ? <Loading /> : null}
      {outcomes && outcomes.length === 0 ? <Muted>Nothing recorded for this course yet.</Muted> : null}
      {outcomes?.map((o) => (
        <Card key={o.id}>
          <Body>
            {longDate(o.exam_date)} · {RESULT_SHORT[o.result]}
            {o.score != null ? ` · score ${o.score}` : ""}
          </Body>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <Button label="Change" size="sm" variant="ghost" icon="edit-2" fullWidth={false} onPress={() => startEdit(o)} />
            <Button label="Delete" size="sm" variant="ghost" icon="trash-2" fullWidth={false} onPress={() => remove(o)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { GradeResult, LessonContent } from "@/types";
import { Screen, Card, H1, H2, Body, Muted, Button, Loading, ErrorBanner, Badge } from "@/components/ui";
import { colors } from "@/lib/theme";

type Step = "guess" | "teach" | "fade" | "solo" | "done";

export default function LessonFlow() {
  const { trackId, objectiveId } = useLocalSearchParams<{ trackId: string; objectiveId: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("guess");
  const [guess, setGuess] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);

  const loadLesson = useCallback(() => {
    setError(null);
    setLesson(null);
    api
      .get<{ lesson: LessonContent }>(`/api/objectives/${objectiveId}/lesson`)
      .then((res) => setLesson(res.lesson))
      .catch((err) => setError(err.message));
  }, [objectiveId]);

  useEffect(() => {
    loadLesson();
    setStep("guess");
    setGuess("");
    setConfidence(null);
  }, [loadLesson]);

  if (error) return <Screen><ErrorBanner message={error} /></Screen>;
  if (!lesson) return <Screen><Loading label="Generating lesson (first visit only)..." /></Screen>;

  return (
    <Screen>
      <StepHeader step={step} />

      {step === "guess" && (
        <GuessStep
          prompt={lesson.guessPrompt}
          value={guess}
          onChange={setGuess}
          onSubmit={() => setStep("teach")}
        />
      )}

      {step === "teach" && (
        <Card>
          <H2>Teaching</H2>
          {guess ? (
            <>
              <Muted>Your guess</Muted>
              <Body>{guess}</Body>
            </>
          ) : null}
          <Muted>Explanation</Muted>
          <Body>{lesson.teach}</Body>
          <Button label="Next: guided practice" onPress={() => setStep("fade")} />
        </Card>
      )}

      {step === "fade" && (
        <CheckStep
          kind="fade"
          promptText={lesson.fadeProblem}
          choices={lesson.fadeChoices}
          correctIndex={lesson.fadeCorrectIndex}
          why={lesson.fadeWhy}
          taughtText={lesson.teach}
          objectiveId={objectiveId}
          trackId={trackId}
          confidence={confidence}
          setConfidence={setConfidence}
          onDone={() => setStep("solo")}
        />
      )}

      {step === "solo" && (
        <CheckStep
          kind="solo"
          promptText={lesson.soloCheck}
          choices={lesson.soloChoices}
          correctIndex={lesson.soloCorrectIndex}
          why={lesson.soloWhy}
          taughtText={lesson.teach}
          objectiveId={objectiveId}
          trackId={trackId}
          confidence={confidence}
          setConfidence={setConfidence}
          onDone={() => setStep("done")}
        />
      )}

      {step === "done" && (
        <Card>
          <H2>Objective complete</H2>
          <Muted>Head back to the course dashboard to pick the next objective, or revisit this one.</Muted>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Back to course" onPress={() => router.push(`/course/${trackId}`)} />
            <Button label="Regenerate lesson" variant="ghost" onPress={async () => {
              await api.post(`/api/objectives/${objectiveId}/lesson`);
              loadLesson();
              setStep("guess");
            }} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

function StepHeader({ step }: { step: Step }) {
  const labels: Record<Step, string> = {
    guess: "1. Guess",
    teach: "2. Teach",
    fade: "3. Guided practice",
    solo: "4. Solo check",
    done: "Done",
  };
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {(["guess", "teach", "fade", "solo"] as Step[]).map((s) => (
        <Badge key={s} label={labels[s]} color={s === step ? colors.accent : colors.border} />
      ))}
    </View>
  );
}

function GuessStep({
  prompt,
  value,
  onChange,
  onSubmit,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <H2>Before we teach this — take a guess</H2>
      <Body>{prompt}</Body>
      <TextInput
        multiline
        placeholder="Your guess (or leave blank if you don't know)"
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        style={styles.input}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Submit my guess" onPress={onSubmit} />
        <Button label="I don't know — just teach me" variant="ghost" onPress={onSubmit} />
      </View>
    </Card>
  );
}

// Handles both the "fade" (guided practice) and "solo" (independent) check steps. Each
// starts as multiple-choice; the lesson flow always offers MC here (proficiency-gated
// free-response happens on repeat visits once /api/objectives/:id/mastery says the
// learner has cleared the accuracy bar — kept simple here as MC-first for a first pass).
function CheckStep({
  kind,
  promptText,
  choices,
  correctIndex,
  why,
  taughtText,
  objectiveId,
  trackId,
  confidence,
  setConfidence,
  onDone,
}: {
  kind: "fade" | "solo";
  promptText: string;
  choices: string[];
  correctIndex: number;
  why: string;
  taughtText: string;
  objectiveId: string;
  trackId: string;
  confidence: number | null;
  setConfidence: (n: number) => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"mc" | "open">("mc");
  const [picked, setPicked] = useState<number | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [result, setResult] = useState<{ verdict: string; feedback: string; missedParts?: string[] } | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitMC() {
    if (picked == null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<GradeResult>("/api/grade", {
        format: "mc",
        kind: "lesson",
        stage: kind,
        objectiveId,
        unitId: undefined,
        question: promptText,
        chosenIndex: picked,
        correctIndex,
        chosenText: choices[picked],
        why,
        confidence,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOpen() {
    if (!openAnswer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<GradeResult>("/api/grade", {
        format: "open",
        kind: "lesson",
        stage: kind,
        objectiveId,
        question: promptText,
        answer: openAnswer,
        taughtText,
        confidence,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendFollowUp() {
    if (!followUp.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/chat`, { trackId, message: `Follow-up on graded answer: ${followUp}` });
      setFollowUp("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>{kind === "fade" ? "Guided practice" : "Solo check"}</H2>
      <Body>{promptText}</Body>

      {!result && (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Multiple choice" variant={mode === "mc" ? "primary" : "ghost"} onPress={() => setMode("mc")} />
            <Button label="Free response" variant={mode === "open" ? "primary" : "ghost"} onPress={() => setMode("open")} />
          </View>

          {mode === "mc" ? (
            <View style={{ gap: 8 }}>
              {choices.map((c, i) => (
                <Pressable
                  key={i}
                  onPress={() => setPicked(i)}
                  style={[styles.choice, picked === i && { borderColor: colors.accent }]}
                >
                  <Body>{c}</Body>
                </Pressable>
              ))}
              <Button label="Submit" onPress={submitMC} disabled={busy || picked == null} />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TextInput
                multiline
                placeholder="Your answer"
                placeholderTextColor={colors.muted}
                value={openAnswer}
                onChangeText={setOpenAnswer}
                style={styles.input}
              />
              <Button label="Submit" onPress={submitOpen} disabled={busy || !openAnswer.trim()} />
            </View>
          )}

          <Muted>How confident are you?</Muted>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {["1 — guessing", "2", "3 — unsure", "4", "5 — certain"].map((label, idx) => (
              <Pressable
                key={label}
                onPress={() => setConfidence(idx + 1)}
                style={[styles.confidence, confidence === idx + 1 && { borderColor: colors.accent }]}
              >
                <Body>{idx + 1}</Body>
              </Pressable>
            ))}
          </View>

          {error ? <ErrorBanner message={error} /> : null}
        </>
      )}

      {result && (
        <View style={{ gap: 8 }}>
          <Badge
            label={result.verdict}
            color={result.verdict === "correct" ? colors.good : result.verdict === "partial" ? colors.warn : colors.bad}
          />
          <Body>{result.feedback}</Body>
          {result.missedParts && result.missedParts.length > 0 ? (
            <Muted>Missed: {result.missedParts.join(", ")}</Muted>
          ) : null}

          <Muted>Send follow-up (dispute or ask about this verdict)</Muted>
          <TextInput
            placeholder="e.g. I think my answer covered that — here's why..."
            placeholderTextColor={colors.muted}
            value={followUp}
            onChangeText={setFollowUp}
            style={styles.input}
          />
          <Button label="Send follow-up" variant="ghost" onPress={sendFollowUp} disabled={busy} />

          <Button label="Continue" onPress={onDone} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: "top",
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
  },
  confidence: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});

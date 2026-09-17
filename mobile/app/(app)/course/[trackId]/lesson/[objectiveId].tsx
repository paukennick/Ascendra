import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { GradeResult, LessonContent } from "@/types";
import {
  Body,
  Button,
  Card,
  ErrorBanner,
  H2,
  Loading,
  Muted,
  Screen,
  VerdictBadge,
} from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";

type Step = "guess" | "teach" | "fade" | "solo" | "done";
const STEPS: Step[] = ["guess", "teach", "fade", "solo"];

export default function LessonFlow() {
  const { trackId, objectiveId, unitId, objectiveTitle } = useLocalSearchParams<{
    trackId: string;
    objectiveId: string;
    unitId?: string;
    objectiveTitle?: string;
  }>();
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

  const headerTitle = objectiveTitle ?? "Lesson";

  if (error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: headerTitle }} />
        <ErrorBanner message={error} />
      </Screen>
    );
  }
  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: headerTitle }} />
        <Loading label="Generating lesson (first visit only)..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
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
        <Card elevated>
          <View style={styles.cardHeadingRow}>
            <Feather name="book-open" size={18} color={colors.accent} />
            <H2>Teaching</H2>
          </View>
          {guess ? (
            <>
              <Muted>Your guess</Muted>
              <Body>{guess}</Body>
            </>
          ) : null}
          <Muted>Explanation</Muted>
          <Body>{lesson.teach}</Body>
          <Button label="Next: guided practice" icon="arrow-right" onPress={() => setStep("fade")} />
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
          unitId={unitId}
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
          unitId={unitId}
          trackId={trackId}
          confidence={confidence}
          setConfidence={setConfidence}
          onDone={() => setStep("done")}
        />
      )}

      {step === "done" && (
        <Card elevated style={{ alignItems: "center", gap: spacing.sm }}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={28} color={colors.good} />
          </View>
          <H2>Objective complete</H2>
          <Muted style={{ textAlign: "center" }}>
            Head back to the course dashboard to pick the next objective, or revisit this one.
          </Muted>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Back to course" icon="arrow-left" fullWidth={false} onPress={() => router.push(`/course/${trackId}`)} />
            <Button
              label="Regenerate lesson"
              variant="ghost"
              fullWidth={false}
              icon="refresh-cw"
              onPress={async () => {
                await api.post(`/api/objectives/${objectiveId}/lesson`);
                loadLesson();
                setStep("guess");
              }}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const STEP_META: Record<Step, { label: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  guess: { label: "Guess", icon: "help-circle" },
  teach: { label: "Teach", icon: "book-open" },
  fade: { label: "Guided", icon: "compass" },
  solo: { label: "Solo", icon: "check-circle" },
  done: { label: "Done", icon: "flag" },
};

function StepHeader({ step }: { step: Step }) {
  const activeIndex = STEPS.indexOf(step);
  return (
    <View style={styles.stepper}>
      {STEPS.map((s, i) => {
        const meta = STEP_META[s];
        const isActive = s === step;
        const isPast = activeIndex > i;
        const color = isActive ? colors.accent : isPast ? colors.good : colors.mutedDim;
        return (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  { borderColor: color, backgroundColor: isActive || isPast ? color : "transparent" },
                ]}
              >
                <Feather name={isPast ? "check" : meta.icon} size={13} color={isActive || isPast ? colors.accentText : color} />
              </View>
              <Muted style={{ color, fontSize: 11 }}>{meta.label}</Muted>
            </View>
            {i < STEPS.length - 1 ? (
              <View style={[styles.stepLine, { backgroundColor: isPast ? colors.good : colors.border }]} />
            ) : null}
          </React.Fragment>
        );
      })}
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
    <Card elevated>
      <View style={styles.cardHeadingRow}>
        <Feather name="help-circle" size={18} color={colors.accent} />
        <H2>Before we teach this — take a guess</H2>
      </View>
      <Body>{prompt}</Body>
      <TextInput
        multiline
        placeholder="Your guess (or leave blank if you don't know)"
        placeholderTextColor={colors.mutedDim}
        value={value}
        onChangeText={onChange}
        style={styles.input}
      />
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label="Submit my guess" fullWidth={false} icon="send" onPress={onSubmit} />
        <Button label="I don't know — just teach me" variant="ghost" fullWidth={false} onPress={onSubmit} />
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
  unitId,
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
  unitId?: string;
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
        unitId,
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
        unitId,
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
    <Card elevated>
      <View style={styles.cardHeadingRow}>
        <Feather name={kind === "fade" ? "compass" : "check-circle"} size={18} color={colors.accent} />
        <H2>{kind === "fade" ? "Guided practice" : "Solo check"}</H2>
      </View>
      <Body>{promptText}</Body>

      {!result && (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Multiple choice" size="sm" fullWidth={false} variant={mode === "mc" ? "primary" : "ghost"} onPress={() => setMode("mc")} />
            <Button label="Free response" size="sm" fullWidth={false} variant={mode === "open" ? "primary" : "ghost"} onPress={() => setMode("open")} />
          </View>

          {mode === "mc" ? (
            <View style={{ gap: 8 }}>
              {choices.map((c, i) => (
                <Pressable
                  key={i}
                  onPress={() => setPicked(i)}
                  style={[styles.choice, picked === i && styles.choiceActive]}
                >
                  <View style={[styles.radio, picked === i && styles.radioActive]}>
                    {picked === i ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Body style={{ flex: 1 }}>{c}</Body>
                </Pressable>
              ))}
              <Button label="Submit" icon="send" onPress={submitMC} disabled={busy || picked == null} />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TextInput
                multiline
                placeholder="Your answer"
                placeholderTextColor={colors.mutedDim}
                value={openAnswer}
                onChangeText={setOpenAnswer}
                style={styles.input}
              />
              <Button label="Submit" icon="send" onPress={submitOpen} disabled={busy || !openAnswer.trim()} />
            </View>
          )}

          <Muted>How confident are you?</Muted>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {["1", "2", "3", "4", "5"].map((label, idx) => (
              <Pressable
                key={label}
                onPress={() => setConfidence(idx + 1)}
                style={[styles.confidence, confidence === idx + 1 && styles.confidenceActive]}
              >
                <Body style={confidence === idx + 1 ? { color: colors.accentText, fontFamily: fonts.bodyBold } : undefined}>{label}</Body>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted style={{ fontSize: 11 }}>guessing</Muted>
            <Muted style={{ fontSize: 11 }}>certain</Muted>
          </View>

          {error ? <ErrorBanner message={error} /> : null}
        </>
      )}

      {result && (
        <View style={{ gap: 8 }}>
          <VerdictBadge verdict={result.verdict} />
          <Body>{result.feedback}</Body>
          {result.missedParts && result.missedParts.length > 0 ? (
            <Muted>Missed: {result.missedParts.join(", ")}</Muted>
          ) : null}

          <Muted>Send follow-up (dispute or ask about this verdict)</Muted>
          <TextInput
            placeholder="e.g. I think my answer covered that — here's why..."
            placeholderTextColor={colors.mutedDim}
            value={followUp}
            onChangeText={setFollowUp}
            style={styles.input}
          />
          <Button label="Send follow-up" variant="ghost" icon="corner-up-right" onPress={sendFollowUp} disabled={busy} />

          <Button label="Continue" icon="arrow-right" onPress={onDone} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepper: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  stepItem: { alignItems: "center", gap: 4, width: 56 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: { flex: 1, height: 2, marginTop: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.cardAlt,
    minHeight: 70,
    textAlignVertical: "top",
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.mutedDim,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  confidence: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
  },
  confidenceActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goodDim,
    alignItems: "center",
    justifyContent: "center",
  },
});

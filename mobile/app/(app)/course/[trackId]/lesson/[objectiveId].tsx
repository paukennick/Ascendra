import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { GradeResult, LessonContent, MasteryStatus, NextObjective } from "@/types";
import {
  Badge,
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
import { colors, fonts, masteryColor, masteryIcon, radius, spacing } from "@/lib/theme";

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
  // Feedback on the guess itself, generated once it's submitted (never for
  // "I don't know -- just teach me", since there's nothing to compare then).
  // Fetched in the background after moving to "teach" rather than blocking
  // the guess screen on it -- submitting a guess was instant before this,
  // and staring at a spinner there to wait on an Anthropic call would be a
  // felt regression. See guessFeedbackPrompt in backend/lib/prompts.ts for
  // why this deliberately never touches attempts/mastery.
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [guessFeedbackLoading, setGuessFeedbackLoading] = useState(false);
  // True once guess+teach have come back but fade/solo are still generating
  // in the background (server returns them early instead of blocking on the
  // full ~20s generation). Gates the move into the fade step below.
  const [practicePending, setPracticePending] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  // REQ-074: the objective after this one in course order, from the same
  // prefetch call that warms its cache -- drives "Next objective" on the
  // done screen so finishing a lesson doesn't dead-end on the dashboard.
  const [next, setNext] = useState<NextObjective | null>(null);
  // Mastery status reached, fetched once the learner lands on "done" so the
  // screen can say what the work just earned and how to go further.
  const [reached, setReached] = useState<MasteryStatus | null>(null);

  const loadLesson = useCallback(() => {
    setError(null);
    setLesson(null);
    api
      .get<{ lesson: LessonContent; practicePending?: boolean }>(`/api/objectives/${objectiveId}/lesson`)
      .then((res) => {
        setLesson(res.lesson);
        setPracticePending(!!res.practicePending);
      })
      .catch((err) => setError(err.message));
  }, [objectiveId]);

  useEffect(() => {
    loadLesson();
    setStep("guess");
    setGuess("");
    setConfidence(null);
    setGuessFeedback(null);
    setGuessFeedbackLoading(false);
    setNext(null);
    setReached(null);
  }, [loadLesson]);

  useEffect(() => {
    // Fire-and-forget: nudges the server to start warming the cache for
    // whatever objective comes next in course order, as early as possible --
    // the learner spends real time on guess/teach/fade/solo here first, which
    // is normally more than enough head start for it to finish invisibly.
    // Errors are swallowed on purpose; this is a pure optimization with no
    // effect on the current objective if it fails or the next one doesn't
    // exist.
    api
      .post<{ next: NextObjective | null }>(`/api/objectives/${objectiveId}/lesson/prefetch-next`)
      .then((res) => setNext(res.next ?? null))
      .catch(() => {});
  }, [objectiveId]);

  useEffect(() => {
    if (step !== "done") return;
    api
      .get<{ mastery: { status: MasteryStatus } }>(`/api/objectives/${objectiveId}/mastery`)
      .then((res) => setReached(res.mastery.status))
      .catch(() => setReached(null));
  }, [step, objectiveId]);

  // Called right before advancing past "teach". Usually a no-op: the learner
  // spends real time reading guess+teach, which is normally longer than
  // whatever's left of the fade/solo generation. If it isn't ready yet, this
  // re-fetches and the server awaits its own in-flight generation before
  // responding, so it resolves once fade/solo actually exist rather than
  // polling.
  async function ensurePracticeReady() {
    if (!practicePending) return true;
    setPracticeLoading(true);
    try {
      const res = await api.get<{ lesson: LessonContent; practicePending?: boolean }>(
        `/api/objectives/${objectiveId}/lesson`
      );
      setLesson(res.lesson);
      setPracticePending(!!res.practicePending);
      return !res.practicePending;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setPracticeLoading(false);
    }
  }

  // Moves to "teach" immediately either way -- getting to the explanation
  // was instant before this feature existed, and it stays instant. A
  // non-blank guess kicks off feedback in the background; it fills into its
  // slot on the teach screen once ready instead of being waited on here.
  function submitGuess() {
    setStep("teach");
    if (!guess.trim()) return;
    setGuessFeedbackLoading(true);
    api
      .post<{ feedback: string }>(`/api/objectives/${objectiveId}/guess-feedback`, { guess: guess.trim() })
      .then((res) => setGuessFeedback(res.feedback))
      // Silent on purpose: this is a nice-to-have on top of the lesson, not
      // something that should surface an error banner over the real content.
      .catch(() => {})
      .finally(() => setGuessFeedbackLoading(false));
  }

  function skipGuess() {
    setStep("teach");
  }

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
          onSubmit={submitGuess}
          onSkip={skipGuess}
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
              {guessFeedbackLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Muted style={{ fontSize: 12 }}>Comparing your guess to what's true...</Muted>
                </View>
              ) : guessFeedback ? (
                <View style={styles.guessFeedback}>
                  <View style={styles.cardHeadingRow}>
                    <Feather name="message-circle" size={14} color={colors.accent} />
                    <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                      On your guess
                    </Muted>
                  </View>
                  <Body style={{ fontSize: 14 }}>{guessFeedback}</Body>
                </View>
              ) : null}
            </>
          ) : null}
          <Muted>Explanation</Muted>
          <Body>{lesson.teach}</Body>
          <Button
            label="Next: guided practice"
            icon="arrow-right"
            loading={practiceLoading}
            onPress={async () => {
              const ready = await ensurePracticeReady();
              if (ready) setStep("fade");
            }}
          />
          <Button
            label="Ask the coach about this"
            variant="link"
            icon="message-circle"
            onPress={() =>
              router.push({
                pathname: `/course/${trackId}/chat`,
                params: { unitId, prefill: `About "${headerTitle}": ` },
              })
            }
          />
        </Card>
      )}

      {step === "fade" && (
        <CheckStep
          kind="fade"
          // Reaching this step is gated on ensurePracticeReady() resolving
          // practicePending to false, so these are guaranteed populated.
          promptText={lesson.fadeProblem!}
          choices={lesson.fadeChoices!}
          correctIndex={lesson.fadeCorrectIndex!}
          why={lesson.fadeWhy!}
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
          // Populated alongside fadeProblem above -- reaching solo means fade
          // already resolved, so these came from the same generation.
          promptText={lesson.soloCheck!}
          choices={lesson.soloChoices!}
          correctIndex={lesson.soloCorrectIndex!}
          why={lesson.soloWhy!}
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
          {reached ? (
            <Badge
              label={reached}
              color={masteryColor[reached] ?? colors.mutedDim}
              icon={(masteryIcon[reached] ?? "circle") as React.ComponentProps<typeof Feather>["name"]}
            />
          ) : null}
          <Muted style={{ textAlign: "center" }}>{masteryAdvice(reached)}</Muted>
          {next ? (
            <Button
              label="Next objective"
              icon="arrow-right"
              onPress={() =>
                router.replace({
                  pathname: `/course/${trackId}/lesson/${next.id}`,
                  params: { unitId: next.unit_id, objectiveTitle: next.title },
                })
              }
            />
          ) : null}
          {next ? (
            <Muted style={{ textAlign: "center", fontSize: 12 }} numberOfLines={2}>
              Up next: {next.title}
            </Muted>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Button
              label="Back to course"
              icon="arrow-left"
              variant={next ? "ghost" : "primary"}
              fullWidth={false}
              onPress={() => router.push(`/course/${trackId}`)}
            />
            <Button
              label="Ask the coach"
              variant="ghost"
              fullWidth={false}
              icon="message-circle"
              onPress={() =>
                router.push({
                  pathname: `/course/${trackId}/chat`,
                  params: { unitId, prefill: `About "${headerTitle}": ` },
                })
              }
            />
            <Button
              label="Regenerate lesson"
              variant="ghost"
              fullWidth={false}
              icon="refresh-cw"
              onPress={async () => {
                // Use the POST response directly rather than re-fetching --
                // the regenerated row hasn't finished overwriting the cache
                // yet (fade/solo are still generating in the background), so
                // a GET right now would just hand back the stale pre-
                // regenerate content.
                const res = await api.post<{ lesson: LessonContent; practicePending?: boolean }>(
                  `/api/objectives/${objectiveId}/lesson`
                );
                setLesson(res.lesson);
                setPracticePending(!!res.practicePending);
                setGuess("");
                setConfidence(null);
                setGuessFeedback(null);
                setGuessFeedbackLoading(false);
                setStep("guess");
              }}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

// What the status just reached means, and the one concrete thing that
// moves it up. The rubric lives in backend/lib/mastery.ts; nothing in the
// app explained it before, so a learner answering multiple choice forever
// would never find out why they were stuck at Guided.
function masteryAdvice(status: MasteryStatus | null): string {
  switch (status) {
    case "Transfer-ready":
      return "Top of the rubric: you've answered in your own words correctly more than once. Spaced review will still bring it back if you ever miss it.";
    case "Independent":
      return "You answered in free response correctly. One more correct free-response answer here makes it Transfer-ready.";
    case "Guided":
      return "Multiple choice tops out here. Revisit and answer in free response to earn Independent.";
    case "Introduced":
      return "Not there yet -- the explanation is one tap back, and this objective will come up for review.";
    case "Needs review":
      return "This one is flagged for review. Re-read the explanation and try the solo check in free response.";
    default:
      return "Pick up the next objective, or revisit this one.";
  }
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
  onSkip,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
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
        <Button label="Submit my guess" fullWidth={false} icon="send" onPress={onSubmit} disabled={!value.trim()} />
        <Button label="I don't know — just teach me" variant="ghost" fullWidth={false} onPress={onSkip} />
      </View>
    </Card>
  );
}

// Handles both the "fade" (guided practice) and "solo" (independent) check steps. The
// learner picks the answer type themselves via the mode toggle below (defaults to
// multiple-choice) -- both formats grade the same underlying question, so there's no
// mastery gate on which one is available. The "guess" step (above) and PBQ scenarios
// (pbq.tsx) are the two cases where the format isn't a choice: guessing before being
// taught has nothing to pick from, and a PBQ's multi-part scenario doesn't reduce to MC.
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
  const [followUpSent, setFollowUpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  // REQ-074: used to send only "Follow-up on graded answer: <text>", so the
  // coach had no idea which question, answer or verdict was being disputed
  // and nothing told the learner the message had gone anywhere. Now carries
  // the full context and flips into a "sent" state with a link to the thread.
  async function sendFollowUp() {
    if (!followUp.trim() || !result) return;
    setBusy(true);
    const answerText = mode === "mc" && picked != null ? choices[picked] : openAnswer;
    const message =
      `Follow-up on a graded ${kind === "fade" ? "guided practice" : "solo check"} answer.\n` +
      `Question: ${promptText}\n` +
      `My answer: ${answerText}\n` +
      `Verdict: ${result.verdict}. Feedback given: ${result.feedback}\n` +
      `My follow-up: ${followUp.trim()}`;
    try {
      await api.post(`/api/chat`, { trackId, message });
      setFollowUp("");
      setFollowUpSent(true);
    } catch (err) {
      setError((err as Error).message);
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
          <Muted style={{ fontSize: 12 }}>
            {mode === "mc"
              ? "Multiple choice earns up to Guided. Free response is what earns Independent."
              : "Answer in your own words -- a correct free-response answer earns Independent."}
          </Muted>

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
              <ConfidencePicker value={confidence} onChange={setConfidence} />
              <Button label="Submit" icon="send" loading={busy} onPress={submitMC} disabled={busy || picked == null} />
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
              <ConfidencePicker value={confidence} onChange={setConfidence} />
              <Button label="Submit" icon="send" loading={busy} onPress={submitOpen} disabled={busy || !openAnswer.trim()} />
            </View>
          )}


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
          {mode === "mc" && result.verdict === "correct" ? (
            <Muted style={{ fontSize: 12 }}>
              Correct on multiple choice earns Guided. Answer the {kind === "fade" ? "solo check" : "next objective"} in
              free response to earn Independent.
            </Muted>
          ) : null}

          <Button label="Continue" icon="arrow-right" onPress={onDone} />

          {followUpSent ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Feather name="check" size={14} color={colors.good} />
              <Muted style={{ flex: 1 }}>Sent to the coach with your question, answer and verdict.</Muted>
              <Button
                label="Open chat"
                variant="link"
                fullWidth={false}
                onPress={() => router.push({ pathname: `/course/${trackId}/chat` })}
              />
            </View>
          ) : (
            <>
              <Muted>Dispute or ask about this verdict</Muted>
              <TextInput
                placeholder="e.g. I think my answer covered that — here's why..."
                placeholderTextColor={colors.mutedDim}
                value={followUp}
                onChangeText={setFollowUp}
                style={styles.input}
              />
              <Button
                label="Send to the coach"
                variant="ghost"
                icon="corner-up-right"
                onPress={sendFollowUp}
                loading={busy}
                disabled={busy || !followUp.trim()}
              />
            </>
          )}
          {error ? <ErrorBanner message={error} /> : null}
        </View>
      )}
    </Card>
  );
}

// Sits ABOVE the submit button (it used to sit below it, so most answers
// went in before confidence was ever set). Confidence is stored with every
// attempt for calibration -- a confident wrong answer is a stronger signal
// than a hesitant one.
function ConfidencePicker({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Muted>How confident are you?</Muted>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {["1", "2", "3", "4", "5"].map((label, idx) => (
          <Pressable
            key={label}
            onPress={() => onChange(idx + 1)}
            style={[styles.confidence, value === idx + 1 && styles.confidenceActive]}
          >
            <Body style={value === idx + 1 ? { color: colors.accentText, fontFamily: fonts.bodyBold } : undefined}>{label}</Body>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Muted style={{ fontSize: 11 }}>guessing</Muted>
        <Muted style={{ fontSize: 11 }}>certain</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Sits apart from the plain guess/explanation text below it so it reads as
  // commentary on what was just typed, not a continuation of it.
  guessFeedback: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
    marginTop: 4,
  },
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

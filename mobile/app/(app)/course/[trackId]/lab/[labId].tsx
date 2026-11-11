import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { api, ApiError } from "@/api/client";
import { Alert } from "@/lib/alert";
import { Badge, Body, Button, Card, ErrorBanner, H1, H2, Loading, Muted, Screen, TextField, VerdictBadge } from "@/components/ui";
import { ReportProblem } from "@/components/ReportProblem";
import { DictationHint } from "@/components/DictationHint";
import { lengthProblem } from "@/lib/dictation";
import { colors, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { useLabDraft } from "@/lib/useLabDraft";
import { InteractivePartField, InteractiveResult } from "@/components/LabInteractive";
import { answerToSend, knownInput, partAnswered } from "@/lib/labInteractive";
import {
  LAB_PART_MAX,
  PART_STATE_LABEL,
  answersSignature,
  assistNote,
  canSubmit,
  partA11yLabel,
  partRows,
  verdictMessage,
  type LabStepResult,
  type LabStepView,
  type LabSubmitResult,
  type LabView,
  type PartRowState,
} from "@/lib/labs";
import { useGoBack } from "@/lib/useGoBack";
import { isNotFound } from "@/lib/notFound";
import { LoadError } from "@/components/LoadError";

// REQ-123: one lab. A build lab is one step with an answer field per rubric
// part; a case lab is a stepper that reveals each step's new information
// only after the previous step is graded. Every graded step shows a row per
// part (Met / Partly there / Not yet -- never a red X), the learner's own
// answer, the model answer and kind feedback. Answers stay on the device
// until graded (src/lib/useLabDraft.ts), so leaving mid-step loses nothing.
//
// Accessibility: each answer field carries its part label; results rows are
// single accessible elements with a spoken label; buttons are >= 48 dp;
// colours are the theme's AA-checked tokens and state is always written out.
//
// REQ-189: a part with an interactive control (order, match, select,
// command, numeric; src/components/LabInteractive.tsx) is answered with it
// and checked instantly by rule on the server. Its answer is still one
// string in the same draft, so leaving mid-step loses nothing.
//
// REQ-165 (Nick, 2026-11-09): no per-lab disclaimer, no "Awaiting expert
// review" badge and no per-family "I understand" -- the one study notice,
// accepted at launch, covers labs (the server still requires it before a
// clinical or fitness lab starts; its 403 message is shown as is).

const PART_ICON: Record<PartRowState, React.ComponentProps<typeof Feather>["name"]> = {
  met: "check-circle",
  partial: "alert-circle",
  missed: "rotate-ccw",
  unscored: "minus-circle",
};
const PART_COLOR: Record<PartRowState, string> = {
  met: colors.good,
  partial: colors.warn,
  missed: colors.warn,
  unscored: colors.muted,
};

export default function LabScreen() {
  const { trackId, labId, title } = useLocalSearchParams<{ trackId: string; labId: string; title?: string }>();
  const goBack = useGoBack(`/course/${encodeURIComponent(trackId)}/labs`);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<LabView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    setNotFound(false);
    api
      .get<LabView>(`/api/labs/${labId}`)
      .then(setView)
      .catch((err) => {
        setLoadError(friendlyError(err));
        setNotFound(isNotFound(err));
      });
  }, [labId]);
  useEffect(load, [load]);

  async function start(restart: boolean) {
    setStarting(true);
    setStartError(null);
    try {
      setView(await api.post<LabView>(`/api/labs/${labId}/runs`, { restart }));
    } catch (err) {
      setStartError(friendlyError(err));
    } finally {
      setStarting(false);
    }
  }

  function onGraded(res: LabSubmitResult) {
    setView((cur) => {
      if (!cur || !cur.run) return cur;
      const steps = res.nextStep ? [...cur.lab.steps.filter((s) => s.index < res.nextStep!.index), res.nextStep] : cur.lab.steps;
      const results = [...cur.run.results.filter((r) => r.index !== res.step.index), res.step].sort((a, b) => a.index - b.index);
      return {
        ...cur,
        lab: { ...cur.lab, steps },
        run: {
          ...cur.run,
          stepsDone: results.length,
          results,
          status: res.final ? "finished" : "open",
          final: res.final ?? null,
        },
        runsFinished: cur.runsFinished + (res.final && !res.replayed ? 1 : 0),
      };
    });
  }

  const lab = view?.lab;
  const run = view?.run ?? null;
  const open = run?.status === "open";
  const current = open ? lab?.steps.find((s) => s.index === run!.stepsDone) ?? null : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: lab?.kind === "case" ? "Case lab" : lab ? "Build lab" : title ?? "Lab" }} />
      {loadError ? <LoadError message={loadError} notFound={notFound} onRetry={load} /> : null}
      {!view && !loadError ? <Loading label="Opening the lab..." /> : null}

      {lab ? (
        <>
          <View style={{ gap: spacing.xs }}>
            <H1>{lab.title}</H1>
            <Muted>{lab.objectiveTitle}</Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <Badge label={lab.kind === "case" ? `Case: ${lab.stepCount} steps` : "Build"} color={colors.accent} />
              {lab.access === "sample" ? <Badge label="Sample lab" color={colors.good} icon="gift" /> : null}
            </View>
          </View>

          {lab.safetyNote ? (
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.sm }} accessible accessibilityLabel={`Safety note: ${lab.safetyNote}`}>
                <Feather name="shield" size={16} color={colors.warn} style={{ marginTop: 2 }} />
                <Muted style={{ flex: 1, color: colors.text }}>{lab.safetyNote}</Muted>
              </View>
            </Card>
          ) : null}

          <Card elevated>
            <H2>The situation</H2>
            <Body>{lab.brief}</Body>
          </Card>

          {run?.results.map((r) => {
            const step = lab.steps.find((s) => s.index === r.index);
            return step ? <GradedStep key={`${run.id}:${r.index}`} step={step} result={r} stepCount={lab.stepCount} isFinal={!!run.final && r.index === lab.stepCount - 1} /> : null;
          })}

          {!run ? (
            <Card>
              <Body>
                {lab.kind === "case"
                  ? "The case unfolds in steps. Each step shows new information once you've answered the one before."
                  : "Write each part of the artifact in its own box. You'll see a score per part and a model answer."}
              </Body>
              {startError ? <ErrorBanner message={startError} onRetry={() => start(false)} /> : null}
              <Button label="Start the lab" icon="play" loading={starting} onPress={() => start(false)} />
            </Card>
          ) : null}

          {open && current ? (
            <StepForm
              key={`${run!.id}:${current.index}`}
              labId={lab.id}
              runId={run!.id}
              step={current}
              stepCount={lab.stepCount}
              kind={lab.kind}
              onGraded={onGraded}
              onStale={load}
            />
          ) : null}

          {run?.final ? (
            <Card elevated>
              <View accessibilityLiveRegion="polite" style={{ gap: spacing.sm }}>
                <H2>{lab.kind === "case" ? "Case summary" : "Your result"}</H2>
                <VerdictBadge verdict={run.final.verdict} />
                <Body>{run.final.summary}</Body>
                <Body>{verdictMessage(run.final.verdict, true)}</Body>
                {assistNote(run.final) ? <Muted>{assistNote(run.final)}</Muted> : null}
              </View>
              {startError ? <ErrorBanner message={startError} onRetry={() => start(true)} /> : null}
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <Button label="Back to labs" fullWidth={false} onPress={goBack} />
                <Button
                  label="Try it again"
                  accessibilityLabel="Try this lab again. It counts lightly, because you've seen the model answers."
                  variant="ghost"
                  fullWidth={false}
                  loading={starting}
                  onPress={() => start(true)}
                />
              </View>
            </Card>
          ) : null}

          {/* The study notice points to the report links, so this is on the screen from the start. */}
          <ReportProblem target={{ kind: "lab", labId: lab.id }} />
          {open && run && run.results.length > 0 ? (
            <>
              {/* REQ-217 (FAIL-1051): a failed restart said nothing. */}
              {startError ? <ErrorBanner message={startError} onRetry={() => start(true)} /> : null}
              <Button
                label="Start over"
                variant="link"
                size="sm"
                fullWidth={false}
                onPress={() =>
                  // REQ-217 (FAIL-1051): it throws away the answers already graded in this run.
                  Alert.alert("Start over?", "This discards your answers so far and begins the lab again from the first step.", [
                    { text: "Keep my answers", style: "cancel" },
                    { text: "Start over", style: "destructive", onPress: () => void start(true) },
                  ])
                }
              />
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function StepHeader({ step, stepCount }: { step: LabStepView; stepCount: number }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {stepCount > 1 ? <Muted style={{ fontSize: 12, color: colors.mutedDim }}>Step {step.index + 1} of {stepCount}</Muted> : null}
      {step.text ? <Body>{step.text}</Body> : null}
      <Body style={{ color: colors.text }}>{step.ask}</Body>
    </View>
  );
}

function StepForm({
  labId,
  runId,
  step,
  stepCount,
  kind,
  onGraded,
  onStale,
}: {
  labId: string;
  runId: string;
  step: LabStepView;
  stepCount: number;
  kind: "build" | "case";
  onGraded: (res: LabSubmitResult) => void;
  // REQ-217 (FAIL-1054): the server says this step or run is no longer open
  // (answered on another device, or the run ended): reload the lab so the
  // screen shows where the run really is, not a step that can never be sent.
  onStale: () => void;
}) {
  const draft = useLabDraft(labId, runId, step.index, step.parts.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = step.parts.map((_, i) => knownInput(step.inputs?.[i]));
  // What is sent: an order the learner never moved is still an answer.
  const answers = draft.parts.map((p, i) => answerToSend(p, inputs[i]));
  const ready = canSubmit(answers) && answers.some((a, i) => partAnswered(draft.parts[i] ?? "", inputs[i]) && a.trim());

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const clientAttemptId = draft.idFor(answersSignature(step.index, answers), () => Crypto.randomUUID());
    try {
      const res = await api.post<LabSubmitResult>(`/api/labs/${labId}/submit`, {
        runId,
        step: step.index,
        answers,
        clientAttemptId,
      });
      draft.clear();
      onGraded(res);
    } catch (err) {
      setError(friendlyError(err, { kept: true }));
      if (err instanceof ApiError && err.status === 409) onStale();
    } finally {
      setBusy(false);
    }
  }

  const last = step.index === stepCount - 1;
  return (
    <Card elevated>
      <StepHeader step={step} stepCount={stepCount} />
      {step.parts.some((_, i) => !inputs[i]) ? <DictationHint /> : null}
      {step.parts.map((label, i) =>
        inputs[i] ? (
          <InteractivePartField
            key={i}
            label={step.parts.length > 1 ? `Part ${i + 1}: ${label}` : label}
            input={inputs[i]!}
            value={draft.parts[i] ?? ""}
            onChange={(v) => draft.setPart(i, v)}
          />
        ) : (
        <TextField
          key={i}
          label={step.parts.length > 1 ? `Part ${i + 1}: ${label}` : label}
          value={draft.parts[i] ?? ""}
          onChangeText={(v) => draft.setPart(i, v)}
          placeholder={kind === "build" ? "Write this part of your answer" : "Your decision and why"}
          multiline
          minHeight={kind === "build" ? 110 : 90}
          error={lengthProblem(draft.parts[i] ?? "", LAB_PART_MAX)}
          autoCapitalize="sentences"
        />
        )
      )}
      <Muted style={{ fontSize: 12 }}>Your answers are saved on this device until you send them. This is fictional practice; don't enter real people's details.</Muted>
      {error ? <ErrorBanner message={error} onRetry={submit} /> : null}
      <Button
        label={last ? (stepCount > 1 ? "Check my last step" : "Check my answer") : "Check this step"}
        icon="send"
        loading={busy}
        disabled={busy || !ready}
        onPress={submit}
      />
    </Card>
  );
}

function GradedStep({ step, result, stepCount, isFinal }: { step: LabStepView; result: LabStepResult; stepCount: number; isFinal: boolean }) {
  const rows = partRows(result, step.parts);
  const inputs = step.parts.map((_, i) => knownInput(step.inputs?.[i]));
  return (
    <Card>
      <StepHeader step={step} stepCount={stepCount} />
      <View style={{ gap: spacing.xs }} accessibilityLiveRegion="polite">
        <VerdictBadge verdict={result.verdict} />
        {!isFinal ? <Body>{verdictMessage(result.verdict, false)}</Body> : null}
      </View>
      {rows.map((row, i) => (
        <View
          key={i}
          accessible
          accessibilityLabel={`${partA11yLabel(row, i)} Your answer: ${row.answer || "blank"}. Model answer: ${row.modelAnswer}`}
          style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}
        >
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <Feather name={PART_ICON[row.state]} size={15} color={PART_COLOR[row.state]} style={{ marginTop: 2 }} />
            <Body style={{ flex: 1 }}>{row.label}</Body>
          </View>
          <Muted style={{ fontSize: 13, color: PART_COLOR[row.state] }}>
            {PART_STATE_LABEL[row.state]}
            {row.comment ? ` · ${row.comment}` : ""}
          </Muted>
          {inputs[i] && result.reference[i]?.key && result.responses ? (
            <InteractiveResult input={inputs[i]!} response={result.responses[i] ?? ""} interactiveKey={result.reference[i]?.key} />
          ) : (
            <Muted style={{ fontSize: 13 }}>Your answer: {row.answer.trim() || "(blank)"}</Muted>
          )}
          <Muted style={{ fontSize: 13, color: colors.text }}>Model answer: {row.modelAnswer}</Muted>
        </View>
      ))}
      {result.feedback ? <Body>{result.feedback}</Body> : null}
      {result.fixNext ? <Muted>Next: {result.fixNext}</Muted> : null}
    </Card>
  );
}

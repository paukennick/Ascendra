import React, { useCallback, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { pbqDraftKey } from "@/lib/drafts";
import { attemptIdFor } from "@/lib/lessonProgress";
import {
  PBQ_ANSWER_MAX,
  parsePbqPayload,
  pbqAfterGenerate,
  pbqPartRows,
  pbqPartSummary,
  pbqPayload,
  type PartRowState,
} from "@/lib/pbqProgress";
import { useStoredDraft } from "@/lib/useStoredDraft";
import { MISS_FRAMING, REVISE_NOTE, assistNote, isMiss, offerPbqRevision } from "@/lib/lessonFeedback";
import { Collapsible, FeedbackPanel, NextStep } from "@/components/feedback";
import type { Attempt, GradeResult, PBQScenario, Unit } from "@/types";
import {
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  H1,
  H2,
  Loading,
  Muted,
  Screen,
  SectionHeader,
  VerdictBadge,
} from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { whenLabel } from "@/lib/time";

// REQ-084: three gaps closed here.
// 1. Opened from the dashboard's quick action (no unitId) this screen used
//    to show an error telling you to go back and open it from a unit card.
//    Now it loads the course's units and lets you pick one.
// 2. After grading, each sub-part is shown as hit or missed individually
//    rather than one combined "Missed: a, b" line.
// 3. Past PBQ attempts for this course are listed below, so the simulator
//    has a memory.
// REQ-107: a plain open serves a scenario this learner hasn't attempted yet,
// and the graded result shows the grader's score for each sub-part (met,
// partly met, missed) with its one-line comment, plus an "N of M" summary.
// REQ-093: the scenario, the unsent answer and the graded result are kept on
// the device (src/lib/pbqProgress.ts), so leaving the screen and coming back
// shows the same scenario instead of starting over.
// Icon, colour and label per sub-part state. The label is words, not only
// colour, so the score reads the same to a colour-blind learner.
const PART_LOOK: Record<
  PartRowState,
  { icon: React.ComponentProps<typeof Feather>["name"]; color: string; label: string | null }
> = {
  pending: { icon: "circle", color: colors.muted, label: null },
  met: { icon: "check-circle", color: colors.good, label: "Met" },
  partial: { icon: "alert-circle", color: colors.warn, label: "Partly" },
  // REQ-105: a missed part is amber ("to work on"), not red -- mistakes are
  // information, not a judgement.
  missed: { icon: "alert-circle", color: colors.warn, label: "To work on" },
};

export default function PBQScreen() {
  const { trackId, unitId: unitIdParam, trackTitle, scenarioId: retryScenarioId } = useLocalSearchParams<{
    trackId: string;
    unitId?: string;
    trackTitle?: string;
    // REQ-097: "Retry scenario" from Review -- load exactly this scenario.
    scenarioId?: string;
  }>();
  const [unitId, setUnitId] = useState<string | undefined>(unitIdParam);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [scenario, setScenario] = useState<PBQScenario | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  // REQ-105: the first, missed result once the learner chose to revise the
  // missed sub-parts. Its feedback stays on screen while revising and after.
  const [firstResult, setFirstResult] = useState<GradeResult | null>(null);
  const [history, setHistory] = useState<Attempt[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef<{ id: string; signature: string } | null>(null);
  const { user } = useAuth();

  // The saved state is read when a unit is known (the dashboard's unit card,
  // or the picker below) and rewritten as it changes. sentRef is read during
  // render on purpose: it is updated before the state change that re-renders.
  const scenarioShown = useRef(false);
  scenarioShown.current = !!scenario;
  const snapshot =
    scenario && unitId
      ? pbqPayload({
          unitId,
          scenario,
          answer,
          result,
          firstResult,
          clientAttemptId: sentRef.current?.id ?? null,
          sentSignature: sentRef.current?.signature ?? null,
        })
      : null;
  useStoredDraft(user && unitId ? pbqDraftKey(user.id, unitId) : null, snapshot, (stored) => {
    // Only fills the empty picker; a scenario already on screen wins.
    if (!stored || !unitId || scenarioShown.current) return;
    const snap = parsePbqPayload(stored, unitId);
    if (!snap) return;
    setScenario(snap.scenario);
    setAnswer(snap.answer);
    setResult(snap.result);
    setFirstResult(snap.firstResult ?? null);
    sentRef.current =
      snap.clientAttemptId && snap.sentSignature ? { id: snap.clientAttemptId, signature: snap.sentSignature } : null;
  });

  useEffect(() => {
    api
      .get<{ units: Unit[] }>(`/api/courses/${trackId}`)
      .then((res) => setUnits(res.units))
      .catch(() => setUnits([]));
  }, [trackId]);

  const loadHistory = useCallback(() => {
    api
      .get<{ attempts: Attempt[] }>(`/api/attempts?trackId=${trackId}&kind=pbq&limit=20`)
      .then((res) => setHistory(res.attempts))
      .catch(() => setHistory([]));
  }, [trackId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // A retry opened from Review replaces whatever draft was on screen with a
  // fresh, unanswered copy of that scenario (scenarioShown then stops the
  // stored draft from overwriting it).
  useEffect(() => {
    if (!retryScenarioId) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    api
      .get<{ scenario: PBQScenario }>(`/api/pbq?scenarioId=${encodeURIComponent(retryScenarioId)}`)
      .then((res) => {
        if (cancelled) return;
        setUnitId(res.scenario.unit_id);
        setScenario(res.scenario);
        setAnswer("");
        setResult(null);
        setFirstResult(null);
        sentRef.current = null;
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retryScenarioId]);

  // FAIL-067: the answer, the graded result and the attempt id used to be
  // cleared before the request, so a failed "Try another scenario" left the
  // old scenario blank and ungraded, and answering it again recorded a
  // second attempt under a new id. They are now replaced only once the new
  // scenario has arrived (pbqAfterGenerate); a failure leaves them as they
  // were and shows the error above the old scenario.
  async function generate(fresh: boolean) {
    if (!unitId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.get<{ scenario: PBQScenario }>(
        `/api/pbq?unitId=${unitId}${fresh ? "&fresh=1" : ""}`
      );
      const next = pbqAfterGenerate({ scenario, answer, result, sent: sentRef.current }, res.scenario);
      sentRef.current = next.sent;
      setResult(next.result);
      // REQ-105: a revision belongs to the old scenario; a new one starts clean.
      setFirstResult(null);
      setAnswer(next.answer);
      setScenario(next.scenario);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!scenario || !answer.trim()) return;
    setBusy(true);
    setError(null);
    // Same scenario and same answer resent after a failure keeps its id, so
    // if the first request did reach the server this one gets that result
    // back instead of a second recorded attempt. Any change is a new attempt.
    // REQ-105: a revision is its own attempt even if the text didn't change.
    const retryOf = firstResult?.attempt?.id ?? null;
    const signature = `pbq:${scenario.id}:${retryOf ? `rev:${retryOf}:` : ""}${answer.trim()}`;
    const clientAttemptId = attemptIdFor(
      { clientAttemptId: sentRef.current?.id ?? null, sentSignature: sentRef.current?.signature ?? null },
      signature,
      Crypto.randomUUID
    );
    sentRef.current = { id: clientAttemptId, signature };
    try {
      const res = await api.post<GradeResult>("/api/pbq", {
        clientAttemptId,
        scenarioId: scenario.id,
        unitId,
        answer,
        ...(retryOf ? { retryOf } : {}),
      });
      setResult(res);
      loadHistory();
    } catch (err) {
      // The scenario was removed on the server after it was saved here (or
      // is no longer visible): drop it and return to the picker rather than
      // failing on every attempt.
      if (err instanceof ApiError && err.status === 404) {
        setScenario(null);
        setResult(null);
        setFirstResult(null);
        setAnswer("");
        sentRef.current = null;
        setError("That scenario is no longer available. Generate a new one.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedUnit = units?.find((u) => u.id === unitId);
  // While revising, the sub-parts show the first result's marks. After a
  // revision the server graded only the revised parts; without per-part
  // scores for every part, anything it doesn't list as missed is covered.
  const shownResult = result ?? firstResult;
  const missed = new Set((shownResult?.missedParts ?? []).map((p) => p.trim().toLowerCase()));
  const revising = !!firstResult && !result;
  const missedLabels = scenario?.sub_parts.filter((p) => missed.has(p.trim().toLowerCase())) ?? [];
  // REQ-107: one row per sub-part with the grader's own score when it sent one.
  const partRows = scenario ? pbqPartRows(scenario.sub_parts, shownResult) : [];
  const partSummary = result ? pbqPartSummary(partRows) : null;

  return (
    <Screen>
      <H1>PBQ simulator</H1>
      {trackTitle ? <Muted style={{ color: colors.link, fontFamily: fonts.bodyBold }}>{trackTitle}</Muted> : null}
      <Muted>
        A realistic scenario with 2-4 named sub-tasks. Graded holistically but explicitly per
        sub-part — if you miss one, the feedback names exactly which.
      </Muted>

      {error ? <ErrorBanner message={error} /> : null}

      {!scenario ? (
        <Card elevated>
          {units === null ? <Loading label="Loading units..." /> : null}
          {units && units.length ? (
            <>
              <Muted>Scope the scenario to a unit</Muted>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {units.map((u) => (
                  <Chip key={u.id} label={u.title} active={u.id === unitId} onPress={() => setUnitId(u.id)} />
                ))}
              </View>
            </>
          ) : null}
          {units && units.length === 0 ? (
            <EmptyState icon="layers" title="No units yet" message="This course has no units to build a scenario from." />
          ) : null}
          <Button
            label={selectedUnit ? `Generate a PBQ for "${selectedUnit.title}"` : "Pick a unit to begin"}
            icon="zap"
            loading={busy}
            disabled={!unitId || busy}
            onPress={() => generate(false)}
          />
        </Card>
      ) : (
        <>
          <Card elevated>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="layers" size={18} color={colors.accent} />
              <H2 style={{ flex: 1 }}>{scenario.title}</H2>
            </View>
            {selectedUnit ? <Muted>{selectedUnit.title}</Muted> : null}
            <Body>{scenario.scenario}</Body>
            <View style={{ gap: 6, marginTop: 4 }}>
              {partRows.map((row, i) => {
                const look = PART_LOOK[row.state];
                return (
                  <View
                    key={i}
                    style={{ gap: 2 }}
                    accessible
                    accessibilityLabel={`Sub-part ${i + 1}: ${row.part}${look.label ? `, ${look.label}` : ""}${row.comment ? `. ${row.comment}` : ""}`}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Feather name={look.icon} size={15} color={look.color} />
                      <Muted style={{ flex: 1, color: row.state === "pending" ? colors.muted : colors.text }}>
                        {i + 1}. {row.part}
                      </Muted>
                      {look.label ? (
                        <Muted style={{ color: look.color, fontFamily: fonts.bodyBold }}>{look.label}</Muted>
                      ) : null}
                    </View>
                    {row.comment ? <Muted style={{ marginLeft: 23 }}>{row.comment}</Muted> : null}
                  </View>
                );
              })}
            </View>
          </Card>

          {!result ? (
            <Card>
              {revising && firstResult ? (
                // REQ-105: revise just the missed sub-parts, feedback in view.
                <>
                  <FeedbackPanel title="Feedback on your first answer" result={firstResult} />
                  <Body>
                    Revise just {missedLabels.length ? `these sub-parts: ${missedLabels.join("; ")}` : "the missed sub-parts"}.
                  </Body>
                  <Muted style={{ fontSize: 12 }}>{REVISE_NOTE}</Muted>
                </>
              ) : null}
              <TextInput
                multiline
                accessibilityLabel={revising ? "Your revision of the missed sub-parts" : "Your answer"}
                placeholder={revising ? "Your revision of the missed sub-parts" : "Address every sub-part above in your answer"}
                maxLength={PBQ_ANSWER_MAX}
                placeholderTextColor={colors.mutedDim}
                value={answer}
                onChangeText={setAnswer}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: 12,
                  color: colors.text,
                  backgroundColor: colors.cardAlt,
                  minHeight: 120,
                  textAlignVertical: "top",
                }}
              />
              <Button
                label={revising ? "Submit revision" : "Submit answer"}
                icon="send"
                loading={busy}
                onPress={submit}
                disabled={!answer.trim() || busy}
              />
            </Card>
          ) : (
            <Card elevated>
              {firstResult ? (
                <Collapsible label="Feedback on your first answer">
                  <FeedbackPanel result={firstResult} />
                </Collapsible>
              ) : null}
              <VerdictBadge verdict={result.verdict} />
              {isMiss(result.verdict) && !firstResult ? <Muted style={{ fontSize: 12 }}>{MISS_FRAMING}</Muted> : null}
              {partSummary ? <Muted style={{ fontFamily: fonts.bodyBold }}>{partSummary}</Muted> : null}
              <Body>{result.feedback}</Body>
              {isMiss(result.verdict) && result.fixNext ? <NextStep text={result.fixNext} /> : null}
              {result.modelAnswer ? (
                <Collapsible label="Show a model answer">
                  <Body>{result.modelAnswer}</Body>
                </Collapsible>
              ) : null}
              {assistNote(result.assistReason) ? <Muted style={{ fontSize: 12 }}>{assistNote(result.assistReason)}</Muted> : null}
              {offerPbqRevision({ ...result, attemptId: result.attempt?.id ?? null }, firstResult) ? (
                <>
                  <Button
                    label="Revise the missed parts"
                    icon="edit-3"
                    accessibilityLabel="Revise the missed sub-parts once, with this feedback in view. This practice won't raise your level."
                    onPress={() => {
                      setError(null);
                      setFirstResult(result);
                      setResult(null);
                      sentRef.current = null;
                    }}
                  />
                  <Muted style={{ fontSize: 12 }}>{REVISE_NOTE}</Muted>
                </>
              ) : null}
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <Button
                  label="Try another scenario"
                  icon="refresh-cw"
                  fullWidth={false}
                  loading={busy}
                  disabled={busy}
                  onPress={() => generate(true)}
                />
                <Button
                  label="Change unit"
                  variant="ghost"
                  fullWidth={false}
                  icon="layers"
                  disabled={busy}
                  onPress={() => {
                    setScenario(null);
                    setResult(null);
                    setFirstResult(null);
                    setAnswer("");
                    sentRef.current = null;
                  }}
                />
              </View>
            </Card>
          )}
        </>
      )}

      {history && history.length ? (
        <>
          <SectionHeader label="Past scenarios" />
          {history.map((a) => (
            <Card key={a.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Muted style={{ flex: 1 }} numberOfLines={1}>
                  {a.unit_title ?? ""} · {whenLabel(a.created_at)}
                </Muted>
                <VerdictBadge verdict={a.verdict ?? "ungraded"} />
              </View>
              <Body>{a.question}</Body>
              {a.missed_parts && a.missed_parts.length ? (
                <Muted>Missed: {a.missed_parts.join(", ")}</Muted>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

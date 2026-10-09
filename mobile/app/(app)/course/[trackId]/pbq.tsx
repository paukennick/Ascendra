import React, { useCallback, useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
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
export default function PBQScreen() {
  const { trackId, unitId: unitIdParam, trackTitle } = useLocalSearchParams<{
    trackId: string;
    unitId?: string;
    trackTitle?: string;
  }>();
  const [unitId, setUnitId] = useState<string | undefined>(unitIdParam);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [scenario, setScenario] = useState<PBQScenario | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [history, setHistory] = useState<Attempt[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function generate(fresh: boolean) {
    if (!unitId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setAnswer("");
    try {
      const res = await api.get<{ scenario: PBQScenario }>(
        `/api/pbq?unitId=${unitId}${fresh ? "&fresh=1" : ""}`
      );
      setScenario(res.scenario);
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
    try {
      const res = await api.post<GradeResult>("/api/pbq", {
        scenarioId: scenario.id,
        unitId,
        answer,
      });
      setResult(res);
      loadHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedUnit = units?.find((u) => u.id === unitId);
  const missed = new Set((result?.missedParts ?? []).map((p) => p.trim().toLowerCase()));

  return (
    <Screen>
      <H1>PBQ simulator</H1>
      {trackTitle ? <Muted style={{ color: colors.accent, fontFamily: fonts.bodyBold }}>{trackTitle}</Muted> : null}
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
              {scenario.sub_parts.map((part, i) => {
                const graded = !!result;
                const wasMissed = missed.has(part.trim().toLowerCase());
                const color = !graded ? colors.muted : wasMissed ? colors.bad : colors.good;
                const icon: React.ComponentProps<typeof Feather>["name"] = !graded
                  ? "circle"
                  : wasMissed
                    ? "x-circle"
                    : "check-circle";
                return (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Feather name={icon} size={15} color={color} />
                    <Muted style={{ flex: 1, color: graded ? colors.text : colors.muted }}>
                      {i + 1}. {part}
                    </Muted>
                  </View>
                );
              })}
            </View>
          </Card>

          {!result ? (
            <Card>
              <TextInput
                multiline
                placeholder="Address every sub-part above in your answer"
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
              <Button label="Submit answer" icon="send" loading={busy} onPress={submit} disabled={!answer.trim() || busy} />
            </Card>
          ) : (
            <Card elevated>
              <VerdictBadge verdict={result.verdict} />
              <Body>{result.feedback}</Body>
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <Button label="Try another scenario" icon="refresh-cw" fullWidth={false} onPress={() => generate(true)} />
                <Button
                  label="Change unit"
                  variant="ghost"
                  fullWidth={false}
                  icon="layers"
                  onPress={() => {
                    setScenario(null);
                    setResult(null);
                    setAnswer("");
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

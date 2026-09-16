import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { GradeResult, PBQScenario } from "@/types";
import { Body, Button, Card, EmptyState, ErrorBanner, H1, H2, Muted, Screen, Tag, VerdictBadge } from "@/components/ui";
import { colors, radius } from "@/lib/theme";

export default function PBQScreen() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const [scenario, setScenario] = useState<PBQScenario | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(fresh: boolean) {
    if (!unitId) {
      setError("Open the PBQ simulator from a specific unit's card so it knows which unit to scope to.");
      return;
    }
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>PBQ simulator</H1>
      <Muted>
        A realistic scenario with 2-4 named sub-tasks. Graded holistically but explicitly per
        sub-part — if you miss one, the feedback names exactly which.
      </Muted>

      {error ? <ErrorBanner message={error} /> : null}

      {!scenario ? (
        <Card elevated>
          <EmptyState icon="layers" title="Ready when you are" message="Generate a realistic performance-based scenario for this unit." />
          <Button label="Generate a PBQ scenario" icon="zap" loading={busy} onPress={() => generate(false)} />
        </Card>
      ) : (
        <>
          <Card elevated>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="layers" size={18} color={colors.accent} />
              <H2>{scenario.title}</H2>
            </View>
            <Body>{scenario.scenario}</Body>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {scenario.sub_parts.map((part, i) => (
                <Tag key={i} label={part} />
              ))}
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
              <Button label="Submit answer" icon="send" loading={busy} onPress={submit} disabled={!answer.trim()} />
            </Card>
          ) : (
            <Card elevated>
              <VerdictBadge verdict={result.verdict} />
              <Body>{result.feedback}</Body>
              {result.missedParts?.length ? <Muted>Missed: {result.missedParts.join(", ")}</Muted> : null}
              <Button label="Try another scenario" icon="refresh-cw" onPress={() => generate(true)} />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

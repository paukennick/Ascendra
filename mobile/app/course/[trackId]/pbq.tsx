import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { GradeResult, PBQScenario } from "@/types";
import { Screen, Card, H1, H2, Body, Muted, Button, Loading, ErrorBanner, Badge } from "@/components/ui";
import { colors } from "@/lib/theme";

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
        <Card>
          <Button label={busy ? "Generating..." : "Generate a PBQ scenario"} onPress={() => generate(false)} disabled={busy} />
        </Card>
      ) : (
        <>
          <Card>
            <H2>{scenario.title}</H2>
            <Body>{scenario.scenario}</Body>
            <Muted>Sub-parts: {scenario.sub_parts.join(" · ")}</Muted>
          </Card>

          {!result ? (
            <Card>
              <TextInput
                multiline
                placeholder="Address every sub-part above in your answer"
                placeholderTextColor={colors.muted}
                value={answer}
                onChangeText={setAnswer}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 10,
                  color: colors.text,
                  minHeight: 120,
                  textAlignVertical: "top",
                }}
              />
              <Button label={busy ? "Grading..." : "Submit answer"} onPress={submit} disabled={busy || !answer.trim()} />
            </Card>
          ) : (
            <Card>
              <Badge
                label={result.verdict}
                color={result.verdict === "correct" ? colors.good : result.verdict === "partial" ? colors.warn : colors.bad}
              />
              <Body>{result.feedback}</Body>
              {result.missedParts?.length ? <Muted>Missed: {result.missedParts.join(", ")}</Muted> : null}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button label="Try another scenario" onPress={() => generate(true)} />
              </View>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

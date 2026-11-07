import React, { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { api } from "@/api/client";
import type { GradeResult, UnitCheck, UnitCheckStatus } from "@/types";
import { Body, Button, Card, EmptyState, ErrorBanner, H2, Loading, Muted, Screen, VerdictBadge } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// REQ-108 (research item #1): the unit gate check. One scenario, new to the
// learner, written from the unit's gate statement and graded per sub-part
// like a PBQ. Offered once every objective in the unit has been studied; a
// miss is information, and "Try a new scenario" serves one not yet seen.
export default function UnitCheckScreen() {
  const router = useRouter();
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const [status, setStatus] = useState<UnitCheckStatus | null>(null);
  const [check, setCheck] = useState<UnitCheck | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<(GradeResult & { subParts?: string[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sent = useRef<{ id: string; signature: string } | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer("");
    sent.current = null;
    api
      .get<{ status: UnitCheckStatus; check: UnitCheck | null }>(`/api/units/${unitId}/check`)
      .then((res) => {
        setStatus(res.status);
        setCheck(res.check);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [unitId]);

  async function submit() {
    if (!check || !answer.trim()) return;
    setBusy(true);
    setError(null);
    const signature = `${check.id}:${answer.trim()}`;
    if (!sent.current || sent.current.signature !== signature) sent.current = { id: Crypto.randomUUID(), signature };
    try {
      const res = await api.post<GradeResult>(`/api/units/${unitId}/check`, {
        checkId: check.id,
        answer,
        clientAttemptId: sent.current.id,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const missed = new Set((result?.missedParts ?? []).map((p) => p.trim().toLowerCase()));

  return (
    <Screen>
      <Stack.Screen options={{ title: "Unit check" }} />
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <Loading label="Preparing your unit check..." /> : null}

      {!loading && status ? (
        <Card>
          <H2>{status.unitTitle}</H2>
          {status.gate ? <Muted>What this checks: {status.gate}</Muted> : null}
        </Card>
      ) : null}

      {!loading && status && !status.eligible ? (
        <Card>
          <EmptyState
            icon="target"
            title="Not yet"
            message={`Study every objective in this unit first (${status.studied} of ${status.total} so far).`}
          />
        </Card>
      ) : null}

      {!loading && check ? (
        <Card elevated>
          <H2>{check.title}</H2>
          <Body>{check.scenario}</Body>
          <View style={{ gap: 6 }}>
            {check.sub_parts.map((part, i) => {
              const graded = !!result;
              const wasMissed = missed.has(part.trim().toLowerCase());
              const icon = !graded ? "circle" : wasMissed ? "x-circle" : "check-circle";
              const color = !graded ? colors.muted : wasMissed ? colors.bad : colors.good;
              return (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  accessible
                  accessibilityLabel={`Part ${i + 1}: ${part}${graded ? (wasMissed ? ", missed" : ", covered") : ""}`}
                >
                  <Feather name={icon} size={15} color={color} />
                  <Muted style={{ flex: 1, color: graded ? colors.text : colors.muted }}>
                    {i + 1}. {part}
                  </Muted>
                </View>
              );
            })}
          </View>

          {!result ? (
            <View style={{ gap: spacing.sm }}>
              <TextInput
                multiline
                placeholder="Answer each part above"
                placeholderTextColor={colors.mutedDim}
                accessibilityLabel="Your answer"
                value={answer}
                onChangeText={setAnswer}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: 12,
                  color: colors.text,
                  backgroundColor: colors.cardAlt,
                  minHeight: 140,
                  textAlignVertical: "top",
                }}
              />
              <Button label="Check my answer" icon="send" loading={busy} disabled={busy || !answer.trim()} onPress={submit} />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
              <VerdictBadge verdict={result.verdict} />
              <Body>
                {result.verdict === "correct"
                  ? "You used this unit somewhere new. That is the goal."
                  : "Useful to know. The parts marked above are the ones to revisit."}
              </Body>
              <Body>{result.feedback}</Body>
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <Button label="Back to Review" fullWidth={false} onPress={() => router.back()} />
                {result.verdict !== "correct" ? (
                  <Button label="Try a new scenario later" variant="ghost" fullWidth={false} onPress={() => router.back()} />
                ) : null}
              </View>
            </View>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

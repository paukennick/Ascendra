import React, { useCallback, useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { api } from "@/api/client";
import type { GradeResult, UnitCheck, UnitCheckStatus } from "@/types";
import { Body, Button, Card, EmptyState, ErrorBanner, H2, Loading, Muted, Screen, VerdictBadge } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { t } from "@/lib/i18n";
import { UNIT_PART_LABEL, unitCheckPartRows, unitPartA11yLabel, unitPartSummary, type UnitPartState } from "@/lib/unitCheck";
import { useAnswerDraft } from "@/lib/useAnswerDraft";

// REQ-108 (research item #1): the unit gate check. One scenario, new to the
// learner, written from the unit's gate statement and graded per sub-part
// like a PBQ. Offered once every objective in the unit has been studied; a
// miss is information, and "Try a new scenario" serves one not yet seen.
//
// REQ-113 (Audit 3 mobile): per-part rows from the grader's own scores (H2,
// src/lib/unitCheck.ts) with "To work on" in amber rather than a red X (L4);
// the answer is kept on the device until graded (M3); a failed load can be
// retried (M6).

const PART_ICON: Record<UnitPartState, React.ComponentProps<typeof Feather>["name"]> = {
  pending: "circle",
  met: "check-circle",
  partial: "alert-circle",
  missed: "rotate-ccw",
  unscored: "minus-circle",
};
const PART_COLOR: Record<UnitPartState, string> = {
  pending: colors.muted,
  met: colors.good,
  partial: colors.warn,
  missed: colors.warn,
  unscored: colors.muted,
};

export default function UnitCheckScreen() {
  const router = useRouter();
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const [status, setStatus] = useState<UnitCheckStatus | null>(null);
  const [check, setCheck] = useState<UnitCheck | null>(null);
  const [result, setResult] = useState<(GradeResult & { subParts?: string[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = useAnswerDraft("unitcheck", check?.id ?? null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setError(null);
    setResult(null);
    api
      .get<{ status: UnitCheckStatus; check: UnitCheck | null }>(`/api/units/${unitId}/check`)
      .then((res) => {
        setStatus(res.status);
        setCheck(res.check);
      })
      .catch((err) => setLoadError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [unitId]);

  useEffect(load, [load]);

  async function submit() {
    const answer = draft.text;
    if (!check || !answer.trim()) return;
    setBusy(true);
    setError(null);
    // The same text resent (even after the app was closed) keeps its id, so
    // the server replays the grade instead of counting it twice.
    const clientAttemptId = draft.idFor(`${check.id}:${answer.trim()}`, () => Crypto.randomUUID());
    try {
      const res = await api.post<GradeResult>(`/api/units/${unitId}/check`, { checkId: check.id, answer, clientAttemptId });
      setResult(res);
      draft.clear();
    } catch (err) {
      setError(friendlyError(err, { kept: true }));
    } finally {
      setBusy(false);
    }
  }

  const rows = check ? unitCheckPartRows(check.sub_parts, result) : [];
  const summary = unitPartSummary(rows);
  const unscored = rows.some((r) => r.state === "unscored");

  return (
    <Screen>
      <Stack.Screen options={{ title: t("unitCheck.title") }} />
      {loadError ? <ErrorBanner message={loadError} onRetry={load} /> : null}
      {loading ? <Loading label={t("unitCheck.preparing")} /> : null}

      {!loading && status ? (
        <Card>
          <H2>{status.unitTitle}</H2>
          {status.gate ? <Muted>{t("unitCheck.whatItChecks", { gate: status.gate })}</Muted> : null}
        </Card>
      ) : null}

      {!loading && status && !status.eligible ? (
        <Card>
          <EmptyState
            icon="target"
            title={t("unitCheck.notYet.title")}
            message={t("unitCheck.notYet.message", { studied: status.studied, total: status.total })}
          />
        </Card>
      ) : null}

      {!loading && check ? (
        <Card elevated>
          <H2>{check.title}</H2>
          <Body>{check.scenario}</Body>
          <View style={{ gap: 6 }}>
            {rows.map((row, i) => (
              <View
                key={i}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
                accessible
                accessibilityLabel={unitPartA11yLabel(row, i)}
              >
                <Feather name={PART_ICON[row.state]} size={15} color={PART_COLOR[row.state]} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Muted style={{ color: result ? colors.text : colors.muted }}>
                    {i + 1}. {row.part}
                  </Muted>
                  {result && UNIT_PART_LABEL[row.state] ? (
                    <Muted style={{ fontSize: 12, color: PART_COLOR[row.state] }}>
                      {UNIT_PART_LABEL[row.state]}
                      {row.comment ? ` · ${row.comment}` : ""}
                    </Muted>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {!result ? (
            <View style={{ gap: spacing.sm }}>
              <TextInput
                multiline
                placeholder={t("unitCheck.placeholder")}
                placeholderTextColor={colors.mutedDim}
                accessibilityLabel={t("unitCheck.answerLabel")}
                value={draft.text}
                onChangeText={draft.setText}
                style={{
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: radius.md,
                  padding: 12,
                  color: colors.text,
                  backgroundColor: colors.cardAlt,
                  minHeight: 140,
                  textAlignVertical: "top",
                }}
              />
              <Muted style={{ fontSize: 12 }}>{t("unitCheck.draftKept")}</Muted>
              {error ? <ErrorBanner message={error} onRetry={submit} /> : null}
              <Button
                label={t("unitCheck.submit")}
                icon="send"
                loading={busy}
                disabled={busy || !draft.text.trim()}
                onPress={submit}
              />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
              <VerdictBadge verdict={result.verdict} />
              {summary ? <Body>{summary}</Body> : null}
              <Body>{result.verdict === "correct" ? t("unitCheck.correct") : t("unitCheck.notYetResult")}</Body>
              {unscored ? <Muted>{t("unitCheck.unscored")}</Muted> : null}
              <Body>{result.feedback}</Body>
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                <Button label={t("unitCheck.back")} fullWidth={false} onPress={() => router.back()} />
                {result.verdict !== "correct" ? (
                  <Button label={t("unitCheck.later")} variant="ghost" fullWidth={false} onPress={() => router.back()} />
                ) : null}
              </View>
            </View>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

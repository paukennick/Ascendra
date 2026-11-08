import React, { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { PlanOption, PlanResponse, PlanStep } from "@/types/plan";
import { Button, Card, ErrorBanner, H1, H2, Loading, Muted, Screen, SectionHeader, TextField } from "@/components/ui";
import { colors, fonts, spacing } from "@/lib/theme";
import { DateField } from "@/components/DatePicker";
import { friendlyError } from "@/lib/errorMessage";
import { t } from "@/lib/i18n";
import {
  examDateError,
  feasibilityLines,
  formatDate,
  hoursError,
  keptLines,
  localToday,
  optionLine,
  planHeadline,
  reviewLine,
  stepLabel,
  stepMeta,
  stepRoute,
} from "@/lib/studyPlan";

// REQ-110: the study plan, built back from the exam date (or paced from the
// weekly hours when there is no date). Recomputed by the server from current
// mastery each time this opens -- deterministic, no AI call -- so it adapts as
// the learner progresses. Also the kept-vs-completed view.

export default function PlanScreen() {
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const router = useRouter();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState("5");
  const [saving, setSaving] = useState(false);
  // REQ-113 (Audit 3 mobile L6): unsaved edits to the fields used to stop
  // the plan reloading at all on later visits (the focus effect skipped the
  // load while `touched`). The plan now always reloads on focus; only the
  // learner's unsaved field values are kept. A ref, so the focus effect
  // doesn't re-run on every keystroke.
  const touched = useRef(false);
  const setTouched = (v: boolean) => {
    touched.current = v;
  };
  const today = localToday();

  const apply = useCallback((res: PlanResponse, keepFields = false) => {
    setData(res);
    if (keepFields) return;
    setExamDate(res.settings.examDate ?? "");
    setHours(String(res.settings.weeklyHours));
    touched.current = false;
  }, []);

  const load = useCallback(() => {
    setError(null);
    api
      .get<PlanResponse>(`/api/courses/${trackId}/plan?today=${today}`)
      .then((res) => apply(res, touched.current))
      .catch((err) => setError(friendlyError(err)));
  }, [trackId, today, apply]);

  useFocusEffect(load);

  const dateErr = examDateError(examDate, today);
  const hoursErr = hoursError(hours);

  async function save(next?: { examDate?: string | null; weeklyHours?: number }) {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<PlanResponse>(`/api/courses/${trackId}/plan`, {
        examDate: next?.examDate !== undefined ? next.examDate : examDate.trim() || null,
        weeklyHours: next?.weeklyHours ?? Number(hours),
        today,
      });
      apply(res);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function applyOption(o: PlanOption) {
    if (o.kind === "more_hours") return save({ weeklyHours: o.weeklyHours });
    if (o.kind === "later_date") return save({ examDate: o.examDate });
    return undefined;
  }

  // REQ-112 (h): lesson steps open their lesson, the mock-exam step opens
  // exam practice (lib/studyPlan.ts stepRoute).
  function openStep(s: PlanStep) {
    const to = stepRoute(s, trackId, trackTitle);
    if (to) router.push(to as never);
  }

  const plan = data?.plan;
  return (
    <Screen>
      <H1>Study plan</H1>
      {trackTitle ? <Muted>{trackTitle}</Muted> : null}
      {error ? <ErrorBanner message={error} onRetry={!data ? load : undefined} /> : null}
      {!data && !error ? <Loading label="Building your plan..." /> : null}

      <Card>
        <H2>Your exam and your time</H2>
        {/* REQ-113 (L2): picked from a month grid in the learner's locale,
            not typed as YYYY-MM-DD. */}
        <DateField
          label={t("plan.examDate")}
          value={examDate || null}
          min={today}
          onChange={(iso) => {
            setExamDate(iso ?? "");
            setTouched(true);
          }}
          error={dateErr}
        />
        <TextField
          label="Hours you can study each week"
          value={hours}
          onChangeText={(v) => {
            setHours(v);
            setTouched(true);
          }}
          keyboardType="decimal-pad"
          maxLength={4}
          icon="clock"
          error={hoursErr}
        />
        <Button label="Save and rebuild plan" icon="check" loading={saving} disabled={!!dateErr || !!hoursErr} onPress={() => save()} />
        {data?.settings.examDate ? (
          <Button label="Remove the exam date" variant="link" onPress={() => save({ examDate: null })} />
        ) : null}
      </Card>

      {plan ? (
        <>
          <Card elevated style={{ borderColor: colors.accent }}>
            <H2>{planHeadline(plan)}</H2>
            {feasibilityLines(plan).map((line) => (
              <Muted key={line}>{line}</Muted>
            ))}
            {plan.feasibility.options.map((o) => (
              <View key={o.kind} style={{ gap: spacing.xs }}>
                <Muted style={{ color: colors.text }}>• {optionLine(o)}</Muted>
                {o.kind !== "focus" ? (
                  <Button
                    label={o.kind === "more_hours" ? `Use ${o.weeklyHours} hours a week` : `Move my date to ${formatDate(o.examDate)}`}
                    size="sm"
                    variant="ghost"
                    fullWidth={false}
                    onPress={() => applyOption(o)}
                  />
                ) : null}
              </View>
            ))}
            {plan.mockExamDate || plan.lightDay ? (
              <View style={{ gap: 2, marginTop: spacing.xs }}>
                {plan.mockExamDate ? <Muted>Mock exam: {formatDate(plan.mockExamDate)}</Muted> : null}
                {plan.lightDay ? <Muted>Light day (no new material): {formatDate(plan.lightDay)}</Muted> : null}
              </View>
            ) : null}
          </Card>

          <SectionHeader label="This week" />
          <Card>
            {plan.roughLastSession ? (
              <Muted style={{ color: colors.text }}>
                Last session was a tough one. That's how learning feels from the inside, so we'll start with something you can win.
              </Muted>
            ) : null}
            {plan.thisWeek.steps.length === 0 ? <Muted>Nothing new to add this week. Keep up your reviews.</Muted> : null}
            {plan.thisWeek.steps.map((s, i) => (
              <Pressable
                key={`${s.kind}-${s.objectiveId ?? i}`}
                onPress={() => openStep(s)}
                disabled={!stepRoute(s, trackId)}
                accessibilityRole={stepRoute(s, trackId) ? "button" : "text"}
                accessibilityLabel={`${stepLabel(s)}. ${stepMeta(s)}`}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8, minHeight: 48, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Muted style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{stepLabel(s)}</Muted>
                  <Muted style={{ fontSize: 13 }}>{stepMeta(s)}</Muted>
                </View>
                {stepRoute(s, trackId) ? <Feather name="chevron-right" size={16} color={colors.mutedDim} /> : null}
              </Pressable>
            ))}
            <Muted>{reviewLine(plan)}</Muted>
            <Button label="Open Review" icon="rotate-cw" size="sm" variant="ghost" fullWidth={false} onPress={() => router.push("/review")} />
          </Card>

          <SectionHeader label="What you've kept" />
          <Card>
            {keptLines(data!.kept).map((line) => (
              <Muted key={line} style={{ color: colors.text }}>
                {line}
              </Muted>
            ))}
            <Muted style={{ fontSize: 13 }}>
              Kept means you got it right on your last check a day or more after the one before. Completed means you've got it right at
              least once.
            </Muted>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

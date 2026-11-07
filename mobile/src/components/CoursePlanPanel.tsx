import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { friendlyError } from "@/lib/errorMessage";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { PlanResponse, SessionChoice, SessionKind } from "@/types/plan";
import { Badge, Button, Card, ErrorBanner, H2, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { feasibilityLines, keptLines, localToday, planHeadline, sessionA11yLabel } from "@/lib/studyPlan";

// REQ-110: what shows on opening a course, under the progress card:
//   - the optional placement check, offered to a learner who hasn't started;
//   - session choice (research #15): a 10-minute review, a new lesson or a
//     practice scenario, with a suggested default (after a rough session it
//     is something winnable);
//   - one line of the study plan and the kept-vs-completed count, with a link
//     to the full plan.
// All of it comes from one GET /api/courses/:id/plan (no AI call). If that
// fails the panel simply doesn't show: the dashboard works without it.

const ICONS: Record<SessionKind, React.ComponentProps<typeof Feather>["name"]> = {
  review: "rotate-cw",
  lesson: "book-open",
  scenario: "layers",
};

export function CoursePlanPanel({ trackId, trackTitle }: { trackId: string; trackTitle: string }) {
  const router = useRouter();
  const [data, setData] = useState<PlanResponse | null>(null);
  // REQ-113 (Audit 3 mobile L5): "Start from the beginning" failed silently.
  const [skipError, setSkipError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<PlanResponse>(`/api/courses/${trackId}/plan?today=${localToday()}`)
      .then(setData)
      .catch(() => setData(null));
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return null;

  function open(c: SessionChoice) {
    const t = c.target;
    if (!t) return;
    if (t.type === "lesson") {
      router.push({ pathname: `/course/${trackId}/lesson/${t.objectiveId}`, params: { unitId: t.unitId, objectiveTitle: t.title } });
    } else if (t.type === "review") {
      router.push("/review");
    } else {
      router.push({ pathname: `/course/${trackId}/pbq`, params: { unitId: t.unitId, trackTitle } });
    }
  }

  const p = data.placement;
  return (
    <>
      {p.offer || p.status === "active" ? (
        <Card style={{ borderColor: colors.secondary }}>
          <H2>{p.status === "active" ? "Finish your placement check" : "Already know some of this?"}</H2>
          <Muted>
            {p.status === "active"
              ? "Pick up where you left off. It only takes a few minutes."
              : "An optional check of about 10 quick questions lets you skip ahead past what you know. New to it all? Start from the beginning; that's what the course is for."}
          </Muted>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <Button
              label={p.status === "active" ? "Continue the check" : "Take the check"}
              icon="compass"
              size="sm"
              fullWidth={false}
              onPress={() => router.push({ pathname: `/course/${trackId}/placement`, params: { trackTitle } })}
            />
            {p.status !== "active" ? (
              <Button
                label="Start from the beginning"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setSkipError(null);
                  return api
                    .post(`/api/courses/${trackId}/placement`, { action: "skip" })
                    .then(load)
                    .catch((err) => setSkipError(friendlyError(err)));
                }}
              />
            ) : null}
          </View>
          {skipError ? <ErrorBanner message={skipError} /> : null}
        </Card>
      ) : null}

      <Card>
        <H2>What would you like to do?</H2>
        <View style={{ gap: spacing.sm }}>
          {data.sessions.choices.map((c) => {
            const isDefault = c.kind === data.sessions.defaultKind;
            return (
              <Pressable
                key={c.kind}
                onPress={() => open(c)}
                disabled={!c.available}
                accessibilityRole="button"
                accessibilityLabel={sessionA11yLabel(c, isDefault)}
                accessibilityState={{ disabled: !c.available, selected: isDefault }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: spacing.md,
                    minHeight: 48,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: isDefault ? colors.accent : colors.border,
                    backgroundColor: isDefault ? colors.accentDim : colors.cardAlt,
                    opacity: c.available ? 1 : 0.6,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Feather name={ICONS[c.kind]} size={18} color={isDefault ? colors.accentHover : colors.muted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Muted style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{c.label}</Muted>
                  <Muted style={{ fontSize: 13 }}>{c.detail}</Muted>
                </View>
                {isDefault ? <Badge label="Suggested" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
          <H2 style={{ flex: 1 }}>{planHeadline(data.plan)}</H2>
          <Feather name="calendar" size={18} color={colors.muted} />
        </View>
        {feasibilityLines(data.plan)
          .slice(-1)
          .map((line) => (
            <Muted key={line}>{line}</Muted>
          ))}
        <Muted style={{ color: colors.text }}>{keptLines(data.kept)[0]}</Muted>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          <Button
            label={data.settings.saved ? "Open study plan" : "Set up a study plan"}
            icon="calendar"
            size="sm"
            variant="ghost"
            fullWidth={false}
            onPress={() => router.push({ pathname: `/course/${trackId}/plan`, params: { trackTitle } })}
          />
          <Button
            label="Quiz me on my weak spots"
            icon="help-circle"
            size="sm"
            variant="ghost"
            fullWidth={false}
            onPress={() => router.push({ pathname: `/course/${trackId}/quiz`, params: { trackTitle } })}
          />
        </View>
      </Card>
    </>
  );
}

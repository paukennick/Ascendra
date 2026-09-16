import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { Track, Unit } from "@/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  H1,
  H2,
  IconButton,
  Loading,
  Muted,
  ProgressBar,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

const QUICK_ACTIONS: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; path: string }[] = [
  { icon: "message-circle", label: "Ask the coach", path: "chat" },
  { icon: "bar-chart-2", label: "Progress", path: "progress" },
  { icon: "clock", label: "History", path: "history" },
  { icon: "layers", label: "PBQ sim", path: "pbq" },
];

export default function CourseDashboard() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ track: Track; units: Unit[] }>(`/api/courses/${trackId}`)
      .then((res) => {
        setTrack(res.track);
        setUnits(res.units);
      })
      .catch((err) => setError(err.message));
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // "Continue" jumps to the first unit that still has an unmastered objective.
  const continueUnit = units?.find(
    (u) => (u.mastered_objectives ?? 0) < (u.total_objectives ?? 0)
  );

  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      {!track && !error ? <Loading label="Loading course..." /> : null}

      {track ? (
        <>
          <H1>{track.title}</H1>
          <Muted>{track.description}</Muted>

          <Card elevated style={{ borderColor: colors.accent }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Muted>Overall progress</Muted>
              <Muted style={{ color: colors.accent, fontWeight: "700" }}>{track.percent_complete ?? 0}%</Muted>
            </View>
            <ProgressBar percent={track.percent_complete ?? 0} />

            <Button
              label="Continue studying"
              icon="play"
              onPress={() => {
                const nextObjective =
                  continueUnit?.objectives?.find(
                    (o) => o.mastery_status !== "Independent" && o.mastery_status !== "Transfer-ready"
                  ) ?? continueUnit?.objectives?.[0];
                if (nextObjective)
                  router.push({
                    pathname: `/course/${trackId}/lesson/${nextObjective.id}`,
                    params: { unitId: continueUnit?.id },
                  });
              }}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm }}>
              {QUICK_ACTIONS.map((a) => (
                <View key={a.path} style={{ alignItems: "center", gap: 6, width: 72 }}>
                  <IconButton icon={a.icon} onPress={() => router.push(`/course/${trackId}/${a.path}`)} />
                  <Muted style={{ textAlign: "center", fontSize: 11 }}>{a.label}</Muted>
                </View>
              ))}
            </View>
          </Card>

          <SectionHeader label="Units" />
          {units?.map((u) => {
            const complete = (u.mastered_objectives ?? 0) >= (u.total_objectives ?? 0) && (u.total_objectives ?? 0) > 0;
            const unitPercent = u.total_objectives
              ? Math.round(((u.mastered_objectives ?? 0) / u.total_objectives) * 100)
              : 0;
            return (
              <Card key={u.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <H2>{u.title}</H2>
                    <Muted>
                      {u.range_label ?? (u.weight != null ? `${u.weight}% of exam` : "")}
                      {"  "}· {u.mastered_objectives ?? 0}/{u.total_objectives ?? 0} objectives at Independent+
                    </Muted>
                  </View>
                  {(u.needs_review_objectives ?? 0) > 0 ? (
                    <Badge label={`${u.needs_review_objectives} to review`} color={colors.bad} icon="alert-triangle" />
                  ) : null}
                </View>
                <ProgressBar percent={unitPercent} />
                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                  {u.objectives?.slice(0, 1).map((o) => (
                    <Button
                      key={o.id}
                      label={complete ? "Review unit" : "Continue unit"}
                      size="sm"
                      fullWidth={false}
                      icon={complete ? "rotate-cw" : "arrow-right"}
                      onPress={() => {
                        const next = u.objectives?.find((ob) => ob.mastery_status !== "Independent" && ob.mastery_status !== "Transfer-ready") ?? o;
                        router.push({
                          pathname: `/course/${trackId}/lesson/${next.id}`,
                          params: { unitId: u.id },
                        });
                      }}
                    />
                  ))}
                  {u.weight != null || u.range_label == null ? (
                    <Button
                      label="PBQ from this unit"
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      icon="layers"
                      onPress={() => router.push({ pathname: `/course/${trackId}/pbq`, params: { unitId: u.id } })}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}

          {units && units.length === 0 ? (
            <Card>
              <EmptyState icon="folder" title="No units yet" />
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { Track, Unit } from "@/types";
import { Badge, Card, ErrorBanner, H1, H2, Loading, Muted, ProgressBar, Screen } from "@/components/ui";
import { colors, masteryColor, masteryIcon, spacing } from "@/lib/theme";

export default function ProgressScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ track: Track; units: Unit[] }>(`/api/courses/${trackId}`)
      .then((res) => {
        setTrack(res.track);
        setUnits(res.units);
      })
      .catch((err) => setError(err.message));
  }, [trackId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <H1>Mastery matrix</H1>
      {error ? <ErrorBanner message={error} /> : null}
      {!track && !error ? <Loading /> : null}

      {track ? (
        <Card elevated style={{ borderColor: colors.accent }}>
          <H2>{track.title}</H2>
          <ProgressBar percent={track.percent_complete ?? 0} />
          <Muted>
            {track.mastered_objectives ?? 0} / {track.total_objectives ?? 0} objectives at
            Independent or Transfer-ready ({track.percent_complete ?? 0}% complete)
          </Muted>
        </Card>
      ) : null}

      {units?.map((u) => {
        const unitPercent = u.total_objectives
          ? Math.round(((u.mastered_objectives ?? 0) / u.total_objectives) * 100)
          : 0;
        return (
          <Card key={u.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <H2 style={{ flex: 1 }}>{u.title}</H2>
              <Badge label={`${u.avg_score_0_4 ?? 0}/4 avg`} />
            </View>
            <ProgressBar percent={unitPercent} />
            <Muted>{u.mastered_objectives ?? 0}/{u.total_objectives ?? 0} mastered</Muted>
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {u.objectives?.map((o) => {
                const status = o.mastery_status ?? "Not started";
                const c = masteryColor[status] ?? colors.mutedDim;
                return (
                  <View key={o.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                    <Muted style={{ flex: 1, color: colors.text }} numberOfLines={2}>{o.title}</Muted>
                    <Badge label={status} color={c} icon={(masteryIcon[status] ?? "circle") as React.ComponentProps<typeof Feather>["name"]} />
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

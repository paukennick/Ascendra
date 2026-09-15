import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { Track, Unit } from "@/types";
import { Screen, Card, H1, H2, Body, Muted, Badge, Loading, ErrorBanner } from "@/components/ui";
import { colors } from "@/lib/theme";

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
        <Card>
          <H2>{track.title}</H2>
          <Muted>
            {track.mastered_objectives ?? 0} / {track.total_objectives ?? 0} objectives at
            Independent or Transfer-ready ({track.percent_complete ?? 0}% complete)
          </Muted>
        </Card>
      ) : null}

      {units?.map((u) => (
        <Card key={u.id}>
          <Body>{u.title}</Body>
          <Muted>
            avg score {u.avg_score_0_4 ?? 0}/4 · {u.mastered_objectives ?? 0}/{u.total_objectives ?? 0} mastered
          </Muted>
          <View style={{ gap: 6 }}>
            {u.objectives?.map((o) => (
              <View key={o.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Body style={{ flex: 1 }}>{o.title}</Body>
                <Badge label={o.mastery_status ?? "Not started"} />
              </View>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

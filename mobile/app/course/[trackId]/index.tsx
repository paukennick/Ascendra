import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { Track, Unit } from "@/types";
import { Screen, Card, H1, H2, Body, Muted, Badge, Button, Loading, ErrorBanner } from "@/components/ui";

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

          <Card>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button
                label="Continue"
                onPress={() => {
                  const nextObjective =
                    continueUnit?.objectives?.find(
                      (o) => o.mastery_status !== "Independent" && o.mastery_status !== "Transfer-ready"
                    ) ?? continueUnit?.objectives?.[0];
                  if (nextObjective) router.push(`/course/${trackId}/lesson/${nextObjective.id}`);
                }}
              />
              <Button label="Ask the coach" variant="ghost" onPress={() => router.push(`/course/${trackId}/chat`)} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Button label="Progress" variant="ghost" onPress={() => router.push(`/course/${trackId}/progress`)} />
              <Button label="History" variant="ghost" onPress={() => router.push(`/course/${trackId}/history`)} />
              <Button label="PBQ simulator" variant="ghost" onPress={() => router.push(`/course/${trackId}/pbq`)} />
            </View>
          </Card>

          <H2>Units</H2>
          {units?.map((u) => (
            <Card key={u.id}>
              <Body>{u.title}</Body>
              <Muted>
                {u.range_label ?? (u.weight != null ? `${u.weight}% of exam` : "")}
                {"  "}· {u.mastered_objectives ?? 0}/{u.total_objectives ?? 0} objectives at Independent+
                {(u.needs_review_objectives ?? 0) > 0 ? ` · ${u.needs_review_objectives} need review` : ""}
              </Muted>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {u.objectives?.slice(0, 1).map((o) => (
                  <Button
                    key={o.id}
                    label={(u.mastered_objectives ?? 0) < (u.total_objectives ?? 0) ? "Continue unit" : "Review unit"}
                    onPress={() => {
                      const next = u.objectives?.find((ob) => ob.mastery_status !== "Independent" && ob.mastery_status !== "Transfer-ready") ?? o;
                      router.push(`/course/${trackId}/lesson/${next.id}`);
                    }}
                  />
                ))}
                {u.weight != null || u.range_label == null ? (
                  <Button
                    label="PBQ from this unit"
                    variant="ghost"
                    onPress={() => router.push({ pathname: `/course/${trackId}/pbq`, params: { unitId: u.id } })}
                  />
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {u.objectives?.map((o) => (
                  <Badge key={o.id} label={o.mastery_status ?? "Not started"} />
                ))}
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { CourseReadiness, Track, Unit } from "@/types";
import { Badge, Card, ErrorBanner, H1, H2, Loading, Muted, ProgressBar, Screen } from "@/components/ui";
import { colors, fonts, masteryColor, masteryIcon, spacing } from "@/lib/theme";
import { domainLine, readinessSummary } from "@/lib/progress";
import { objectiveRowStatus, SAVED_PLACE_LABEL } from "@/lib/lessonExit";

export default function ProgressScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [readiness, setReadiness] = useState<CourseReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ track: Track; units: Unit[]; readiness?: CourseReadiness }>(`/api/courses/${trackId}`)
      .then((res) => {
        setTrack(res.track);
        setUnits(res.units);
        setReadiness(res.readiness ?? null);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, [trackId]);

  // REQ-131: reload every time the screen regains focus, not just on mount.
  // This screen stays mounted under the lesson/PBQ screens opened from it,
  // so a mount-only load showed the matrix as it was before the learner
  // finished anything. (Same pattern as the course dashboard and review.)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summary = readinessSummary(readiness);

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

      {/* REQ-100: readiness, with coverage and accuracy kept apart and one
          line per exam domain. */}
      {summary ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <H2 style={{ flex: 1 }}>{summary.headline}</H2>
            {summary.percent != null ? <Badge label={`${summary.percent}% ready`} /> : null}
          </View>
          {summary.lines.map((line) => (
            <Muted key={line}>{line}</Muted>
          ))}
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            {readiness?.domains.map((d) => (
              <View key={d.unitId}>
                <Muted style={{ color: colors.text, fontFamily: fonts.bodyBold }} numberOfLines={2}>
                  {d.title}
                  {d.weight != null && readiness.blueprintWeighted ? ` (${d.weight}% of exam)` : ""}
                </Muted>
                <Muted style={{ fontSize: 12 }}>{domainLine(d)}</Muted>
              </View>
            ))}
          </View>
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
                // REQ-250: a saved place reads "In progress", not "Not started".
                const { status, saved } = objectiveRowStatus(o);
                const c = masteryColor[status] ?? (saved ? colors.accent : colors.mutedDim);
                // REQ-075: each row opens its lesson -- the matrix used to be
                // read-only, so spotting a weak objective here meant hunting
                // for it again on the dashboard.
                return (
                  <Pressable
                    key={o.id}
                    onPress={() =>
                      router.push({
                        pathname: `/course/${trackId}/lesson/${o.id}`,
                        params: { unitId: u.id, objectiveTitle: o.title },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${o.title}, ${status}${saved ? `. ${SAVED_PLACE_LABEL}` : ""}. Open lesson`}
                    style={({ pressed }) => [
                      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm, minHeight: 48 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Muted style={{ flex: 1, color: colors.text }} numberOfLines={2}>{o.title}</Muted>
                    <Badge label={status} color={c} icon={(masteryIcon[status] ?? (saved ? "bookmark" : "circle")) as React.ComponentProps<typeof Feather>["name"]} />
                  </Pressable>
                );
              })}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

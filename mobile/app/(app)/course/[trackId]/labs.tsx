import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { Badge, Card, EmptyState, ErrorBanner, H2, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { KIND_LABEL, groupByUnit, labA11yLabel, labAccessBadge, labStateLabel, type LabListItem } from "@/lib/labs";

// REQ-123: a course's verifiable labs, grouped by unit (or one unit's, when
// opened from that unit). Build labs produce an artifact; case labs unfold
// in steps. Each row is one labelled button of at least 48 dp; status text
// uses the theme's AA-checked colours, never colour alone.

export default function LabsScreen() {
  const router = useRouter();
  const { trackId, unitId, trackTitle } = useLocalSearchParams<{ trackId: string; unitId?: string; trackTitle?: string }>();
  const [labs, setLabs] = useState<LabListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const q = unitId ? `unitId=${encodeURIComponent(unitId)}` : `trackId=${encodeURIComponent(trackId)}`;
    api
      .get<{ labs: LabListItem[] }>(`/api/labs?${q}`)
      .then((res) => setLabs(res.labs))
      .catch((err) => setError(friendlyError(err)));
  }, [trackId, unitId]);

  // Refreshed on focus so a lab finished on its own screen shows as done.
  useFocusEffect(useCallback(() => load(), [load]));

  const groups = labs ? groupByUnit(labs) : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: "Labs" }} />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!labs && !error ? <Loading label="Loading labs..." /> : null}
      {labs ? (
        <Muted>
          Hands-on practice the exam tests by doing: build an artifact or work through a case step by step. Every part is
          graded with a model answer, and each lab counts toward the objective it names.
        </Muted>
      ) : null}
      {labs && labs.length === 0 ? (
        <Card>
          <EmptyState
            icon="tool"
            title="No labs here yet"
            message={`${trackTitle ? `${trackTitle} has` : "This course has"} no labs ready yet. Lessons, practice exams and PBQs still cover every objective.`}
          />
        </Card>
      ) : null}
      {groups.map((g) => (
        <View key={g.unitId} style={{ gap: spacing.sm }}>
          <SectionHeader label={g.unitTitle} />
          {g.labs.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={labA11yLabel(l)}
              accessibilityHint="Opens the lab"
              onPress={() => router.push({ pathname: `/course/${trackId}/lab/${l.id}`, params: { title: l.title } })}
              style={({ pressed }) => [{ minHeight: 48 }, pressed && { opacity: 0.7 }]}
            >
              <Card>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                  <Feather name={l.kind === "case" ? "git-commit" : "tool"} size={18} color={colors.text} style={{ marginTop: 3 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <H2>{l.title}</H2>
                    <Muted style={{ fontSize: 13 }}>{l.objectiveTitle}</Muted>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
                      <Badge label={KIND_LABEL[l.kind]} color={colors.accent} />
                      {labAccessBadge(l.access) ? (
                        <Badge label={labAccessBadge(l.access)!} color={l.access === "sample" ? colors.good : colors.muted} icon={l.access === "sample" ? "gift" : "lock"} />
                      ) : null}
                    </View>
                    <Muted style={{ fontSize: 13, color: l.state === "done" && l.lastVerdict === "correct" ? colors.good : colors.muted }}>
                      {labStateLabel(l)}
                    </Muted>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedDim} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
}

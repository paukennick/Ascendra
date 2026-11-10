import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { Badge, Card, EmptyState, ErrorBanner, H2, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { capsHeaders } from "@/sim/runtime/caps.ts";

// REQ-190: a course's simulations, grouped by unit. Each row is one
// labelled button of at least 48 dp; state is written out, never colour
// alone. A sim this build cannot run says "Update the app to open this".

interface SimListItem {
  id: string;
  title: string;
  screenType: string;
  objectiveTitle: string;
  unitId: string;
  unitTitle: string;
  state: "new" | "in_progress" | "done";
  lastRating: "good" | "mediocre" | "bad" | null;
  runsFinished: number;
  access: "full" | "sample" | "locked";
  runnable: boolean;
}

const RATING: Record<string, string> = { good: "Good", mediocre: "Mediocre", bad: "Bad" };

function stateLabel(s: SimListItem): string {
  if (!s.runnable && s.state !== "in_progress") return "Update the app to open this";
  if (s.state === "in_progress") return "In progress";
  if (s.state === "done") return `Done: ${RATING[s.lastRating ?? ""] ?? "finished"}${s.runsFinished > 1 ? ` (${s.runsFinished} runs)` : ""}`;
  return "Not started";
}

export default function SimsScreen() {
  const router = useRouter();
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const [sims, setSims] = useState<SimListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ sims: SimListItem[] }>(`/api/sims?trackId=${encodeURIComponent(trackId)}`, { headers: capsHeaders() })
      .then((r) => setSims(r.sims))
      .catch((err) => setError(friendlyError(err)));
  }, [trackId]);
  useFocusEffect(useCallback(() => load(), [load]));

  const units: { unitId: string; unitTitle: string; sims: SimListItem[] }[] = [];
  for (const s of sims ?? []) {
    let u = units.find((x) => x.unitId === s.unitId);
    if (!u) units.push((u = { unitId: s.unitId, unitTitle: s.unitTitle, sims: [] }));
    u.sims.push(s);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Simulations" }} />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!sims && !error ? <Loading label="Loading simulations..." /> : null}
      {sims ? (
        <Muted>
          Interactive cases that respond over time. You act, the situation changes, and a debrief scores what happened and what you did.
          A finished run counts toward the objective it names.
        </Muted>
      ) : null}
      {sims && sims.length === 0 ? (
        <Card>
          <EmptyState icon="activity" title="No simulations here yet" message={`${trackTitle ?? "This course"} has no simulations ready yet.`} />
        </Card>
      ) : null}
      {units.map((u) => (
        <View key={u.unitId} style={{ gap: spacing.sm }}>
          <SectionHeader label={u.unitTitle} />
          {u.sims.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}. ${s.screenType === "bedside" ? "Bedside monitor" : "Architecture board"}. ${stateLabel(s)}.${s.access === "locked" ? " Part of Pro." : s.access === "sample" ? " Sample simulation." : ""}`}
              accessibilityHint="Opens the simulation"
              onPress={() => router.push({ pathname: `/course/${trackId}/sim/${s.id}`, params: { title: s.title } })}
              style={({ pressed }) => [{ minHeight: 48 }, pressed && { opacity: 0.7 }]}
            >
              <Card>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                  <Feather name={s.screenType === "bedside" ? "activity" : "server"} size={18} color={colors.text} style={{ marginTop: 3 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <H2>{s.title}</H2>
                    <Muted style={{ fontSize: 13 }}>{s.objectiveTitle}</Muted>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                      <Badge label={s.screenType === "bedside" ? "Bedside monitor" : "Architecture board"} color={colors.accent} />
                      {s.access === "sample" ? <Badge label="Sample" color={colors.good} icon="gift" /> : null}
                      {s.access === "locked" ? <Badge label="Part of Pro" color={colors.muted} icon="lock" /> : null}
                    </View>
                    <Muted style={{ fontSize: 13, color: s.lastRating === "good" ? colors.good : colors.muted }}>{stateLabel(s)}</Muted>
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

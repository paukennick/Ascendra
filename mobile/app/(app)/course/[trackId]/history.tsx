import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { Attempt } from "@/types";
import { Body, Card, Chip, EmptyState, ErrorBanner, H1, Loading, Muted, Screen, VerdictBadge } from "@/components/ui";
import { spacing } from "@/lib/theme";

const KINDS = ["all", "lesson", "quiz", "pbq", "unitcheck", "lab"] as const;

export default function HistoryScreen() {
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [kind, setKind] = useState<typeof KINDS[number]>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const kindParam = kind === "all" ? "" : `&kind=${kind}`;
    api
      .get<{ attempts: Attempt[] }>(`/api/attempts?trackId=${trackId}${kindParam}`)
      .then((res) => setAttempts(res.attempts))
      .catch((err) => setError(err.message));
  }, [trackId, kind]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <H1>Answer history</H1>
      {trackTitle ? <Muted>{trackTitle}</Muted> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {KINDS.map((k) => (
          <Chip key={k} label={k} active={k === kind} onPress={() => setKind(k)} />
        ))}
      </ScrollView>

      {error ? <ErrorBanner message={error} /> : null}
      {!attempts && !error ? <Loading /> : null}

      {attempts?.map((a) => (
        <Card key={a.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Muted>
              {a.kind}
              {a.stage ? ` / ${a.stage}` : ""} · {a.format}
            </Muted>
            <VerdictBadge verdict={a.verdict ?? "ungraded"} />
          </View>
          <Muted>{a.unit_title ?? a.objective_title ?? ""}</Muted>
          <Body>{a.question}</Body>
          <Muted>Your answer: {a.answer}</Muted>
          {a.feedback ? <Body>{a.feedback}</Body> : null}
        </Card>
      ))}

      {attempts && attempts.length === 0 ? (
        <Card>
          <EmptyState icon="clock" title="No attempts yet" message="Answers you submit for this filter will show up here." />
        </Card>
      ) : null}
    </Screen>
  );
}

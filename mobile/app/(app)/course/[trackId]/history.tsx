import React, { useCallback, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { Attempt } from "@/types";
import { HISTORY_EMPTY } from "@/lib/emptyStates";
import { Body, Card, Chip, EmptyState, ErrorBanner, H1, Loading, Muted, Screen, VerdictBadge } from "@/components/ui";
import { createLatestRequest } from "@/lib/latestRequest";
import { spacing } from "@/lib/theme";
import { whenLabel } from "@/lib/time";

const KINDS = ["all", "lesson", "review", "pbq", "unitcheck", "quiz", "lab", "labtask"] as const;


export default function HistoryScreen() {
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [kind, setKind] = useState<typeof KINDS[number]>("all");
  const [error, setError] = useState<string | null>(null);

  // FAIL-068: switching filters quickly could let an older filter's response
  // land last and fill the list; only the newest request may apply.
  const requests = useRef(createLatestRequest()).current;
  const load = useCallback(() => {
    const kindParam = kind === "all" ? "" : `&kind=${kind}`;
    const ticket = requests.begin();
    api
      .get<{ attempts: Attempt[] }>(`/api/attempts?trackId=${trackId}${kindParam}`)
      .then((res) => {
        if (!requests.isLatest(ticket)) return;
        setAttempts(res.attempts);
        setError(null);
      })
      .catch((err) => {
        if (requests.isLatest(ticket)) setError(err.message);
      });
  }, [trackId, kind, requests]);

  // REQ-093: reload on every focus (and when the filter changes, since `load`
  // changes with it), not just on mount -- answers given in a lesson opened
  // from this list weren't showing when the learner came back to it.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        <Card
          key={a.id}
          onPress={
            a.objective_id
              ? () =>
                  router.push({
                    pathname: `/course/${a.track_id ?? trackId}/lesson/${a.objective_id}`,
                    params: { unitId: a.unit_id ?? undefined, objectiveTitle: a.objective_title },
                  })
              : undefined
          }
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Muted>
              {a.kind}
              {a.stage ? ` / ${a.stage}` : ""} · {a.format} · {whenLabel(a.created_at)}
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
          <EmptyState
            icon="clock"
            title={HISTORY_EMPTY.title}
            message={HISTORY_EMPTY.message}
            action={{ label: HISTORY_EMPTY.action!.label, icon: "arrow-left", onPress: () => router.back() }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

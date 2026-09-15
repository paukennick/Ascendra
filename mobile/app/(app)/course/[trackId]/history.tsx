import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { Attempt } from "@/types";
import { Screen, Card, H1, Body, Muted, Badge, Button, Loading, ErrorBanner } from "@/components/ui";
import { colors } from "@/lib/theme";

const KINDS = ["all", "lesson", "quiz", "pbq", "unitcheck", "lab"] as const;

export default function HistoryScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
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
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {KINDS.map((k) => (
          <Button key={k} label={k} variant={k === kind ? "primary" : "ghost"} onPress={() => setKind(k)} />
        ))}
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {!attempts && !error ? <Loading /> : null}

      {attempts?.map((a) => (
        <Card key={a.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>
              {a.kind}
              {a.stage ? ` / ${a.stage}` : ""} · {a.format}
            </Muted>
            <Badge
              label={a.verdict ?? "ungraded"}
              color={a.verdict === "correct" ? colors.good : a.verdict === "partial" ? colors.warn : colors.bad}
            />
          </View>
          <Muted>{a.unit_title ?? a.objective_title ?? ""}</Muted>
          <Body>{a.question}</Body>
          <Muted>Your answer: {a.answer}</Muted>
          {a.feedback ? <Body>{a.feedback}</Body> : null}
        </Card>
      ))}

      {attempts && attempts.length === 0 ? (
        <Card>
          <Muted>No attempts logged yet for this filter.</Muted>
        </Card>
      ) : null}
    </Screen>
  );
}

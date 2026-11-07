import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { ErrorLogEntry, ReviewToday } from "@/types";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  H1,
  H2,
  Loading,
  Muted,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { spacing } from "@/lib/theme";
import { forTodayLabel, nextReviewLabel, utcToday } from "@/lib/reviewSession";

// REQ-108: Review is now a hub with three things on it, none of them a wall
// of due items:
//
// 1. Today's review -- "N for today" and one Start button. Everything the
//    learner has reached Guided on comes back on a 1/3/7/21/60-day ladder,
//    and anything missed comes back too; each comes back with a NEW
//    question, answered for real (the old "Got it" self-report is gone).
//    The session itself is app/(app)/review-session.tsx.
// 2. Unit checks ready -- a few units whose objectives have all been
//    studied, each with a short transfer scenario from the unit's gate.
// 3. Missed scenarios -- a missed PBQ still has "Retry scenario" (REQ-097),
//    since a scenario is not part of the daily question session.
//
// Missed lesson questions used to be listed here one card each; they are now
// folded into Today's review for their objective.

export default function ReviewScreen() {
  const router = useRouter();
  const [today, setToday] = useState<ReviewToday | null>(null);
  const [scenarios, setScenarios] = useState<ErrorLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<ReviewToday>("/api/review/today")
      .then(setToday)
      .catch((err) => setError(err.message));
    api
      .get<{ errors: ErrorLogEntry[] }>("/api/errors?due=1")
      .then((res) => setScenarios(res.errors.filter((e) => !!e.pbq_scenario_id)))
      .catch(() => setScenarios([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function dismiss(entry: ErrorLogEntry) {
    setScenarios((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev);
    try {
      await api.patch(`/api/errors/${entry.id}`, { action: "resolve" });
    } catch (err) {
      setError((err as Error).message);
      setScenarios((prev) => (prev ? [entry, ...prev] : prev));
    }
  }

  const next = today && !today.forToday ? nextReviewLabel(today.nextDueOn, utcToday()) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Review" }} />
      <H1>Review</H1>
      {error ? <ErrorBanner message={error} /> : null}

      <Card elevated>
        <H2>Today's review</H2>
        {!today && !error ? <Loading /> : null}
        {today ? (
          <>
            <Body>{forTodayLabel(today.forToday, today.dueCount)}</Body>
            <Muted>
              {today.forToday
                ? "A short mix of things you have learned, each with a new question. Stop whenever you like; anything you skip stays for later."
                : next
                  ? next.replace("This one comes back", "Your next review is")
                  : "Study a lesson and it will start coming back here on a 1, 3, 7, 21 and 60-day schedule."}
            </Muted>
            {today.forToday ? (
              <Button label="Start" icon="play" onPress={() => router.push("/review-session")} />
            ) : null}
            <Button
              label="Terms you have shown you know"
              variant="link"
              fullWidth={false}
              onPress={() => router.push("/review-coverage")}
            />
          </>
        ) : null}
      </Card>

      {today && today.unitChecks.length ? (
        <>
          <SectionHeader label="Unit checks ready" />
          {today.unitChecks.map((c) => (
            <Card key={c.unitId}>
              <Muted numberOfLines={1}>{c.trackTitle}</Muted>
              <H2>{c.unitTitle}</H2>
              <Muted>
                {c.lastVerdict
                  ? "Try it again with a new scenario when you're ready."
                  : "You've studied every objective in this unit. One short scenario checks you can use it somewhere new."}
              </Muted>
              <Button
                label={c.lastVerdict ? "Try the unit check again" : "Take the unit check"}
                size="sm"
                fullWidth={false}
                icon="target"
                onPress={() => router.push({ pathname: "/unit-check", params: { unitId: c.unitId } })}
              />
            </Card>
          ))}
        </>
      ) : null}

      {scenarios && scenarios.length ? (
        <>
          <SectionHeader label="Missed scenarios" />
          {scenarios.slice(0, 3).map((e) => (
            <Card key={e.id}>
              <Muted numberOfLines={1}>{e.unit_title ?? ""}</Muted>
              <Body>{e.topic}</Body>
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                {e.track_id ? (
                  <Button
                    label="Retry scenario"
                    size="sm"
                    fullWidth={false}
                    icon="layers"
                    onPress={() =>
                      router.push({
                        pathname: `/course/${e.track_id}/pbq`,
                        params: { unitId: e.unit_id ?? undefined, scenarioId: e.pbq_scenario_id ?? undefined },
                      })
                    }
                  />
                ) : null}
                <Button label="Dismiss" size="sm" variant="ghost" fullWidth={false} icon="x" onPress={() => dismiss(e)} />
              </View>
            </Card>
          ))}
          {scenarios.length > 3 ? <Muted>{scenarios.length - 3} more after these.</Muted> : null}
        </>
      ) : null}

      {today && !today.forToday && !today.unitChecks.length && scenarios && !scenarios.length ? (
        <Card>
          <EmptyState icon="check-circle" title="All caught up" message="Nothing is due right now." />
        </Card>
      ) : null}
    </Screen>
  );
}

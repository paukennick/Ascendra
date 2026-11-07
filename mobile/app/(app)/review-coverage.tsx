import React, { useCallback, useState } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { api } from "@/api/client";
import type { TermCoverage } from "@/types";
import { Body, Card, EmptyState, ErrorBanner, H2, Loading, Muted, ProgressBar, Screen, SectionHeader } from "@/components/ui";
import { coverageSummary } from "@/lib/reviewSession";

// REQ-108 (research item #10): for each objective studied, the named terms it
// covers and which ones the learner has answered correctly on their own in a
// review. Review questions rotate toward the ones not yet shown.
export default function ReviewCoverageScreen() {
  const [rows, setRows] = useState<TermCoverage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      api
        .get<{ objectives: TermCoverage[] }>("/api/review/coverage")
        .then((res) => setRows(res.objectives))
        .catch((err) => setError((err as Error).message));
    }, [])
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Terms you know" }} />
      <Muted>
        Many objectives name several terms. A term counts here once you have answered a review question on it correctly,
        in your own words, without the choices.
      </Muted>
      {error ? <ErrorBanner message={error} /> : null}
      {!rows && !error ? <Loading /> : null}
      {rows && !rows.length ? (
        <Card>
          <EmptyState
            icon="list"
            title="Nothing to show yet"
            message="Terms appear here for objectives you've studied once a review question has been written for them."
          />
        </Card>
      ) : null}
      {rows?.map((r, i) => {
        const s = coverageSummary(r.terms);
        const pct = r.terms.length ? (100 * r.terms.filter((t) => t.covered).length) / r.terms.length : 0;
        const newTrack = i === 0 || rows[i - 1].trackTitle !== r.trackTitle;
        const newUnit = newTrack || rows[i - 1].unitTitle !== r.unitTitle;
        return (
          <React.Fragment key={r.objectiveId}>
            {newTrack ? <H2>{r.trackTitle}</H2> : null}
            {newUnit ? <SectionHeader label={r.unitTitle} /> : null}
            <Card>
              <Body>{r.title}</Body>
              <ProgressBar percent={pct} />
              <Muted>{s.line}</Muted>
              {s.notYet ? <Muted>{s.notYet}</Muted> : null}
            </Card>
          </React.Fragment>
        );
      })}
    </Screen>
  );
}

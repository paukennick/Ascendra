import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { api } from "@/api/client";
import type { TermCoverage } from "@/types";
import { Body, Card, EmptyState, ErrorBanner, H2, Loading, Muted, ProgressBar, SectionHeader } from "@/components/ui";
import { coverageSummary } from "@/lib/reviewSession";
import { coverageRows, type CoverageRow } from "@/lib/coverageRows";
import { friendlyError } from "@/lib/errorMessage";
import { colors, spacing } from "@/lib/theme";

// REQ-108 (research item #10): for each objective studied, the named terms it
// covers and which ones the learner has answered correctly on their own in a
// review. Review questions rotate toward the ones not yet shown.
//
// REQ-113 (Audit 3 mobile L3, M6): every studied objective across every
// course (no server limit) was rendered at once, each with an animated bar,
// in one ScrollView. It is now a virtualised list (only rows near the screen
// exist) with still bars, and a failed load can be retried.
export default function ReviewCoverageScreen() {
  const [rows, setRows] = useState<TermCoverage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ objectives: TermCoverage[] }>("/api/review/coverage")
      .then((res) => setRows(res.objectives))
      .catch((err) => setError(friendlyError(err)));
  }, []);

  useFocusEffect(load);

  const items = useMemo(() => (rows ? coverageRows(rows) : []), [rows]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} role="main">
      <Stack.Screen options={{ title: "Terms you know" }} />
      <FlatList
        data={items}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.content}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <Muted>
              Many objectives name several terms. A term counts here once you have answered a review question on it correctly,
              in your own words, without the choices.
            </Muted>
            {error ? <ErrorBanner message={error} onRetry={load} /> : null}
            {!rows && !error ? <Loading /> : null}
          </View>
        }
        ListEmptyComponent={
          rows ? (
            <Card>
              <EmptyState
                icon="list"
                title="Nothing to show yet"
                message="Terms appear here for objectives you've studied once a review question has been written for them."
              />
            </Card>
          ) : null
        }
        renderItem={({ item }) => <Row row={item} />}
      />
    </View>
  );
}

const Row = React.memo(function Row({ row }: { row: CoverageRow }) {
  if (row.kind === "track") return <H2 style={{ marginTop: spacing.sm }}>{row.title}</H2>;
  if (row.kind === "unit") return <SectionHeader label={row.title} />;
  const r = row.objective;
  const s = coverageSummary(r.terms);
  return (
    <Card>
      <Body>{r.title}</Body>
      <ProgressBar percent={row.percent} animated={false} accessibilityLabel={`${r.title}: ${s.line}`} />
      <Muted>{s.line}</Muted>
      {s.notYet ? <Muted>{s.notYet}</Muted> : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
});

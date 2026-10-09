import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { ErrorLogEntry } from "@/types";
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  H2,
  Loading,
  Muted,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { colors, fonts, spacing } from "@/lib/theme";

// REQ-073: the spaced-review queue. Every non-correct answer has always
// been written to error_log with a 1 / 7 / 21-day review date, and the
// README has advertised that scheduler since day one -- but no screen ever
// read it back, so the schedule ran silently and nothing ever came due in
// front of the learner. This is that missing screen.
//
// "Due" means next_review_at has arrived. "Got it" advances the entry one
// stage (1 -> 7 -> 21 days -> resolved); "Dismiss" resolves immediately.
// "Open lesson" is the honest way to re-check: it goes through the real
// lesson flow again, which (via /api/grade) writes a fresh attempt and
// mastery update, so a correct answer there also earns credit toward
// Independent -- the review entry itself is only bookkeeping about when to
// look again.

type Filter = "due" | "all";

const STAGE_LABEL: Record<number, string> = {
  0: "1-day review",
  1: "7-day review",
  2: "21-day review",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReviewScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<ErrorLogEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("due");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ errors: ErrorLogEntry[] }>(`/api/errors${filter === "due" ? "?due=1" : ""}`)
      .then((res) => setEntries(res.errors))
      .catch((err) => setError(err.message));
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function act(entry: ErrorLogEntry, action: "reviewed" | "resolve") {
    setBusyId(entry.id);
    // Optimistic: drop the row now, put it back if the server disagrees.
    setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev);
    try {
      await api.patch(`/api/errors/${entry.id}`, { action });
    } catch (err) {
      setError((err as Error).message);
      setEntries((prev) => (prev ? [entry, ...prev] : prev));
    } finally {
      setBusyId(null);
    }
  }

  // Grouped by course so a learner studying two tracks sees them apart.
  const sections = useMemo(() => {
    if (!entries) return [];
    const byTrack = new Map<string, { title: string; data: ErrorLogEntry[] }>();
    for (const e of entries) {
      const key = e.track_id ?? "none";
      const group = byTrack.get(key) ?? { title: e.track_title ?? "Other", data: [] };
      group.data.push(e);
      byTrack.set(key, group);
    }
    return Array.from(byTrack.values());
  }, [entries]);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Review" }} />
      <Muted>
        Questions you missed come back on a 1, 7, then 21-day schedule. Re-open the lesson to
        re-check yourself, or mark one as understood to move it to the next interval.
      </Muted>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Chip label="Due now" active={filter === "due"} onPress={() => setFilter("due")} />
        <Chip label="All scheduled" active={filter === "all"} onPress={() => setFilter("all")} />
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {!entries && !error ? <Loading /> : null}

      {sections.map((section) => (
        <React.Fragment key={section.title}>
          <SectionHeader label={section.title} />
          {section.data.map((e) => {
            const busy = busyId === e.id;
            return (
              <Card key={e.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                  <Muted style={{ flex: 1 }} numberOfLines={1}>
                    {e.unit_title ?? ""}
                  </Muted>
                  <Badge
                    label={STAGE_LABEL[e.review_stage] ?? `stage ${e.review_stage}`}
                    color={colors.warn}
                    icon="clock"
                  />
                </View>
                {e.objective_title ? <H2>{e.objective_title}</H2> : null}
                <Body>{e.topic}</Body>
                <Muted>Your answer: {e.error_text}</Muted>
                {e.why ? <Body style={{ fontSize: 14 }}>{e.why}</Body> : null}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Muted style={{ fontSize: 12 }}>
                    {e.next_review_at ? `Due ${formatDate(e.next_review_at)}` : ""}
                  </Muted>
                  {e.classification && e.classification !== "none" ? (
                    <Muted style={{ fontSize: 12, fontFamily: fonts.mono }}>{e.classification}</Muted>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                  {e.track_id && e.objective_id ? (
                    <Button
                      label="Open lesson"
                      size="sm"
                      fullWidth={false}
                      icon="book-open"
                      onPress={() =>
                        router.push({
                          pathname: `/course/${e.track_id}/lesson/${e.objective_id}`,
                          params: { unitId: e.unit_id ?? undefined, objectiveTitle: e.objective_title },
                        })
                      }
                    />
                  ) : null}
                  <Button
                    label="Got it"
                    size="sm"
                    variant="ghost"
                    fullWidth={false}
                    icon="check"
                    loading={busy}
                    onPress={() => act(e, "reviewed")}
                  />
                  <Button
                    label="Dismiss"
                    size="sm"
                    variant="ghost"
                    fullWidth={false}
                    icon="x"
                    disabled={busy}
                    onPress={() => act(e, "resolve")}
                  />
                </View>
              </Card>
            );
          })}
        </React.Fragment>
      ))}

      {entries && entries.length === 0 ? (
        <Card>
          <EmptyState
            icon="check-circle"
            title={filter === "due" ? "Nothing due today" : "Nothing scheduled"}
            message={
              filter === "due"
                ? "Missed questions come back here when their review date arrives."
                : "Answer a few practice questions and anything you miss will be scheduled here."
            }
          />
        </Card>
      ) : null}
    </Screen>
  );
}

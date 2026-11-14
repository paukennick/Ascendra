import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/api/client";
import { Card, EmptyState, ErrorBanner, H2, H3, Loading, Muted, Screen } from "@/components/ui";
import { WhatsNewItemRow } from "@/components/WhatsNew";
import { longDate } from "@/lib/datePicker";
import { friendlyError } from "@/lib/errorMessage";
import { groupByDate, parseWhatsNew, RELEASE_NOTES_EMPTY, versionLabel, type WhatsNewEntry } from "@/lib/whatsNew";
import { spacing } from "@/lib/theme";

// REQ-299 (was the What's new history, REQ-140): every release note the
// server shows, newest first and grouped by the date it shipped, each with the
// app version it came with (REQ-300). Reached from Settings > About and from
// the What's new dialog. Reading it marks nothing: "Got it" on the dialog does.
export default function ReleaseNotes() {
  const [entries, setEntries] = useState<WhatsNewEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<unknown>("/api/whats-new")
      .then((data) => {
        const s = parseWhatsNew(data);
        if (s) setEntries(s.entries);
        else setError("Couldn't load the release notes. Please try again.");
      })
      .catch((err) => setError(friendlyError(err)));
  }, []);

  useFocusEffect(load);

  const groups = useMemo(() => groupByDate(entries ?? []), [entries]);

  return (
    <Screen scrollFocusable>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!entries && !error ? <Loading label="Loading release notes..." /> : null}
      {entries && entries.length === 0 ? (
        <Card>
          <EmptyState icon="info" title="Nothing here yet" message={RELEASE_NOTES_EMPTY} />
        </Card>
      ) : null}
      {groups.map((group) => (
        <View key={group.date} style={{ gap: spacing.sm }}>
          <H2>{longDate(group.date)}</H2>
          {group.entries.map((entry) => (
            <Card key={entry.id} style={{ gap: spacing.md }}>
              <View style={{ gap: 2 }}>
                <H3>{entry.title}</H3>
                {versionLabel(entry) ? <Muted>{versionLabel(entry)}</Muted> : null}
              </View>
              {entry.items.map((item) => (
                <WhatsNewItemRow key={item.headline} item={item} />
              ))}
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

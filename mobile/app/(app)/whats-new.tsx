import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/api/client";
import { Card, EmptyState, ErrorBanner, H2, Loading, Muted, Screen } from "@/components/ui";
import { WhatsNewItemRow, noteDate } from "@/components/WhatsNew";
import { parseWhatsNew, type WhatsNewEntry } from "@/lib/whatsNew";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";

// REQ-140: every release note, newest first (Settings > What's new). Reading
// it marks nothing; "Got it" on Home's sheet does.
export default function WhatsNewHistory() {
  const [entries, setEntries] = useState<WhatsNewEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<unknown>("/api/whats-new")
      .then((data) => {
        const s = parseWhatsNew(data);
        if (s) setEntries(s.entries);
        else setError("Couldn't load the updates. Please try again.");
      })
      .catch((err) => setError(friendlyError(err)));
  }, []);

  useFocusEffect(load);

  return (
    <Screen>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!entries && !error ? <Loading label="Loading updates..." /> : null}
      {entries && entries.length === 0 ? (
        <Card>
          <EmptyState icon="info" title="Nothing here yet" message="Notes about new features will show up here." />
        </Card>
      ) : null}
      {entries?.map((entry) => (
        <Card key={entry.id} style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <H2>{entry.title}</H2>
            <Muted>{noteDate(entry)}</Muted>
          </View>
          {entry.items.map((item) => (
            <WhatsNewItemRow key={item.headline} item={item} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import { useBilling } from "@/billing/BillingContext";
import { Body, Card, ErrorBanner, H2, ListRow, Loading, Muted, Screen } from "@/components/ui";
import { friendlyError } from "@/lib/errorMessage";
import { FREE_MASTERY_NOTE, resetPhrase, type FreeCourse } from "@/lib/billing";
import type { Track } from "@/types";

// REQ-122: a Free learner's one course. The first course they open becomes
// it; here they can pick another (straight away the first time, then once a
// week). Progress in every course is kept. Only reachable while paid plans
// are on.
export default function FreeCoursePicker() {
  const { config, me, refresh } = useBilling();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const free: FreeCourse | null = me?.freeCourse ?? null;

  useEffect(() => {
    api
      .get<{ tracks: Track[] }>("/api/courses")
      .then((r) => setTracks(r.tracks))
      .catch((err) => setError(friendlyError(err)));
  }, []);

  const pick = useCallback(
    async (t: Track) => {
      setError(null);
      setSaving(t.id);
      try {
        await api.put("/api/billing/free-course", { trackId: t.id });
        await refresh();
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setSaving(null);
      }
    },
    [refresh]
  );

  if (!config.enabled || me?.tier !== "free") {
    return (
      <Screen>
        <Card>
          <H2>Your courses</H2>
          <Muted>Every course is open to you.</Muted>
        </Card>
      </Screen>
    );
  }
  if (!tracks && !error) return <Loading label="Loading courses" />;

  return (
    <Screen>
      <Card>
        <H2>Your free course</H2>
        <Body>{free ? free.title : "You haven't picked one yet. The first course you open becomes your free course."}</Body>
        <Muted>
          {free?.canSwitchAt
            ? `You can switch ${resetPhrase(free.canSwitchAt)}. Your progress in every course is kept.`
            : "You can switch now. Your progress in every course is kept."}
        </Muted>
        <Muted>{FREE_MASTERY_NOTE}</Muted>
      </Card>
      {error ? <ErrorBanner message={error} /> : null}
      <Card style={{ gap: 0 }}>
        {(tracks ?? []).map((t) => {
          const isFree = free?.trackId === t.id;
          return (
            <View key={t.id}>
              <ListRow
                icon={isFree ? "check-circle" : "book"}
                label={t.title}
                value={isFree ? "Your free course" : saving === t.id ? "Saving..." : undefined}
                onPress={isFree || saving || free?.canSwitchAt ? undefined : () => pick(t)}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

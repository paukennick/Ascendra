import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { Track } from "@/types";
import { Screen, Card, H1, H2, Muted, Button, Loading, ErrorBanner } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ tracks: Track[] }>("/api/courses")
      .then((res) => setTracks(res.tracks))
      .catch((err) => setError(err.message));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <H1>Your courses</H1>
      <Muted>Pick a course to continue studying, or check settings for API connection.</Muted>

      {error ? <ErrorBanner message={error} /> : null}
      {!tracks && !error ? <Loading label="Loading courses..." /> : null}

      {tracks?.map((t) => (
        <Card key={t.id}>
          <H2>{t.title}</H2>
          <Muted>
            {t.track_type === "graduate" ? "Graduate track" : "Certification track"} · {t.code}
          </Muted>
          <Muted>
            {t.mastered_objectives ?? 0} / {t.total_objectives ?? 0} objectives at Independent+
            {t.percent_complete != null ? ` · ${t.percent_complete}% complete` : ""}
          </Muted>
          <Button label="Open course" onPress={() => router.push(`/course/${t.id}`)} />
        </Card>
      ))}

      {tracks && tracks.length === 0 ? (
        <Card>
          <Muted>
            No courses found. Run the seed script against your Supabase database (see the README),
            then pull to reopen this screen.
          </Muted>
        </Card>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <Button label="Settings" variant="ghost" onPress={() => router.push("/settings")} />
      </View>
    </Screen>
  );
}

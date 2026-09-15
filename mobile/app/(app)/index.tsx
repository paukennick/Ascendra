import React, { useCallback, useState } from "react";
import { RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { Track } from "@/types";
import { Card, H1, H2, Body, Muted, Button, Loading, ErrorBanner, ProgressBar } from "@/components/ui";
import { colors } from "@/lib/theme";

interface Section {
  title: string;
  data: Track[];
}

function byLastStudied(a: Track, b: Track): number {
  const aTime = a.last_studied_at ? new Date(a.last_studied_at).getTime() : 0;
  const bTime = b.last_studied_at ? new Date(b.last_studied_at).getTime() : 0;
  return bTime - aTime;
}

// Groups by the existing track_type field -- the natural split this schema
// already has (certification vs. graduate/language courses).
function groupTracks(tracks: Track[]): Section[] {
  const certification = tracks.filter((t) => t.track_type === "certification").sort(byLastStudied);
  const graduate = tracks.filter((t) => t.track_type === "graduate").sort(byLastStudied);
  const sections: Section[] = [];
  if (certification.length) sections.push({ title: "Certifications", data: certification });
  if (graduate.length) sections.push({ title: "Degree & Language Tracks", data: graduate });
  return sections;
}

export default function Home() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true);
    setError(null);
    api
      .get<{ tracks: Track[] }>("/api/courses")
      .then((res) => setTracks(res.tracks))
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const sections = tracks ? groupTracks(tracks) : [];
  const mostRecentId = tracks
    ?.filter((t) => t.last_studied_at)
    .slice()
    .sort(byLastStudied)[0]?.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: 4 }}>
            <H1>Your courses</H1>
            <Muted>Pick a course to continue studying.</Muted>
            {error ? <ErrorBanner message={error} /> : null}
            {!tracks && !error ? <Loading label="Loading courses..." /> : null}
          </View>
        }
        renderSectionHeader={({ section }) => <Body style={styles.sectionHeader}>{section.title}</Body>}
        renderItem={({ item }) => (
          <Card style={item.id === mostRecentId ? styles.highlighted : undefined}>
            <H2>{item.title}</H2>
            <Muted>{item.code}</Muted>
            <Muted>
              {item.mastered_objectives ?? 0} / {item.total_objectives ?? 0} objectives at Independent+
            </Muted>
            <ProgressBar percent={item.percent_complete ?? 0} />
            <Muted>
              {item.percent_complete != null ? `${item.percent_complete}% complete` : "Not started"}
            </Muted>
            <Button label="Open course" onPress={() => router.push(`/course/${item.id}`)} />
          </Card>
        )}
        ListEmptyComponent={
          tracks && tracks.length === 0 ? (
            <Card>
              <Muted>No courses found yet. Check back soon.</Muted>
            </Card>
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <Button label="Settings" variant="ghost" onPress={() => router.push("/settings")} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 4,
  },
  highlighted: { borderColor: colors.accent, borderWidth: 2 },
});

import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import type { Track } from "@/types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  FavoriteButton,
  H1,
  H2,
  IconButton,
  Loading,
  Muted,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";
import { Sidebar } from "@/components/Sidebar";
import { colors, courseEmoji, fonts, spacing, trackTypeIcon } from "@/lib/theme";

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
// already has (certification vs. graduate/language courses) -- with
// favorited tracks pulled into their own section up top instead of also
// appearing in their normal section, so there's no duplication to scan past.
function groupTracks(tracks: Track[]): Section[] {
  const favorites = tracks.filter((t) => t.is_favorite).sort(byLastStudied);
  const rest = tracks.filter((t) => !t.is_favorite);
  const certification = rest.filter((t) => t.track_type === "certification").sort(byLastStudied);
  const graduate = rest.filter((t) => t.track_type === "graduate").sort(byLastStudied);
  const sections: Section[] = [];
  if (favorites.length) sections.push({ title: "Favorites", data: favorites });
  if (certification.length) sections.push({ title: "Certifications", data: certification });
  if (graduate.length) sections.push({ title: "Degree & Language Tracks", data: graduate });
  return sections;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleFavorite = useCallback((track: Track) => {
    const next = !track.is_favorite;
    setTracks((prev) => prev?.map((t) => (t.id === track.id ? { ...t, is_favorite: next } : t)) ?? prev);
    api.patch(`/api/courses/${track.id}/favorite`, { favorite: next }).catch(() => {
      setTracks((prev) => prev?.map((t) => (t.id === track.id ? { ...t, is_favorite: !next } : t)) ?? prev);
    });
  }, []);

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
  const mostRecent = tracks?.find((t) => t.id === mostRecentId);
  const firstName = user?.displayName?.split(" ")[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerLeft: () => <IconButton icon="menu" onPress={() => setSidebarOpen(true)} size={34} />,
          headerRight: () => (
            <IconButton icon="settings" onPress={() => router.push("/settings")} size={34} />
          ),
        }}
      />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} tracks={tracks} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: 4 }}>
            <H1>{greeting()}{firstName ? `, ${firstName}` : ""}</H1>
            <Muted style={{ marginBottom: 8 }}>Pick a course to continue studying.</Muted>
            {error ? <ErrorBanner message={error} /> : null}
            {!tracks && !error ? <Loading label="Loading courses..." /> : null}

            {mostRecent ? (
              <Card style={styles.heroCard} elevated>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Feather name="zap" size={14} color={colors.accent} />
                    <Muted style={{ color: colors.accent, fontFamily: fonts.bodyBold }}>Continue studying</Muted>
                  </View>
                  <FavoriteButton active={!!mostRecent.is_favorite} onPress={() => toggleFavorite(mostRecent)} />
                </View>
                <H2>{mostRecent.title}</H2>
                <ProgressBar percent={mostRecent.percent_complete ?? 0} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Muted>
                    {mostRecent.mastered_objectives ?? 0}/{mostRecent.total_objectives ?? 0} objectives ·{" "}
                    {mostRecent.percent_complete ?? 0}%
                  </Muted>
                  <IconButton icon="arrow-right" variant="solid" size={36} onPress={() => router.push(`/course/${mostRecent.id}`)} />
                </View>
              </Card>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => <SectionHeader label={section.title} />}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/course/${item.id}`)}>
            <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
              <View style={styles.trackIconWrap}>
                {courseEmoji[item.code] ? (
                  <Text style={{ fontSize: 20 }}>{courseEmoji[item.code]}</Text>
                ) : (
                  <Feather name={(trackTypeIcon[item.track_type] ?? "book") as any} size={18} color={colors.accent} />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <H2>{item.title}</H2>
                <Muted>{item.code}</Muted>
              </View>
              <FavoriteButton active={!!item.is_favorite} onPress={() => toggleFavorite(item)} size={32} />
              <Feather name="chevron-right" size={20} color={colors.mutedDim} />
            </View>
            <ProgressBar percent={item.percent_complete ?? 0} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Muted>
                {item.mastered_objectives ?? 0}/{item.total_objectives ?? 0} objectives at Independent+
              </Muted>
              <Badge
                label={item.percent_complete != null ? `${item.percent_complete}%` : "Not started"}
                color={item.percent_complete ? colors.good : colors.mutedDim}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          tracks && tracks.length === 0 ? (
            <Card>
              <EmptyState icon="book-open" title="No courses yet" message="Check back soon — new courses show up here automatically." />
            </Card>
          ) : null
        }
        ListFooterComponent={<Footer />}
      />
    </SafeAreaView>
  );
}

function Footer() {
  const router = useRouter();
  const links: [string, string][] = [
    ["FAQ", "/faq"],
    ["Disclaimer", "/disclaimer"],
    ["Privacy Policy", "/privacy"],
    ["Cookies & Storage", "/cookies"],
    ["Terms", "/terms"],
  ];
  return (
    <View style={styles.footer}>
      <View style={styles.footerLinks}>
        {links.map(([label, path], i) => (
          <React.Fragment key={path}>
            {i > 0 ? <Text style={styles.footerDot}>·</Text> : null}
            <Pressable onPress={() => router.push(path)}>
              <Text style={styles.footerLink}>{label}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
      <Muted style={styles.footerCopy}>Ascendra</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  footerLink: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  footerDot: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 13 },
  footerCopy: { textAlign: "center", fontSize: 12 },
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  heroCard: { borderColor: colors.accent, marginTop: spacing.md, gap: spacing.sm },
  trackIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
});

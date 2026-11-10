import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import type { ReviewToday, Track } from "@/types";
import { Card, EmptyState, ErrorBanner, FavoriteButton, H1, H2, IconButton, Loading, Muted, ProgressBar } from "@/components/ui";
import { CourseCard } from "@/components/CourseCard";
import { Sidebar } from "@/components/Sidebar";
import { colors, fonts, spacing } from "@/lib/theme";
import { homeReviewCard } from "@/lib/homeReview";
import { HOME_EMPTY } from "@/lib/emptyStates";
import { WhatsNewSheet, useWhatsNewOnFocus } from "@/components/WhatsNew";

function byLastStudied(a: Track, b: Track): number {
  const aTime = a.last_studied_at ? new Date(a.last_studied_at).getTime() : 0;
  const bTime = b.last_studied_at ? new Date(b.last_studied_at).getTime() : 0;
  return bTime - aTime;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Home is a personal launch point -- continue-studying first, then
// favorites -- not a catalog browser. With the catalog at 67+ tracks across
// a real taxonomy (see Explore), a single scrolling wall of every course
// stopped being scannable long before it reached this size. Full browsing
// (search, category filter, freshness filter) now lives at /explore instead;
// this screen only ever shows courses the user has already chosen to care
// about (favorited or in progress).
export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  // REQ-073: today's review, loaded alongside the course list but never
  // allowed to block or blank it -- a failure here just hides the card.
  // REQ-113 (Audit 3 mobile H5): from /api/review/today, the same numbers
  // the Review hub shows ("N for today", unit checks). It used to count the
  // old error log, so a learner who rarely misses never saw the daily review.
  const [reviewToday, setReviewToday] = useState<ReviewToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // REQ-140: an unseen release note, offered once the launch questions are
  // settled; never blocks or blanks Home.
  const whatsNew = useWhatsNewOnFocus();

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
    api
      .get<ReviewToday>("/api/review/today")
      .then(setReviewToday)
      .catch(() => setReviewToday(null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const mostRecentId = tracks
    ?.filter((t) => t.last_studied_at)
    .slice()
    .sort(byLastStudied)[0]?.id;
  const mostRecent = tracks?.find((t) => t.id === mostRecentId);
  const favorites = (tracks ?? []).filter((t) => t.is_favorite && t.id !== mostRecentId).sort(byLastStudied);
  const firstName = user?.displayName?.split(" ")[0];
  const review = homeReviewCard(reviewToday);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]} role="main">
      <Stack.Screen
        options={{
          headerLeft: () => <IconButton icon="menu" accessibilityLabel="Open menu" onPress={() => setSidebarOpen(true)} size={34} />,
          headerRight: () => (
            <IconButton icon="settings" accessibilityLabel="Settings" onPress={() => router.push("/settings")} size={34} />
          ),
        }}
      />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} tracks={tracks} />
      <WhatsNewSheet entry={sidebarOpen ? null : whatsNew.entry} onDismiss={whatsNew.dismiss} />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: 4 }}>
            <H1>{greeting()}{firstName ? `, ${firstName}` : ""}</H1>
            <Muted style={{ marginBottom: 8 }}>Pick a course to continue studying.</Muted>
            {error ? <ErrorBanner message={error} onRetry={() => load()} /> : null}
            {!tracks && !error ? <Loading label="Loading courses..." /> : null}

            {mostRecent ? (
              <Card style={styles.heroCard} elevated>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Feather name="zap" size={14} color={colors.accent} />
                    <Muted style={{ color: colors.link, fontFamily: fonts.bodyBold }}>Continue studying</Muted>
                  </View>
                  <FavoriteButton active={!!mostRecent.is_favorite} onPress={() => toggleFavorite(mostRecent)} />
                </View>
                <H2>{mostRecent.title}</H2>
                <ProgressBar percent={mostRecent.percent_progress ?? 0} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Muted>
                    {mostRecent.mastered_objectives ?? 0}/{mostRecent.total_objectives ?? 0} objectives mastered ·{" "}
                    {mostRecent.percent_progress ?? 0}% progress
                  </Muted>
                  <IconButton
                    icon="arrow-right"
                    variant="solid"
                    size={36}
                    accessibilityLabel={`Continue ${mostRecent.title}`}
                    onPress={() => router.push(`/course/${mostRecent.id}`)}
                  />
                </View>
              </Card>
            ) : null}

            {review ? (
              <Card
                onPress={() => router.push("/review")}
                accessibilityLabel={review.a11y}
                style={{ marginTop: mostRecent ? 0 : spacing.md }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View style={[styles.exploreIconWrap, { backgroundColor: withAlpha(colors.warn) }]}>
                    <Feather name="rotate-ccw" size={18} color={colors.warn} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <H2>{review.title}</H2>
                    <Muted>{review.line}</Muted>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.mutedDim} />
                </View>
              </Card>
            ) : null}

            {tracks ? (
              <Card
                onPress={() => router.push("/explore")}
                accessibilityLabel={`Browse all courses. ${tracks.length} courses across every category`}
                style={{ marginTop: mostRecent || review ? 0 : spacing.md }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View style={styles.exploreIconWrap}>
                    <Feather name="compass" size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <H2>Browse all courses</H2>
                    <Muted>{tracks.length} courses across every category</Muted>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.mutedDim} />
                </View>
              </Card>
            ) : null}

            {tracks && favorites.length ? <H2 style={{ marginTop: spacing.md }}>Favorites</H2> : null}
          </View>
        }
        renderItem={({ item }) => (
          <CourseCard
            track={item}
            onPress={() => router.push(`/course/${item.id}`)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={
          tracks && tracks.length === 0 ? (
            <Card>
              <EmptyState icon="book-open" title="No courses yet" message="Check back soon — new courses show up here automatically." />
            </Card>
          ) : tracks && !mostRecent && !favorites.length ? (
            <Card>
              <EmptyState
                icon="compass"
                title={HOME_EMPTY.title}
                message={HOME_EMPTY.message}
                action={{ label: HOME_EMPTY.action!.label, icon: "compass", onPress: () => router.push("/explore") }}
              />
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
    ["About", "/about"],
    ["FAQ", "/faq"],
    ["Disclaimer", "/disclaimer"],
    ["Privacy Policy", "/privacy"],
    ["Cookies & Storage", "/cookies"],
    ["Terms", "/terms"],
    ["Sources", "/sources"],
  ];
  return (
    <View style={styles.footer}>
      <View style={styles.footerLinks}>
        {links.map(([label, path], i) => (
          <React.Fragment key={path}>
            {i > 0 ? <Text style={styles.footerDot}>·</Text> : null}
            <Pressable
              onPress={() => router.push(path)}
              accessibilityRole="link"
              accessibilityLabel={label}
              hitSlop={{ top: 14, bottom: 14, left: 4, right: 4 }}
            >
              <Text style={styles.footerLink}>{label}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
      <Muted style={styles.footerCopy}>Ascendra</Muted>
    </View>
  );
}

// Same 0.16 wash Badge and CourseCard use for a tinted icon chip.
function withAlpha(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
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
  exploreIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
});

import React, { useCallback, useMemo, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { Track } from "@/types";
import { Card, Chip, EmptyState, ErrorBanner, Loading, SectionHeader, TextField } from "@/components/ui";
import { CourseCard } from "@/components/CourseCard";
import { colors, spacing } from "@/lib/theme";

interface Section {
  title: string;
  data: Track[];
}

interface CategoryOption {
  slug: string;
  name: string;
  sortOrder: number;
}

type FreshnessFilter = "all" | "current" | "needs_attention";

function matchesFreshnessFilter(track: Track, filter: FreshnessFilter): boolean {
  if (filter === "all") return true;
  if (filter === "current") return track.freshness_status === "current";
  return track.freshness_status !== "current";
}

// Groups the (already search/category/freshness-filtered) track list by
// education category, same taxonomy migrations 007/013/019 already give
// every track. A track with no category (shouldn't happen after migration
// 019 backfilled the nine tracks that predated the taxonomy, but the field
// is nullable) lands in "Other" instead of silently disappearing.
function groupByCategory(tracks: Track[]): Section[] {
  const byCategory = new Map<string, { title: string; sortOrder: number; data: Track[] }>();
  const other: Track[] = [];
  for (const track of tracks) {
    if (!track.category_id || !track.category_name) {
      other.push(track);
      continue;
    }
    const group = byCategory.get(track.category_id) ?? {
      title: track.category_name,
      sortOrder: track.category_sort_order ?? 999,
      data: [] as Track[],
    };
    group.data.push(track);
    byCategory.set(track.category_id, group);
  }
  const sections: Section[] = Array.from(byCategory.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({ title: g.title, data: g.data.sort((a, b) => a.title.localeCompare(b.title)) }));
  if (other.length) sections.push({ title: "Other", data: other });
  return sections;
}

// Explore is the catalog-browsing surface Home used to be before the
// catalog grew to 67+ tracks -- search, category filter, freshness filter,
// all courses grouped by category rather than one flat wall of cards.
export default function Explore() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessFilter>("all");

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const toggleFavorite = useCallback((track: Track) => {
    const next = !track.is_favorite;
    setTracks((prev) => prev?.map((t) => (t.id === track.id ? { ...t, is_favorite: next } : t)) ?? prev);
    api.patch(`/api/courses/${track.id}/favorite`, { favorite: next }).catch(() => {
      setTracks((prev) => prev?.map((t) => (t.id === track.id ? { ...t, is_favorite: !next } : t)) ?? prev);
    });
  }, []);

  const categories: CategoryOption[] = useMemo(() => {
    if (!tracks) return [];
    const bySlug = new Map<string, CategoryOption>();
    for (const t of tracks) {
      if (!t.category_slug || !t.category_name) continue;
      if (!bySlug.has(t.category_slug)) {
        bySlug.set(t.category_slug, {
          slug: t.category_slug,
          name: t.category_name,
          sortOrder: t.category_sort_order ?? 999,
        });
      }
    }
    return Array.from(bySlug.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [tracks]);

  const filtered = useMemo(() => {
    if (!tracks) return [];
    const q = query.trim().toLowerCase();
    return tracks.filter((t) => {
      if (categorySlug && t.category_slug !== categorySlug) return false;
      if (!matchesFreshnessFilter(t, freshnessFilter)) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tracks, query, categorySlug, freshnessFilter]);

  const sections = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Explore" }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: 4 }}>
            {error ? <ErrorBanner message={error} /> : null}
            {!tracks && !error ? <Loading label="Loading courses..." /> : null}

            <TextField label="Search" placeholder="Course name or code" value={query} onChangeText={setQuery} icon="search" />

            {categories.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <Chip label="All" active={!categorySlug} onPress={() => setCategorySlug(null)} />
                {categories.map((c) => (
                  <Chip
                    key={c.slug}
                    label={c.name}
                    active={categorySlug === c.slug}
                    onPress={() => setCategorySlug(categorySlug === c.slug ? null : c.slug)}
                  />
                ))}
              </View>
            ) : null}

            {tracks && tracks.length ? (
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Chip label="All" active={freshnessFilter === "all"} onPress={() => setFreshnessFilter("all")} />
                <Chip
                  label="Verified"
                  active={freshnessFilter === "current"}
                  onPress={() => setFreshnessFilter("current")}
                />
                <Chip
                  label="Unverified"
                  active={freshnessFilter === "needs_attention"}
                  onPress={() => setFreshnessFilter("needs_attention")}
                />
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => <SectionHeader label={section.title} />}
        renderItem={({ item }) => (
          <CourseCard
            track={item}
            onPress={() => router.push(`/course/${item.id}`)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={
          tracks && sections.length === 0 ? (
            <Card>
              <EmptyState icon="filter" title="No courses match" message="Try a different search or filter." />
            </Card>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
});

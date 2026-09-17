import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "@/api/client";
import { colors, courseEmoji, fonts, radius, spacing, trackTypeIcon } from "@/lib/theme";
import type { Track, Unit } from "@/types";

// Custom-built rather than a React Navigation Drawer -- this pops out on
// demand from a couple of hub screens (Home, Course dashboard) rather than
// replacing the app's normal Stack navigation, so introducing a whole
// second navigator wasn't worth it. Mirrors the design reference's own
// hand-rolled sidebar: slide-in panel + tap-outside-or-toggle-again to close.
const PANEL_WIDTH = Math.min(320, Dimensions.get("window").width * 0.82);

type IconName = React.ComponentProps<typeof Feather>["name"];

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  // When provided (Home), shows quick-jump Favorites/Recent course lists.
  tracks?: Track[] | null;
  // When provided (Course dashboard), the drawer also shows this course's
  // overview links, units, and commands.
  trackId?: string;
  track?: Track | null;
  units?: Unit[] | null;
}

function byLastStudied(a: Track, b: Track): number {
  const aTime = a.last_studied_at ? new Date(a.last_studied_at).getTime() : 0;
  const bTime = b.last_studied_at ? new Date(b.last_studied_at).getTime() : 0;
  return bTime - aTime;
}

export function Sidebar({ visible, onClose, tracks, trackId, track, units }: SidebarProps) {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const [rendered, setRendered] = useState(visible);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setRendered(true);
    Animated.timing(translateX, {
      toValue: visible ? 0 : -PANEL_WIDTH,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      if (!visible) setRendered(false);
    });
  }, [visible, translateX]);

  function go(path: string, params?: Record<string, string>) {
    onClose();
    if (params) router.push({ pathname: path, params });
    else router.push(path);
  }

  // A course row from Favorites/Recent doesn't jump straight to the
  // dashboard -- it asks whether to resume the next unfinished objective or
  // jump back to the first one, then fetches that course's units on demand
  // (this list only has progress summaries, not unit/objective detail).
  async function enterCourse(t: Track, mode: "continue" | "beginning") {
    setEnteringId(t.id);
    try {
      const res = await api.get<{ track: Track; units: Unit[] }>(`/api/courses/${t.id}`);
      const orderedUnits = res.units;
      const targetUnit =
        mode === "beginning"
          ? orderedUnits[0]
          : orderedUnits.find((u) => (u.mastered_objectives ?? 0) < (u.total_objectives ?? 0)) ?? orderedUnits[0];
      const targetObjective =
        mode === "beginning"
          ? targetUnit?.objectives?.[0]
          : targetUnit?.objectives?.find((o) => o.mastery_status !== "Independent" && o.mastery_status !== "Transfer-ready") ??
            targetUnit?.objectives?.[0];

      if (targetUnit && targetObjective) {
        go(`/course/${t.id}/lesson/${targetObjective.id}`, { unitId: targetUnit.id, objectiveTitle: targetObjective.title });
      } else {
        go(`/course/${t.id}`);
      }
    } catch {
      go(`/course/${t.id}`);
    } finally {
      setEnteringId(null);
    }
  }

  function chooseEntry(t: Track) {
    Alert.alert(t.title, "Pick up where you left off, or start from the beginning?", [
      { text: "Continue where I left off", onPress: () => enterCourse(t, "continue") },
      { text: "Start from the beginning", onPress: () => enterCourse(t, "beginning") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (!rendered) return null;
  const emoji = track ? courseEmoji[track.code] : undefined;

  const favorites = tracks?.filter((t) => t.is_favorite).sort(byLastStudied) ?? [];
  const favoriteIds = new Set(favorites.map((t) => t.id));
  const recent =
    tracks
      ?.filter((t) => !favoriteIds.has(t.id) && t.last_studied_at)
      .sort(byLastStudied)
      .slice(0, 5) ?? [];

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.brandRow} onPress={() => go("/")}>
            <Text style={styles.brandIcon}>{emoji ?? "📚"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{track ? "COURSE" : "PLATFORM"}</Text>
              <Text style={styles.brandTitle} numberOfLines={1}>{track ? track.title : "Ascendra"}</Text>
            </View>
          </Pressable>

          <NavRow icon="home" label="All courses" onPress={() => go("/")} />

          {favorites.length ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.groupLabel}>FAVORITES</Text>
              {favorites.map((t) => (
                <CourseRow key={t.id} track={t} busy={enteringId === t.id} onPress={() => chooseEntry(t)} />
              ))}
            </>
          ) : null}

          {recent.length ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.groupLabel}>RECENT COURSES</Text>
              {recent.map((t) => (
                <CourseRow key={t.id} track={t} busy={enteringId === t.id} onPress={() => chooseEntry(t)} />
              ))}
            </>
          ) : null}

          {track && trackId ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.groupLabel}>OVERVIEW</Text>
              <NavRow icon="grid" label="Dashboard" onPress={() => go(`/course/${trackId}`)} />
              <NavRow
                icon="bar-chart-2"
                label="Progress & mastery"
                onPress={() => go(`/course/${trackId}/progress`, { trackTitle: track.title })}
              />
              <NavRow
                icon="clock"
                label="Answer history"
                onPress={() => go(`/course/${trackId}/history`, { trackTitle: track.title })}
              />
              <NavRow
                icon="message-circle"
                label="Ask the coach"
                onPress={() => go(`/course/${trackId}/chat`, { trackTitle: track.title })}
              />

              {units && units.length ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.groupLabel}>UNITS</Text>
                  {units.map((u) => {
                    const next =
                      u.objectives?.find(
                        (o) => o.mastery_status !== "Independent" && o.mastery_status !== "Transfer-ready"
                      ) ?? u.objectives?.[0];
                    const complete = (u.mastered_objectives ?? 0) >= (u.total_objectives ?? 0) && (u.total_objectives ?? 0) > 0;
                    return (
                      <Pressable
                        key={u.id}
                        style={({ pressed }) => [styles.unitRow, pressed && { opacity: 0.7 }]}
                        onPress={() => next && go(`/course/${trackId}/lesson/${next.id}`, { unitId: u.id, objectiveTitle: next.title })}
                      >
                        <Text style={styles.unitLabel} numberOfLines={1}>{u.title}</Text>
                        {complete ? <Feather name="check-circle" size={14} color={colors.good} /> : null}
                      </Pressable>
                    );
                  })}
                </>
              ) : null}

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>COMMANDS</Text>
              <NavRow
                icon="layers"
                label="PBQ / scenario drill"
                onPress={() => go(`/course/${trackId}/pbq`, { trackTitle: track.title })}
              />
            </>
          ) : null}

          <View style={styles.divider} />
          <NavRow icon="user" label="Account" onPress={() => go("/account")} />
          <NavRow icon="settings" label="Settings" onPress={() => go("/settings")} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function NavRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <Feather name={icon} size={16} color={colors.text} />
      <Text style={styles.navLabel}>{label}</Text>
    </Pressable>
  );
}

function CourseRow({ track, busy, onPress }: { track: Track; busy: boolean; onPress: () => void }) {
  const emoji = courseEmoji[track.code];
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]} onPress={onPress} disabled={busy}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : emoji ? (
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      ) : (
        <Feather name={(trackTypeIcon[track.track_type] ?? "book") as IconName} size={16} color={colors.accent} />
      )}
      <Text style={styles.navLabel} numberOfLines={1}>{track.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.cardAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  content: { padding: spacing.md, paddingTop: 56, gap: 2, paddingBottom: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, paddingBottom: spacing.md },
  brandIcon: { fontSize: 28 },
  kicker: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1, color: colors.mutedDim },
  brandTitle: { fontFamily: fonts.displaySemiBold, fontSize: 17, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  groupLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.mutedDim,
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  navLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, flex: 1 },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  unitLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.text, flex: 1 },
});

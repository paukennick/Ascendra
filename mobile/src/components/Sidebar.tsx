import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SheetModal } from "@/components/SheetModal";
import { useNavigation, usePathname, useRootNavigationState, useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { isReducedMotion } from "@/lib/useReducedMotion";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { ChoiceSheet } from "@/components/ui";
import { appStackPaths, planNavigation, routePath } from "@/lib/navPlan";
import {
  ariaCurrent,
  courseGroups,
  courseMatch,
  navMatch,
  NAV_EXPLORE,
  NAV_REVIEW,
  NAV_SETTINGS,
  SIDEBAR_FOOTER,
  SIDEBAR_PRIMARY,
  type NavItem,
} from "@/lib/sidebarNav";
import { onCoursesChanged, shouldRefreshCourses } from "@/lib/courseEvents";
import { SIDEBAR_WIDTH } from "@/lib/webColumn";
import { colors, fonts, getCourseIcon, radius, spacing } from "@/lib/theme";
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

// REQ-131 / REQ-328: how both menus navigate. See src/lib/navPlan.ts: the
// current screen is skipped, a top-level destination already in the stack is
// popped back to, anything else pushes. `stackPaths` lists the signed-in
// stack from the bottom up to the screen showing.
function useMenuGo(stackPaths: () => string[]) {
  const router = useRouter();
  const pathname = usePathname();
  return (path: string, params?: Record<string, string>) => {
    const mode = planNavigation(pathname, path, !!params, stackPaths());
    if (mode === "skip") return;
    const href = params ? { pathname: path, params } : path;
    if (mode === "dismissTo") router.dismissTo(href);
    else router.push(href);
  };
}

export function Sidebar({ visible, onClose, tracks, trackId, track, units }: SidebarProps) {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const [rendered, setRendered] = useState(visible);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [choiceTrack, setChoiceTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (visible) setRendered(true);
    Animated.timing(translateX, {
      toValue: visible ? 0 : -PANEL_WIDTH,
      // REQ-113 (L1): no slide under the system's reduced-motion setting.
      duration: isReducedMotion() ? 0 : 180,
      useNativeDriver: true,
    }).start(() => {
      if (!visible) setRendered(false);
    });
  }, [visible, translateX]);

  // REQ-131: this used to push every time, so choosing the screen you were
  // already on stacked a copy of it, and Home/Account/Settings/Support/a
  // course dashboard piled up on each visit. See src/lib/navPlan.ts:
  // the current screen is skipped, a top-level destination already in the
  // stack is popped back to, anything else pushes. Both support entries
  // carry an explicit kind, so going from one support form to the other is
  // never "the same screen, nothing to do" (FAIL-064).
  // Routes from the bottom of this stack up to the one showing the sidebar.
  const menuGo = useMenuGo(() => {
    const state = navigation.getState();
    return (state?.routes ?? [])
      .slice(0, (state?.index ?? 0) + 1)
      .map((r) => routePath(r.name, r.params as Record<string, unknown> | undefined))
      .filter((p): p is string => p !== null);
  });
  function go(path: string, params?: Record<string, string>) {
    onClose();
    menuGo(path, params);
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
    setChoiceTrack(t);
  }

  if (!rendered) return null;
  const emoji = track ? getCourseIcon(track).emoji : undefined;

  const { favorites, recent } = courseGroups(tracks);

  return (
    <>
    <SheetModal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" />
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable
            style={styles.brandRow}
            onPress={() => go("/")}
            accessibilityRole="button"
            accessibilityLabel={track ? `${track.title}. Go to Home` : "Ascendra. Go to Home"}
          >
            <Text style={styles.brandIcon}>{emoji ?? "📚"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{track ? "COURSE" : "PLATFORM"}</Text>
              <Text style={styles.brandTitle} numberOfLines={1}>{track ? track.title : "Ascendra"}</Text>
            </View>
          </Pressable>

          <NavRow icon={NAV_EXPLORE.icon} label={NAV_EXPLORE.menuLabel ?? NAV_EXPLORE.label} onPress={() => go(NAV_EXPLORE.path)} />
          {/* REQ-113 (Audit 3 mobile H5): the daily spaced review was reachable
              only from the study plan and the course panel. */}
          <NavRow icon={NAV_REVIEW.icon} label={NAV_REVIEW.label} onPress={() => go(NAV_REVIEW.path)} />

          {tracks ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.groupLabel}>FAVORITES</Text>
              {favorites.length ? (
                favorites.map((t) => (
                  <CourseRow key={t.id} track={t} busy={enteringId === t.id} onPress={() => chooseEntry(t)} />
                ))
              ) : (
                <Text style={styles.emptyHint}>Tap the star on a course to pin it here.</Text>
              )}
            </>
          ) : null}

          {tracks ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.groupLabel}>RECENT COURSES</Text>
              {recent.length ? (
                recent.map((t) => (
                  <CourseRow key={t.id} track={t} busy={enteringId === t.id} onPress={() => chooseEntry(t)} />
                ))
              ) : (
                <Text style={styles.emptyHint}>Courses you study will show up here.</Text>
              )}
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
                        accessibilityRole="button"
                        accessibilityLabel={`${u.title}${complete ? ", complete" : ""}`}
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
          <NavRow icon={NAV_SETTINGS.icon} label={NAV_SETTINGS.label} onPress={() => go(NAV_SETTINGS.path)} />
          <View style={styles.divider} />
          <NavRow icon="life-buoy" label="Submit a ticket" onPress={() => go("/support", { kind: "ticket" })} />
          <NavRow
            icon="plus-circle"
            label="Request a course"
            onPress={() => go("/support", { kind: "course_request" })}
          />
          <NavRow icon="info" label="About" onPress={() => go("/about")} />
          <NavRow icon="help-circle" label="FAQ" onPress={() => go("/faq")} />
          <NavRow icon="alert-circle" label="Disclaimer" onPress={() => go("/disclaimer")} />
          <View style={styles.divider} />
          <NavRow
            icon="log-out"
            label="Sign out"
            onPress={() => {
              onClose();
              logout();
            }}
          />
        </ScrollView>
      </Animated.View>
    </SheetModal>
    <ChoiceSheet
      visible={!!choiceTrack}
      title={choiceTrack?.title ?? ""}
      message="Pick up where you left off, or start from the beginning?"
      onCancel={() => setChoiceTrack(null)}
      options={
        choiceTrack
          ? [
              { label: "Continue where I left off", onPress: () => enterCourse(choiceTrack, "continue") },
              { label: "Start from the beginning", onPress: () => enterCourse(choiceTrack, "beginning") },
              { label: "Cancel", onPress: () => {} },
            ]
          : []
      }
    />
    </>
  );
}

// REQ-328 (desktop web step 3): the persistent sidebar on web windows wider
// than 900px, in place of the menu button on Home and the course page. It
// sits beside the signed-in stack (app/(app)/_layout.tsx), so it stays put
// while screens change. Same destinations as the slide-in menu
// (src/lib/sidebarNav.ts) and the same navigation rules (useMenuGo).
//
// `hidden`: on sims, exams, labs, the PBQ simulator and the first-run screens
// it is hidden (kept mounted, so its course list survives) and those screens
// keep the whole window.
export const APP_CONTENT_ID = "app-content";
// data-skip-link on the web (react-native-web's dataSet; not in RN's types).
const SKIP_LINK_PROPS: object = { dataSet: { skipLink: "" } };

export function DesktopSidebar({ hidden }: { hidden: boolean }) {
  const pathname = usePathname();
  const rootState = useRootNavigationState();
  const rootRef = useRef(rootState);
  rootRef.current = rootState;
  const go = useMenuGo(() => appStackPaths(rootRef.current));
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const loadedAt = useRef<number | null>(null);

  const load = useCallback(() => {
    loadedAt.current = Date.now();
    api
      .get<{ tracks: Track[] }>("/api/courses")
      .then((res) => setTracks(res.tracks))
      // Keeps the last list; the sidebar never shows an error of its own.
      .catch(() => undefined);
  }, []);

  // A course starred, unstarred or opened anywhere: load again now.
  useEffect(() => onCoursesChanged(load), [load]);
  // Otherwise again on a screen change, at most every 10 seconds.
  useEffect(() => {
    if (!hidden && shouldRefreshCourses(loadedAt.current, Date.now())) load();
  }, [pathname, hidden, load]);

  const { favorites, recent } = courseGroups(tracks);

  function skipToContent() {
    if (typeof document === "undefined") return;
    document.getElementById(APP_CONTENT_ID)?.focus();
  }

  return (
    <View role="navigation" aria-label="Main" style={[styles.pane, hidden && styles.paneHidden]}>
      {/* Keyboard users can pass the menu; hidden until it has focus (desktopWebCss). */}
      <Pressable role="link" aria-label="Skip to content" onPress={skipToContent} {...SKIP_LINK_PROPS} style={styles.skipLink}>
        <Text style={styles.paneLabel}>Skip to content</Text>
      </Pressable>
      <Text style={styles.paneBrand}>Ascendra</Text>
      <ScrollView style={styles.paneScroll} contentContainerStyle={styles.paneList} showsVerticalScrollIndicator={false}>
        {SIDEBAR_PRIMARY.map((item) => (
          <PaneRow key={item.key} item={item} current={navMatch(pathname, item)} onPress={() => go(item.path)} />
        ))}
        {tracks ? (
          <>
            <Text style={styles.paneGroup}>RECENT</Text>
            {recent.length ? (
              recent.map((t) => (
                <PaneCourseRow key={t.id} track={t} current={courseMatch(pathname, t.id)} onPress={() => go(`/course/${t.id}`)} />
              ))
            ) : (
              <Text style={styles.paneHint}>Courses you study will show up here.</Text>
            )}
            <Text style={styles.paneGroup}>FAVORITES</Text>
            {favorites.length ? (
              favorites.map((t) => (
                <PaneCourseRow key={t.id} track={t} current={courseMatch(pathname, t.id)} onPress={() => go(`/course/${t.id}`)} />
              ))
            ) : (
              <Text style={styles.paneHint}>Star a course to pin it here.</Text>
            )}
          </>
        ) : null}
      </ScrollView>
      <View style={styles.paneFooter}>
        {SIDEBAR_FOOTER.map((item) => (
          <PaneRow key={item.key} item={item} current={navMatch(pathname, item)} onPress={() => go(item.path)} />
        ))}
      </View>
    </View>
  );
}

function PaneRow({ item, current, onPress }: { item: NavItem; current: "page" | "section" | null; onPress: () => void }) {
  const on = current !== null;
  return (
    <Pressable role="link" aria-label={item.label} aria-current={ariaCurrent(current)} onPress={onPress} style={[styles.paneRow, on && styles.paneRowOn]}>
      <Feather name={item.icon} size={16} color={on ? colors.link : colors.muted} />
      <Text style={[styles.paneLabel, on && styles.paneLabelOn]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function PaneCourseRow({ track, current, onPress }: { track: Track; current: "page" | "section" | null; onPress: () => void }) {
  const on = current !== null;
  const { emoji, icon, iconColor } = getCourseIcon(track);
  return (
    <Pressable role="link" aria-label={track.title} aria-current={ariaCurrent(current)} onPress={onPress} style={[styles.paneRow, on && styles.paneRowOn]}>
      {emoji ? <Text style={{ fontSize: 15 }}>{emoji}</Text> : <Feather name={icon as IconName} size={16} color={iconColor} />}
      <Text style={[styles.paneLabel, on && styles.paneLabelOn]} numberOfLines={2}>
        {track.title}
      </Text>
    </Pressable>
  );
}

function NavRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={16} color={colors.text} />
      <Text style={styles.navLabel}>{label}</Text>
    </Pressable>
  );
}

function CourseRow({ track, busy, onPress }: { track: Track; busy: boolean; onPress: () => void }) {
  const { emoji, icon, iconColor } = getCourseIcon(track);
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={track.title}
      accessibilityState={{ disabled: busy, busy }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : emoji ? (
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      ) : (
        <Feather name={icon as IconName} size={16} color={iconColor} />
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
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: 12,
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
    minHeight: 48,
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
    minHeight: 48,
    borderRadius: radius.sm,
  },
  unitLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.text, flex: 1 },
  // REQ-328: the persistent sidebar.
  pane: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.bgAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  paneHidden: { display: "none" },
  skipLink: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.accentDim },
  paneBrand: { fontFamily: fonts.displaySemiBold, fontSize: 20, color: colors.text, paddingHorizontal: 12, paddingTop: 2, paddingBottom: spacing.lg },
  paneScroll: { flex: 1 },
  paneList: { gap: 2, paddingBottom: spacing.md },
  paneGroup: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.mutedDim,
    paddingHorizontal: 12,
    paddingTop: spacing.lg,
    paddingBottom: 6,
  },
  paneHint: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedDim, paddingHorizontal: 12, paddingBottom: 4 },
  paneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: radius.sm,
  },
  paneRowOn: { backgroundColor: colors.accentDim },
  paneLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flex: 1 },
  paneLabelOn: { fontFamily: fonts.bodySemiBold, color: colors.link },
  paneFooter: { gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
});

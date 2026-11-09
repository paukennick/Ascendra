import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { CourseReadiness, Track, Unit } from "@/types";
import {
  Badge,
  Button,
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
  Screen,
  SectionHeader,
} from "@/components/ui";
import { Sidebar } from "@/components/Sidebar";
import { CoursePlanPanel } from "@/components/CoursePlanPanel";
import { colors, fonts, masteryColor, spacing } from "@/lib/theme";
import { readinessSummary } from "@/lib/progress";
import { nextCourseStep } from "@/lib/nextStep";
import { vendorDisclaimer } from "@/lib/vendor";
import { COURSE_NO_UNITS } from "@/lib/emptyStates";
import { ExamOutcomePrompt } from "@/components/ExamOutcomePrompt";
import { labCountsByUnit, type LabListItem } from "@/lib/labs";
import { readinessLockedLine } from "@/lib/billing";

const QUICK_ACTIONS: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; path: string }[] = [
  { icon: "message-circle", label: "Ask the coach", path: "chat" },
  { icon: "bar-chart-2", label: "Mastery", path: "progress" },
  { icon: "clock", label: "History", path: "history" },
  { icon: "layers", label: "PBQ sim", path: "pbq" },
  // REQ-111: comparison cards for look-alike concepts.
  { icon: "columns", label: "Compare", path: "compare" },
];

export default function CourseDashboard() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [readinessData, setReadinessData] = useState<CourseReadiness | null>(null);
  // REQ-122: the server sends this only while paid plans are on and the plan
  // doesn't include the readiness score; one quiet line, not a lock.
  const [readinessLocked, setReadinessLocked] = useState<string | null>(null);
  // REQ-119 (M6): the exam's provider, for the "not affiliated" line.
  const [exam, setExam] = useState<{ providerName?: string | null; credentialName?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // REQ-123: verifiable labs per unit; empty (and nothing shown) for a
  // course without labs or if the request fails.
  const [labCounts, setLabCounts] = useState<Record<string, number>>({});
  // REQ-075: which units are expanded to show their objective list. Nothing
  // on this screen let a learner pick a specific objective before -- only
  // "continue" into whatever came next.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpanded(unitId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  // Marks this as a "studied" course once per visit (not per refocus --
  // that's what drives Home's "Continue studying" hero and the sidebar's
  // Recent Courses; nothing was calling this before, so neither could ever
  // populate). Fire-and-forget: this is background bookkeeping, not
  // something the user needs to see succeed or fail.
  useEffect(() => {
    api.post("/api/sessions", { trackId }).catch(() => undefined);
  }, [trackId]);

  const toggleFavorite = useCallback(() => {
    setTrack((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : prev));
    api.patch(`/api/courses/${trackId}/favorite`, { favorite: !track?.is_favorite }).catch(() => {
      setTrack((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : prev));
    });
  }, [trackId, track?.is_favorite]);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ track: Track; units: Unit[]; readiness?: CourseReadiness; readinessLocked?: { message: string } | null; exam?: { providerName?: string | null; credentialName?: string | null } | null }>(
        `/api/courses/${trackId}`
      )
      .then((res) => {
        setTrack(res.track);
        setUnits(res.units);
        setReadinessData(res.readiness ?? null);
        setReadinessLocked(res.readinessLocked ? readinessLockedLine(res.readinessLocked) : null); // REQ-122 / REQ-124
        setExam(res.exam ?? null);
      })
      .catch((err) => setError(err.message));
    // REQ-165: no per-course disclaimer any more. The one study notice is
    // asked at launch (app/(app)/notice.tsx) and the server requires it
    // before teaching a clinical course.
    api
      .get<{ labs: LabListItem[] }>(`/api/labs?trackId=${encodeURIComponent(trackId)}`)
      .then((res) => setLabCounts(labCountsByUnit(res.labs)))
      .catch(() => setLabCounts({}));
  }, [trackId]);
  const totalLabs = Object.values(labCounts).reduce((a, b) => a + b, 0);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // REQ-119 (Audit 3 product M4): "Start course" with nothing started,
  // "Continue" to the next right objective, "Review" when all are done
  // (src/lib/nextStep.ts). It used to say "Continue studying" from zero and
  // did nothing when the unit it picked listed no objectives.
  const step = nextCourseStep(units);
  const vendorLine = track ? vendorDisclaimer(exam, track.track_type) : null;

  // REQ-100: readiness from weighted accuracy across every question type,
  // rolled up by the exam blueprint, with coverage shown apart from accuracy
  // (src/lib/progress.ts, backend/lib/readiness.ts).
  const readiness = readinessSummary(readinessData);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: track?.title ?? "Course",
          headerLeft: () => (
            <View style={{ flexDirection: "row" }}>
              <IconButton icon="chevron-left" accessibilityLabel="Back" onPress={() => router.back()} size={34} />
              <IconButton icon="menu" accessibilityLabel="Open course menu" onPress={() => setSidebarOpen(true)} size={34} />
            </View>
          ),
        }}
      />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} trackId={trackId} track={track} units={units} />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!track && !error ? <Loading label="Loading course..." /> : null}

      {track ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <H1>{track.title}</H1>
              <Muted>{track.description}</Muted>
            </View>
            <FavoriteButton active={!!track.is_favorite} onPress={toggleFavorite} />
          </View>

          <Card elevated style={{ borderColor: colors.accent }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Muted>Overall progress</Muted>
              <Muted style={{ color: colors.link, fontFamily: fonts.bodyBold }}>{track.percent_progress ?? 0}%</Muted>
            </View>
            <ProgressBar percent={track.percent_progress ?? 0} />
            <Muted style={{ fontSize: 12 }}>
              {track.mastered_objectives ?? 0}/{track.total_objectives ?? 0} objectives mastered ({track.percent_complete ?? 0}%)
            </Muted>
            {readiness ? (
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Muted style={{ fontSize: 12, color: colors.text, fontFamily: fonts.bodyBold }}>{readiness.headline}</Muted>
                  {readiness.percent != null ? (
                    <Muted style={{ fontSize: 12, color: colors.text, fontFamily: fonts.bodyBold }}>{readiness.percent}%</Muted>
                  ) : null}
                </View>
                {readiness.lines.map((line) => (
                  <Muted key={line} style={{ fontSize: 12 }}>
                    {line}
                  </Muted>
                ))}
              </View>
            ) : readinessLocked ? (
              <Muted style={{ fontSize: 12 }}>{readinessLocked}</Muted>
            ) : null}

            {step ? (
              <Button
                label={step.label}
                accessibilityLabel={step.a11y}
                icon={step.kind === "review" ? "rotate-cw" : "play"}
                onPress={() => {
                  if (step.kind === "review") router.push("/review");
                  else
                    router.push({
                      pathname: `/course/${trackId}/lesson/${step.objectiveId}`,
                      params: { unitId: step.unitId, objectiveTitle: step.objectiveTitle },
                    });
                }}
              />
            ) : null}

            {/* REQ-109: timed sprints and mock exams. */}
            <Button
              label="Practice exam"
              accessibilityLabel="Practice exam: timed sprint or mock exam"
              icon="clock"
              variant="ghost"
              onPress={() =>
                router.push({ pathname: `/course/${trackId}/exam`, params: { trackTitle: track.title } })
              }
            />

            {/* REQ-123: hands-on labs, only on courses that have them. */}
            {totalLabs > 0 ? (
              <Button
                label={`Hands-on labs (${totalLabs})`}
                accessibilityLabel={`Hands-on labs: ${totalLabs} build and case labs`}
                icon="tool"
                variant="ghost"
                onPress={() => router.push({ pathname: `/course/${trackId}/labs`, params: { trackTitle: track.title } })}
              />
            ) : null}

            {/* REQ-113 (Audit 3 mobile H3, H4): five fixed 72 dp items needed
                360 dp but a 360 dp phone has about 294 here, so "Compare" sat
                mostly off-screen. Each item now takes a fifth of the row
                (at least 56 dp, so five fit in 294 dp; narrower rows wrap
                instead of overflowing), and the whole item -- icon and caption -- is one labelled
                button of at least 48 dp. */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm, rowGap: spacing.sm }}>
              {QUICK_ACTIONS.map((a) => (
                <Pressable
                  key={a.path}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  onPress={() =>
                    router.push({
                      pathname: `/course/${trackId}/${a.path}`,
                      params: { trackTitle: track.title },
                    })
                  }
                  style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.quickIcon}>
                    <Feather name={a.icon} size={18} color={colors.text} />
                  </View>
                  <Muted style={{ textAlign: "center", fontSize: 12, lineHeight: 15 }}>{a.label}</Muted>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* REQ-119: "How did the exam go?" once the plan's exam date has passed. */}
          <ExamOutcomePrompt trackId={trackId} trackTitle={track.title} />

          {/* REQ-110: placement offer, session choice, plan and kept summary. */}
          <CoursePlanPanel trackId={trackId} trackTitle={track.title} />

          <SectionHeader label="Units" />
          {units?.map((u) => {
            const complete = (u.mastered_objectives ?? 0) >= (u.total_objectives ?? 0) && (u.total_objectives ?? 0) > 0;
            const unitPercent = u.total_objectives
              ? Math.round(((u.mastered_objectives ?? 0) / u.total_objectives) * 100)
              : 0;
            const isOpen = expanded.has(u.id);
            return (
              <Card key={u.id}>
                <Pressable
                  onPress={() => toggleExpanded(u.id)}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", minHeight: 48 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${u.title}. ${u.mastered_objectives ?? 0} of ${u.total_objectives ?? 0} objectives at Independent or above${(u.needs_review_objectives ?? 0) > 0 ? `. ${u.needs_review_objectives} to review` : ""}`}
                  accessibilityHint={isOpen ? "Hides the objectives" : "Shows the objectives"}
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <H2>{u.title}</H2>
                    <Muted>
                      {u.range_label ?? (u.weight != null ? `${u.weight}% of exam` : "")}
                      {"  "}· {u.mastered_objectives ?? 0}/{u.total_objectives ?? 0} objectives at Independent+
                    </Muted>
                  </View>
                  {(u.needs_review_objectives ?? 0) > 0 ? (
                    <Badge label={`${u.needs_review_objectives} to review`} color={colors.bad} icon="alert-triangle" />
                  ) : null}
                  <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.mutedDim}
                    style={{ marginLeft: 6, marginTop: 2 }}
                  />
                </Pressable>
                <ProgressBar percent={unitPercent} />
                {isOpen ? (
                  <View style={{ gap: 2, marginTop: 2 }}>
                    {u.objectives?.map((o, idx) => {
                      const status = o.mastery_status ?? "Not started";
                      return (
                        <Pressable
                          key={o.id}
                          onPress={() =>
                            router.push({
                              pathname: `/course/${trackId}/lesson/${o.id}`,
                              params: { unitId: u.id, objectiveTitle: o.title },
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`${idx + 1}. ${o.title}. ${status}`}
                          style={({ pressed }) => [styles.objectiveRow, pressed && { opacity: 0.7 }]}
                        >
                          <View style={[styles.statusDot, { backgroundColor: masteryColor[status] ?? colors.mutedDim }]} />
                          <Muted style={{ flex: 1, color: colors.text }} numberOfLines={2}>
                            {idx + 1}. {o.title}
                          </Muted>
                          <Feather name="chevron-right" size={16} color={colors.mutedDim} />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                  {u.objectives?.slice(0, 1).map((o) => (
                    <Button
                      key={o.id}
                      label={complete ? "Review unit" : "Continue unit"}
                      size="sm"
                      fullWidth={false}
                      icon={complete ? "rotate-cw" : "arrow-right"}
                      onPress={() => {
                        const next = u.objectives?.find((ob) => ob.mastery_status !== "Independent" && ob.mastery_status !== "Transfer-ready") ?? o;
                        router.push({
                          pathname: `/course/${trackId}/lesson/${next.id}`,
                          params: { unitId: u.id, objectiveTitle: next.title },
                        });
                      }}
                    />
                  ))}
                  {u.weight != null || u.range_label == null ? (
                    <Button
                      label="PBQ from this unit"
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      icon="layers"
                      onPress={() =>
                        router.push({
                          pathname: `/course/${trackId}/pbq`,
                          params: { unitId: u.id, trackTitle: track.title },
                        })
                      }
                    />
                  ) : null}
                  {labCounts[u.id] ? (
                    <Button
                      label={`Labs (${labCounts[u.id]})`}
                      accessibilityLabel={`${labCounts[u.id]} hands-on labs in ${u.title}`}
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      icon="tool"
                      onPress={() =>
                        router.push({ pathname: `/course/${trackId}/labs`, params: { unitId: u.id, trackTitle: track.title } })
                      }
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}

          {units && units.length === 0 ? (
            <Card>
              <EmptyState
                icon="folder"
                title={COURSE_NO_UNITS.title}
                message={COURSE_NO_UNITS.message}
                action={{
                  label: COURSE_NO_UNITS.action!.label,
                  icon: "life-buoy",
                  onPress: () => router.push({ pathname: "/support", params: { kind: "ticket" } }),
                }}
              />
            </Card>
          ) : null}

          <Button
            label="I took the exam"
            accessibilityLabel="I took the exam: record how it went"
            variant="link"
            fullWidth={false}
            onPress={() => router.push({ pathname: `/course/${trackId}/outcome`, params: { trackTitle: track.title } })}
          />

          {/* REQ-119 (M6): names this exam's owner, not only CompTIA. */}
          {vendorLine ? (
            <Muted style={{ fontSize: 12, marginTop: spacing.sm }}>
              {vendorLine}
            </Muted>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = {
  objectiveRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 8,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  quickAction: {
    flexBasis: "20%" as const,
    flexGrow: 1,
    minWidth: 56,
    minHeight: 48,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 2,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
};

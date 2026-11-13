// REQ-252 (levels phase 1A): the course page's part of learner levels.
// REQ-255 (Nick, 2026-11-12): the goal is asked where the course is picked
// (the welcome steps, the "Start course" sheet, a one-tap card in the first
// lesson), so this panel is a change point, not the main ask: it shows the
// current answer with "Change" (the course's level settings), the level chip,
// and any automatic level change not yet acknowledged, with Undo. It never
// prompts, whether the goal was answered, skipped or dismissed elsewhere or
// not asked yet.
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { GoalSummaryRow, LevelChip, LevelNotice } from "@/components/LearnerLevel";
import { spacing } from "@/lib/theme";
import { parseLevelState, type LevelState } from "@/lib/learnerLevel";

// The course's level state, loaded on focus and shared by the panel and the
// course page's "Start course" (which opens the goal sheet on a course never
// asked about). A failed load is null: the course page works without it, and
// the lesson falls back to today's standard flow.
export function useCourseLevel(trackId: string) {
  const [state, setState] = useState<LevelState | null>(null);
  const load = useCallback(() => {
    api
      .get<unknown>(`/api/courses/${trackId}/level`)
      .then((res) => setState(parseLevelState(res)))
      .catch(() => setState(null));
  }, [trackId]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  return { state, setState, reload: load };
}

export function CourseLevelPanel({
  trackId,
  state,
  setState,
}: {
  trackId: string;
  state: LevelState | null;
  setState: (s: LevelState | null) => void;
}) {
  const router = useRouter();
  const openSettings = () => router.push({ pathname: `/course/${trackId}/level` });
  async function act(changeId: string, action: "seen" | "undo") {
    setState(parseLevelState(await api.post<unknown>(`/api/courses/${trackId}/level/changes/${changeId}`, { action })));
  }

  if (!state) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <GoalSummaryRow state={state} onChange={openSettings} />
      <LevelChip level={state.courseLevel ?? state.suggestion.level} onPress={openSettings} />
      {state.notices.map((n) => (
        <LevelNotice key={n.id} change={n} flow={state.levelFlow} onSeen={() => act(n.id, "seen")} onUndo={() => act(n.id, "undo")} />
      ))}
    </View>
  );
}

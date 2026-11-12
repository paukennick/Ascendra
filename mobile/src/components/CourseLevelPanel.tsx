// REQ-252 (levels phase 1A): the course page's part of learner levels. The
// first time a learner opens a course it asks the per-course goal question
// and their level on one screen (skippable); after that it is the level chip,
// plus any automatic level change not yet acknowledged, with Undo. Every
// course has this; the lesson only changes on courses with the level-aware
// flow switched on (Python and JavaScript in phase 1).
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { Card, ErrorBanner, H2, Muted } from "@/components/ui";
import { GoalAndLevelForm, LevelChip, LevelNotice } from "@/components/LearnerLevel";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";
import { parseLevelState, type CourseGoal, type Level, type LevelState } from "@/lib/learnerLevel";

export function CourseLevelPanel({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LevelState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A failed load shows nothing: the course page works without it, and the
  // lesson falls back to today's standard flow.
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

  async function put(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      setState(parseLevelState(await api.put<unknown>(`/api/courses/${trackId}/level`, body)));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }
  async function act(changeId: string, action: "seen" | "undo") {
    setState(parseLevelState(await api.post<unknown>(`/api/courses/${trackId}/level/changes/${changeId}`, { action })));
  }

  if (!state) return null;
  if (!state.answered) {
    return (
      <Card elevated>
        <H2>Before you start</H2>
        <Muted style={{ fontSize: 13 }}>Two quick questions so lessons start in the right place. You can change both later.</Muted>
        <GoalAndLevelForm
          state={state}
          saving={saving}
          submitLabel="Start"
          onSave={(goal: CourseGoal | null, level: Level) => put({ goal, level })}
          onSkip={() => put({ skip: true })}
        />
        {error ? <ErrorBanner message={error} /> : null}
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <LevelChip
        level={state.courseLevel ?? state.suggestion.level}
        onPress={() => router.push({ pathname: `/course/${trackId}/level` })}
      />
      {state.notices.map((n) => (
        <LevelNotice key={n.id} change={n} flow={state.levelFlow} onSeen={() => act(n.id, "seen")} onUndo={() => act(n.id, "undo")} />
      ))}
    </View>
  );
}

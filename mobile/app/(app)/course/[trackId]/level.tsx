import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import { Body, Card, ErrorBanner, H1, H2, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { Choice, GoalAndLevelForm, LevelNotice } from "@/components/LearnerLevel";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";
import { LEVEL_NAMES, LEVELS, parseLevelState, type CourseGoal, type Level, type LevelState } from "@/lib/learnerLevel";

// REQ-252 (levels phase 1A): the course's level settings -- why the learner
// is taking it (the per-course goal question, approved 2026-11-10), their
// level for the whole course, and an optional level for any unit. Opened
// from the level chip in a lesson and from the course page. Nothing here
// changes the solo check or the mastery rules.
export default function CourseLevelScreen() {
  const { trackId, unitId } = useLocalSearchParams<{ trackId: string; unitId?: string }>();
  const [state, setState] = useState<LevelState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<unknown>(`/api/courses/${trackId}/level`)
      .then((res) => {
        const s = parseLevelState(res);
        if (!s) throw new Error("Couldn't read your level settings. Try again.");
        setState(s);
      })
      .catch((err) => setError(friendlyError(err)));
  }, [trackId]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function put(body: Record<string, unknown>, message: string) {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const s = parseLevelState(await api.put<unknown>(`/api/courses/${trackId}/level`, body));
      if (s) setState(s);
      setSaved(message);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }
  async function act(changeId: string, action: "seen" | "undo") {
    const s = parseLevelState(await api.post<unknown>(`/api/courses/${trackId}/level/changes/${changeId}`, { action }));
    if (s) setState(s);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Your level" }} />
      <H1>Your level</H1>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!state && !error ? <Loading label="Loading your level..." /> : null}
      {state ? (
        <>
          {state.notices.map((n) => (
            <LevelNotice key={n.id} change={n} flow={state.levelFlow} onSeen={() => act(n.id, "seen")} onUndo={() => act(n.id, "undo")} />
          ))}
          <Card>
            <H2>This course</H2>
            <GoalAndLevelForm
              key={`${state.goal}-${state.courseLevel}`}
              state={state}
              saving={saving}
              submitLabel="Save"
              onSave={(goal: CourseGoal | null, level: Level) => put({ goal, level }, "Saved.")}
            />
            {saved ? <Muted>{saved}</Muted> : null}
          </Card>
          {state.units.length > 0 ? (
            <>
              <SectionHeader label="By unit" />
              <Muted style={{ fontSize: 12 }}>
                A unit can have its own level -- new in one, experienced in another. Units without one follow the course.
              </Muted>
              {state.units.map((u) => (
                <Card key={u.unitId} style={u.unitId === unitId ? { borderWidth: 1 } : undefined}>
                  <Body>{u.title}</Body>
                  <Muted style={{ fontSize: 12 }}>
                    {u.level
                      ? `${LEVEL_NAMES[u.level]}${u.source === "auto" ? " (moved up from your answers)" : ""}`
                      : `Follows the course (${LEVEL_NAMES[state.courseLevel ?? state.suggestion.level]})`}
                  </Muted>
                  <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel={`Level for ${u.title}`}>
                    <Choice
                      label="Follow the course"
                      selected={u.level === null}
                      onPress={() => put({ unitId: u.unitId, unitLevel: null }, `${u.title} follows the course.`)}
                    />
                    {LEVELS.map((l) => (
                      <Choice
                        key={l}
                        label={LEVEL_NAMES[l]}
                        selected={u.level === l}
                        onPress={() => put({ unitId: u.unitId, unitLevel: l }, `${u.title}: ${LEVEL_NAMES[l]}.`)}
                      />
                    ))}
                  </View>
                </Card>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

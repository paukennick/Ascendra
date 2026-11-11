import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { api } from "@/api/client";
import { useMatureContent } from "@/auth/MatureContentContext";
import { Body, Button, Card, Chip, ErrorBanner, H2, Loading, Muted, TextField } from "@/components/ui";
import { DateField } from "@/components/DatePicker";
import { friendlyError } from "@/lib/errorMessage";
import { pickableCourses } from "@/lib/firstRun";
import {
  addTarget,
  EXPERIENCE_CHOICES,
  GOAL_CHOICES,
  HOURS_CHOICES,
  MAX_TARGETS,
  removeTarget,
  setExamDate,
  USE_CHOICES,
  type IntakeForm as Form,
} from "@/lib/intake";
import { localToday } from "@/lib/studyPlan";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import type { Track } from "@/types";

// REQ-169: the intake questions, shared by the first run (welcome.tsx) and
// Settings > Study profile. Every question is optional. No price or plan
// appears here: the answers only set up the study plan and, with paid plans
// on, a suggestion shown after saving.

export function IntakeFormFields({ value, onChange }: { value: Form; onChange: (f: Form) => void }) {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(value.targets.length === 0);
  // REQ-224: picking a mental health course asks for the 18+ confirmation
  // first; closing the notice leaves the course off the list.
  const mature = useMatureContent();

  const load = () => {
    setLoadError(null);
    api
      .get<{ tracks: Track[] }>("/api/courses")
      .then((r) => setTracks(r.tracks))
      .catch((err) => setLoadError(friendlyError(err)));
  };
  useEffect(load, []);
  const shown = useMemo(() => pickableCourses(tracks ?? [], search, 6), [tracks, search]);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
        <H2>What's your goal?</H2>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {GOAL_CHOICES.map((g) => (
            <Chip key={g.id} label={g.label} active={value.goal === g.id} onPress={() => onChange({ ...value, goal: value.goal === g.id ? null : g.id })} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <H2>Which exams or courses?</H2>
        <Muted>Add up to {MAX_TARGETS}. An exam date paces the course's study plan; no date is fine too.</Muted>
        {value.targets.map((t) => (
          <Card key={t.trackId} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Body style={{ flex: 1, fontFamily: fonts.bodySemiBold }}>{t.title}</Body>
              <Button label="Remove" variant="link" fullWidth={false} onPress={() => onChange(removeTarget(value, t.trackId))} />
            </View>
            <DateField label="Exam date (optional)" value={t.examDate} onChange={(d) => onChange(setExamDate(value, t.trackId, d))} min={localToday()} />
          </Card>
        ))}
        {value.targets.length < MAX_TARGETS && !adding ? (
          <Button label={value.targets.length ? "Add another exam or course" : "Add an exam or course"} variant="ghost" icon="plus" onPress={() => setAdding(true)} />
        ) : null}
        {adding ? (
          <View style={{ gap: spacing.sm }}>
            <TextField label="Search courses" placeholder="Exam, subject or code, e.g. Security+" value={search} onChangeText={setSearch} icon="search" maxLength={100} />
            {loadError ? <ErrorBanner message={loadError} onRetry={load} /> : null}
            {!tracks && !loadError ? <Loading label="Loading courses..." /> : null}
            {shown.items
              .filter((t) => !value.targets.some((x) => x.trackId === t.id))
              .map((t) => (
                <Pressable
                  key={t.id}
                  onPress={async () => {
                    if (!(await mature.ensure(t.category_slug, "intake"))) return;
                    onChange(addTarget(value, t));
                    setSearch("");
                    setAdding(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={mature.needs(t.category_slug) ? `Add ${t.title} (18+ content notice)` : `Add ${t.title}`}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body style={{ fontFamily: fonts.bodySemiBold }}>{t.title}</Body>
                    {t.category_name ? <Muted style={{ fontSize: 13 }}>{t.category_name}</Muted> : null}
                  </View>
                  <Feather name="plus" size={18} color={colors.mutedDim} />
                </Pressable>
              ))}
            {tracks && shown.more > 0 ? <Muted>{shown.more} more. Type to narrow the list.</Muted> : null}
            {value.targets.length ? <Button label="Done adding" variant="link" fullWidth={false} onPress={() => setAdding(false)} /> : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <H2>How much do you already know?</H2>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {EXPERIENCE_CHOICES.map((e) => (
            <Chip
              key={e.id}
              label={e.label}
              active={value.experience === e.id}
              onPress={() => onChange({ ...value, experience: value.experience === e.id ? null : e.id })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <H2>Hours a week for study</H2>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {HOURS_CHOICES.map((h) => (
            <Chip
              key={h}
              label={`${h} hours`}
              active={value.weeklyHours === h}
              onPress={() => onChange({ ...value, weeklyHours: value.weeklyHours === h ? null : h })}
            />
          ))}
        </View>
        {value.weeklyHours ? (
          <Muted>
            Sets the pace for courses that don't have a study plan yet{value.targets.length > 1 ? ", shared evenly" : ""}. Plans you've already set keep their hours.
          </Muted>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <H2>What will you use it for? (optional)</H2>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {USE_CHOICES.map((u) => (
            <Chip key={u.id} label={u.label} active={value.useFor === u.id} onPress={() => onChange({ ...value, useFor: value.useFor === u.id ? null : u.id })} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = {
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
};

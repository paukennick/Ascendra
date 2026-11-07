import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { useOnboarding } from "@/auth/OnboardingContext";
import { Body, Button, Card, ErrorBanner, H1, H2, Loading, Muted, Screen, TextField } from "@/components/ui";
import { DateField } from "@/components/DatePicker";
import { friendlyError } from "@/lib/errorMessage";
import { localToday } from "@/lib/studyPlan";
import { pickableCourses } from "@/lib/firstRun";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import type { Track } from "@/types";
import type { PlanResponse } from "@/types/plan";

// REQ-119 (Audit 3 product M2): first run for a brand-new learner. Three
// short, skippable steps, for any starting point -- complete beginner to
// someone re-sitting an exam:
//   1. what they're working toward (a course, or "just exploring");
//   2. an exam date, if they have one (feeds the study plan);
//   3. an optional quick placement check, or start at the beginning;
// then it lands on a clear first step: the course page, whose main button
// reads "Start course", or the placement check, or Explore.
// "Skip for now" on every step finishes it; it is never shown again.

type Step = "goal" | "date" | "placement";

export default function Welcome() {
  const router = useRouter();
  const { completeFirstRun } = useOnboarding();
  const [step, setStep] = useState<Step>("goal");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState<Track | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const planRequest = useRef<Promise<PlanResponse | null>>(Promise.resolve(null));

  const loadCourses = () => {
    setLoadError(null);
    api
      .get<{ tracks: Track[] }>("/api/courses")
      .then((r) => setTracks(r.tracks))
      .catch((err) => setLoadError(friendlyError(err)));
  };
  useEffect(loadCourses, []);

  const shown = useMemo(() => pickableCourses(tracks ?? [], search), [tracks, search]);

  async function finish(to: "home" | "explore" | "course" | "placement") {
    setBusy(true);
    await completeFirstRun({ trackId: to === "home" || to === "explore" ? goal?.id ?? null : goal!.id });
    setBusy(false);
    if (to === "home") return router.replace("/");
    if (to === "explore") {
      router.replace("/");
      return router.push("/explore");
    }
    router.replace(`/course/${goal!.id}`);
    if (to === "placement") router.push({ pathname: `/course/${goal!.id}/placement`, params: { trackTitle: goal!.title } });
  }

  async function chooseGoal(t: Track) {
    setGoal(t);
    setError(null);
    setStep("date");
    // Placement availability and the plan's current settings; if this fails
    // the date step still works (default hours) and placement is not offered.
    planRequest.current = api
      .get<PlanResponse>(`/api/courses/${t.id}/plan?today=${localToday()}`)
      .catch(() => null);
    setPlan(null);
    planRequest.current.then((p) => setPlan(p));
  }

  async function saveDate(withDate: boolean) {
    setError(null);
    setBusy(true);
    let current = plan ?? (await planRequest.current);
    setBusy(false);
    if (withDate && examDate) {
      setBusy(true);
      try {
        const saved = await api.put<PlanResponse>(`/api/courses/${goal!.id}/plan`, {
          examDate,
          weeklyHours: current?.settings.weeklyHours ?? 5,
          today: localToday(),
        });
        setPlan(saved);
        current = saved;
      } catch (err) {
        setBusy(false);
        return setError(friendlyError(err));
      }
      setBusy(false);
    }
    if (current?.placement.available && current.placement.status !== "done") setStep("placement");
    else await finish("course");
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Muted>
          Step {step === "goal" ? 1 : step === "date" ? 2 : 3} of 3
        </Muted>
        <Button label="Skip for now" variant="link" fullWidth={false} disabled={busy} onPress={() => finish("home")} />
      </View>

      {step === "goal" ? (
        <>
          <H1>Welcome to Ascendra</H1>
          <Body>
            Short lessons, practice that adapts to you, and reviews that bring things back just before you'd forget
            them. Whether you're brand new to a subject or brushing up before a retake, you start where you are.
          </Body>
          <H2 style={{ marginTop: spacing.md }}>What are you working toward?</H2>
          <TextField
            label="Search courses"
            placeholder="Exam, subject or code, e.g. Security+"
            value={search}
            onChangeText={setSearch}
            icon="search"
            maxLength={100}
          />
          {loadError ? <ErrorBanner message={loadError} onRetry={loadCourses} /> : null}
          {!tracks && !loadError ? <Loading label="Loading courses..." /> : null}
          {shown.items.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => chooseGoal(t)}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}${t.category_name ? `, ${t.category_name}` : ""}`}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontFamily: fonts.bodySemiBold }}>{t.title}</Body>
                {t.category_name ? <Muted style={{ fontSize: 13 }}>{t.category_name}</Muted> : null}
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedDim} />
            </Pressable>
          ))}
          {tracks && shown.more > 0 ? <Muted>{shown.more} more. Type to narrow the list.</Muted> : null}
          {tracks && !shown.items.length ? (
            <Muted>Nothing matches "{search.trim()}". Try another word, or explore everything instead.</Muted>
          ) : null}
          <Button label="I'm just exploring" variant="ghost" icon="compass" disabled={busy} onPress={() => finish("explore")} />
        </>
      ) : null}

      {step === "date" && goal ? (
        <>
          <H1>{goal.title}</H1>
          <H2>Do you have an exam date?</H2>
          <Muted>
            If you've booked one, we'll pace your plan to it. No date is fine too; you can add or change it later in
            the course's study plan.
          </Muted>
          {error ? <ErrorBanner message={error} /> : null}
          <DateField label="Exam date (optional)" value={examDate} onChange={setExamDate} min={localToday()} />
          <Button label="Continue" icon="arrow-right" loading={busy} disabled={!examDate} onPress={() => saveDate(true)} />
          <Button label="No date yet" variant="ghost" disabled={busy} onPress={() => saveDate(false)} />
          <Button label="Pick a different course" variant="link" fullWidth={false} onPress={() => setStep("goal")} />
        </>
      ) : null}

      {step === "placement" && goal ? (
        <>
          <H1>Where would you like to start?</H1>
          <Card style={{ gap: spacing.sm }}>
            <H2>Already know some of this?</H2>
            <Muted>
              A quick check of about 10 questions skips you past what you already know. There's no score and no
              wrong answer to worry about; it only decides where you begin.
            </Muted>
            <Button label="Take the quick check" icon="compass" disabled={busy} onPress={() => finish("placement")} />
          </Card>
          <Card style={{ gap: spacing.sm }}>
            <H2>New to it, or want the full course?</H2>
            <Muted>Start at the first lesson. That's exactly what the course is built for.</Muted>
            <Button label="Start from the beginning" variant="ghost" icon="play" disabled={busy} onPress={() => finish("course")} />
          </Card>
        </>
      ) : null}
    </Screen>
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

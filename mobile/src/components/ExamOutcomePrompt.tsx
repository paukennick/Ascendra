import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { Button, Card, H2, Muted } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { localToday } from "@/lib/studyPlan";
import { longDate } from "@/lib/datePicker";

// REQ-119: once the study plan's exam date has passed and nothing is
// recorded for it, the course asks -- once, gently -- how it went. Hidden
// otherwise, and hidden if the request fails (the course works without it).
export function ExamOutcomePrompt({ trackId, trackTitle }: { trackId: string; trackTitle: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<{ examDate: string | null; ask: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<{ prompt: { examDate: string | null; ask: boolean } | null }>(
          `/api/exam-outcomes?trackId=${encodeURIComponent(trackId)}&today=${localToday()}`
        )
        .then((r) => setPrompt(r.prompt))
        .catch(() => setPrompt(null));
    }, [trackId])
  );

  if (!prompt?.ask || !prompt.examDate) return null;
  return (
    <Card style={{ borderColor: colors.secondary }}>
      <H2>How did the exam go?</H2>
      <Muted>
        Your plan had the exam on {longDate(prompt.examDate)}. If you took it, telling us how it went (even "rather not
        say") helps us check that our readiness estimate is honest. It only takes a moment.
      </Muted>
      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        <Button
          label="Tell us"
          icon="flag"
          size="sm"
          fullWidth={false}
          onPress={() => router.push({ pathname: `/course/${trackId}/outcome`, params: { trackTitle, examDate: prompt.examDate! } })}
        />
      </View>
    </Card>
  );
}

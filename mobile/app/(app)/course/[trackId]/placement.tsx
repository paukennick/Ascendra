import React, { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import type { PlacementView } from "@/types/plan";
import { Body, Button, Card, ErrorBanner, H1, H2, Loading, Muted, ProgressBar, Screen } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { placementProgress } from "@/lib/studyPlan";
import { friendlyError } from "@/lib/errorMessage";
import { useGoBack } from "@/lib/useGoBack";
import { courseHome } from "@/lib/goBack";

// REQ-110: the optional placement check. Questions come from lessons already
// written for this course (no AI call). Answers are not marked right or wrong
// one by one -- that would teach to the check -- and nothing here goes to
// Review. Objectives answered correctly are skipped ahead in the plan.

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function PlacementScreen() {
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const router = useRouter();
  const goBack = useGoBack(courseHome(trackId));
  const [view, setView] = useState<PlacementView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One id per question, reused if the same answer is retried after a failure.
  const ids = useRef(new Map<number, string>());
  // REQ-113 (Audit 3 mobile L5): `busy` is state, so two taps on different
  // options in the same frame both got past it and sent two answers. A ref
  // is updated at once.
  const inFlight = useRef(false);

  const load = useCallback(() => {
    setError(null);
    api
      .get<PlacementView>(`/api/courses/${trackId}/placement`)
      .then(setView)
      .catch((err) => setError(friendlyError(err)));
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Resolves true when the server took it.
  async function post(body: Record<string, unknown>): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      setView(await api.post<PlacementView>(`/api/courses/${trackId}/placement`, body));
      return true;
    } catch (err) {
      setError(friendlyError(err));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function answer(choice: number) {
    const cur = view?.current;
    if (!cur || inFlight.current) return;
    let id = ids.current.get(cur.seq);
    if (!id) {
      id = Crypto.randomUUID();
      ids.current.set(cur.seq, id);
    }
    return post({ action: "answer", seq: cur.seq, choice, clientAttemptId: id });
  }

  return (
    <Screen>
      <H1>Placement check</H1>
      {trackTitle ? <Muted>{trackTitle}</Muted> : null}
      {error ? <ErrorBanner message={error} onRetry={!view ? load : undefined} /> : null}
      {!view && !error ? <Loading /> : null}

      {view && (view.status === "none" || view.status === "skipped") ? (
        <Card>
          <H2>Start where you are</H2>
          <Body>
            About 10 quick multiple-choice questions, a few minutes in all. Anything you already know gets skipped in your plan, and
            confirmed with a quick check later.
          </Body>
          <Muted>
            You won't see right or wrong after each one, and nothing you miss counts against you. If it's all new, we'll stop early
            and start you at the beginning.
          </Muted>
          {view.available ? (
            <Button label="Start the check" icon="compass" loading={busy} onPress={() => post({ action: "start" })} />
          ) : (
            <Muted>This course doesn't have enough lessons ready for a placement check yet. Start with the first lesson instead.</Muted>
          )}
          <Button label="Not now" variant="link" onPress={goBack} />
        </Card>
      ) : null}

      {view?.status === "active" && view.current ? (
        <Card>
          <View accessibilityLiveRegion="polite">
            <Muted>{placementProgress(view.asked, view.max)}</Muted>
          </View>
          <ProgressBar percent={Math.round((view.asked / view.max) * 100)} />
          <Body>{view.current.question}</Body>
          <View style={{ gap: spacing.sm }}>
            {view.current.choices.map((c, i) => (
              <Pressable
                key={`${view.current!.seq}-${i}`}
                onPress={() => answer(i)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Option ${LETTERS[i]}: ${c}`}
                accessibilityState={{ disabled: busy }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    gap: spacing.sm,
                    padding: spacing.md,
                    minHeight: 48,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.cardAlt,
                  },
                  (pressed || busy) && { opacity: 0.7 },
                ]}
              >
                <Muted style={{ color: colors.accentHover, fontFamily: fonts.bodyBold }}>{LETTERS[i]}</Muted>
                <Body style={{ flex: 1 }}>{c}</Body>
              </Pressable>
            ))}
          </View>
          <Muted style={{ fontSize: 13 }}>Not sure? Pick your best guess. A miss just means we'll teach it.</Muted>
          <Button
            label="Stop here and start the course"
            variant="link"
            // L5: only leaves once the server has recorded it; a failure stays
            // here with the error showing.
            onPress={() => post({ action: "skip" }).then((ok) => ok && goBack())}
          />
        </Card>
      ) : null}

      {view?.status === "done" && view.summary ? (
        <Card elevated style={{ borderColor: colors.good }}>
          <H2>All set</H2>
          <Body>{view.summary.message}</Body>
          <Button
            label="See my study plan"
            icon="calendar"
            onPress={() => router.replace({ pathname: `/course/${trackId}/plan`, params: { trackTitle } })}
          />
          <Button label="Back to the course" variant="ghost" onPress={goBack} />
        </Card>
      ) : null}
    </Screen>
  );
}

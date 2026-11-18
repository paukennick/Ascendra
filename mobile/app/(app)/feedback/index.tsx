import React, { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Body, Button, Card, EmptyState, H2, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { LoadError } from "@/components/LoadError";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";
import {
  aboutLine,
  canGiveFeedback,
  feedbackHref,
  ratingsLine,
  recommendLine,
  REPORT_POINTER,
  whenLine,
  type Feedback,
} from "@/lib/reviewers";

// REQ-331: a reviewer's own feedback, newest first, with a way to send more
// and to edit any of it. Reviewers (and owners) only; the server checks on
// every request, and anyone else sees why they can't use it.
export default function YourFeedback() {
  const router = useRouter();
  const { user } = useAuth();
  const allowed = canGiveFeedback(user);
  const [list, setList] = useState<Feedback[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ feedback: Feedback[] }>("/api/reviewer/feedback")
      .then((res) => setList(res.feedback))
      .catch((err) => setError(friendlyError(err)));
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (allowed) load();
    }, [allowed, load])
  );

  if (!allowed) {
    return (
      <Screen>
        <Card>
          <H2>Reviewer feedback</H2>
          <Muted>The reviewer feedback form is for reviewers. To report a problem with a lesson or question, use “Report a problem” on it, or Support.</Muted>
        </Card>
      </Screen>
    );
  }
  if (error) return <LoadError message={error} onRetry={load} />;
  if (!list) return <Loading label="Loading your feedback" />;

  return (
    <Screen>
      <Card style={{ gap: spacing.sm }}>
        <H2>Thank you for reviewing</H2>
        <Muted>Tell us what you think of the courses and sims you looked at. You can send as many as you like and edit them later.</Muted>
        <Muted>{REPORT_POINTER}</Muted>
        <Button label="Give new feedback" icon="plus" onPress={() => router.push(feedbackHref())} />
      </Card>

      <SectionHeader label="Your feedback" />
      {list.length ? (
        list.map((f) => (
          <Card key={f.id} style={{ gap: spacing.xs }}>
            <Body>{aboutLine(f)}</Body>
            <Muted>{whenLine(f)}</Muted>
            {ratingsLine(f) ? <Muted>{ratingsLine(f)}</Muted> : null}
            {recommendLine(f) ? <Muted>{recommendLine(f)}</Muted> : null}
            <Button
              label="Edit"
              variant="ghost"
              icon="edit-2"
              size="sm"
              fullWidth={false}
              accessibilityLabel={`Edit feedback: ${aboutLine(f)}, ${whenLine(f)}`}
              onPress={() => router.push({ pathname: "/feedback/edit", params: { id: f.id } })}
            />
          </Card>
        ))
      ) : (
        <Card>
          <EmptyState icon="message-square" title="Nothing sent yet" message="Your feedback will be listed here once you send it." />
        </Card>
      )}
    </Screen>
  );
}

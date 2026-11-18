import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Body, Button, Card, Chip, EmptyState, H2, H3, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { LoadError } from "@/components/LoadError";
import { showAccessSettings } from "@/lib/access";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";
import {
  aboutLine,
  itemHref,
  ratingsLine,
  recommendLine,
  roleLine,
  TEXT_KEYS,
  TEXT_LABEL,
  triedLine,
  whenLine,
  type OwnerFeedback,
} from "@/lib/reviewers";

// REQ-331: Settings > Access > Reviewer feedback, owner only (the server
// checks on every request). Every submission, newest first, filterable by
// reviewer and by course. A submission about a course or sim links to it.

interface Response {
  feedback: OwnerFeedback[];
  reviewers: { id: string; label: string }[];
  courses: { id: string; title: string }[];
}

export default function ReviewerFeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const owner = showAccessSettings(user);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  // The filter choices come from the unfiltered list, so they don't vanish as you filter.
  const [choices, setChoices] = useState<Pick<Response, "reviewers" | "courses"> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = [reviewer ? `reviewer=${reviewer}` : "", course ? `course=${course}` : ""].filter(Boolean).join("&");
      const res = await api.get<Response>(`/api/access/reviewer-feedback${q ? `?${q}` : ""}`);
      setData(res);
      if (!reviewer && !course) setChoices({ reviewers: res.reviewers, courses: res.courses });
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [reviewer, course]);

  useEffect(() => {
    if (owner) load();
  }, [owner, load]);

  if (!owner) {
    return (
      <Screen>
        <Card>
          <H2>Reviewer feedback</H2>
          <Muted>Only the account owner can read reviewer feedback.</Muted>
        </Card>
      </Screen>
    );
  }
  if (error) return <LoadError message={error} onRetry={load} />;
  if (!data) return <Loading label="Loading reviewer feedback" />;

  const reviewers = choices?.reviewers ?? data.reviewers;
  const courses = choices?.courses ?? data.courses;

  return (
    <Screen>
      <Card style={{ gap: spacing.sm }}>
        <H2>Reviewer feedback</H2>
        <Muted>What reviewers sent with the in-app form, newest first. Reviewers are marked under Settings, Access. Reports about one item still arrive as “Report a problem”.</Muted>
        {reviewers.length > 1 ? (
          <>
            <Muted>Reviewer</Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Chip label="All" accessibilityLabel="All reviewers" active={!reviewer} onPress={() => setReviewer(null)} />
              {reviewers.map((r) => (
                <Chip key={r.id} label={r.label} active={reviewer === r.id} onPress={() => setReviewer(reviewer === r.id ? null : r.id)} />
              ))}
            </View>
          </>
        ) : null}
        {courses.length ? (
          <>
            <Muted>Course</Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Chip label="All" accessibilityLabel="All courses" active={!course} onPress={() => setCourse(null)} />
              {courses.map((c) => (
                <Chip key={c.id} label={c.title} active={course === c.id} onPress={() => setCourse(course === c.id ? null : c.id)} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <SectionHeader label={`${data.feedback.length} submission${data.feedback.length === 1 ? "" : "s"}`} />
      {data.feedback.length ? (
        data.feedback.map((f) => {
          const href = itemHref(f);
          return (
            <Card key={f.id} style={{ gap: spacing.xs }}>
              <H3>{f.name ?? f.reviewerEmail}</H3>
              <Muted>{[f.name ? f.reviewerEmail : null, roleLine(f)].filter(Boolean).join(" · ")}</Muted>
              <Body>{aboutLine(f)}</Body>
              <Muted>{whenLine(f)}</Muted>
              {f.areas.length ? <Muted>{`Areas: ${f.areas.join(", ")}`}</Muted> : null}
              {triedLine(f) ? <Muted>{`Tried: ${triedLine(f)}`}</Muted> : null}
              {ratingsLine(f) ? <Body>{ratingsLine(f)}</Body> : null}
              {TEXT_KEYS.filter((k) => f.texts[k]).map((k) => (
                <View key={k} style={{ gap: 2 }}>
                  <Muted>{TEXT_LABEL[k]}</Muted>
                  <Body>{f.texts[k]}</Body>
                </View>
              ))}
              {recommendLine(f) ? <Muted>{recommendLine(f)}</Muted> : null}
              {href ? (
                <Button
                  label={f.simId ? "Open the sim" : "Open the course"}
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  icon="external-link"
                  onPress={() => router.push(href)}
                />
              ) : null}
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState icon="message-square" title="No reviewer feedback yet" message="Submissions appear here as reviewers send them." />
        </Card>
      )}
    </Screen>
  );
}

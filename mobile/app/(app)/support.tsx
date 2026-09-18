import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  H2,
  Loading,
  Muted,
  Screen,
  SectionHeader,
  TextField,
} from "@/components/ui";
import { Alert } from "@/lib/alert";
import { colors, spacing } from "@/lib/theme";
import type { SupportRequest, SupportRequestKind, SupportRequestStatus } from "@/types";

const STATUS_COLOR: Record<SupportRequestStatus, string> = {
  open: colors.accent,
  in_review: colors.warn,
  resolved: colors.good,
  declined: colors.mutedDim,
};

const STATUS_LABEL: Record<SupportRequestStatus, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  declined: "Declined",
};

export default function Support() {
  // Opened from the sidebar as /support?kind=course_request to land straight
  // on the course-request form instead of the ticket one.
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<SupportRequestKind>(
    kindParam === "course_request" ? "course_request" : "ticket"
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseSourceUrl, setCourseSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<SupportRequest[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ requests: SupportRequest[] }>("/api/support");
      setRequests(res.requests);
      setListError(null);
    } catch (err) {
      setListError((err as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isCourseRequest = kind === "course_request";

  async function submit() {
    setError(null);
    if (!subject.trim()) return setError("Add a subject.");
    if (!body.trim()) return setError(isCourseRequest ? "Tell us a bit about the course." : "Describe the issue.");
    if (isCourseRequest && !courseName.trim()) return setError("Add the course name.");

    setSubmitting(true);
    try {
      await api.post("/api/support", {
        kind,
        subject: subject.trim(),
        body: body.trim(),
        ...(isCourseRequest
          ? {
              courseName: courseName.trim(),
              courseSourceUrl: courseSourceUrl.trim() || undefined,
            }
          : {}),
      });
      setSubject("");
      setBody("");
      setCourseName("");
      setCourseSourceUrl("");
      Alert.alert(
        isCourseRequest ? "Course request sent" : "Ticket submitted",
        "Thanks — you can track its status on this screen."
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Support" }} />

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Chip
          label="Submit a ticket"
          active={!isCourseRequest}
          onPress={() => {
            setKind("ticket");
            setError(null);
          }}
        />
        <Chip
          label="Request a course"
          active={isCourseRequest}
          onPress={() => {
            setKind("course_request");
            setError(null);
          }}
        />
      </View>

      <Card style={{ gap: spacing.md }}>
        <H2>{isCourseRequest ? "Request a course" : "Submit a ticket"}</H2>
        <Muted>
          {isCourseRequest
            ? "Tell us what you'd like added and where it comes from — a university, a platform like Udemy, or a certification body."
            : "Report a bug, a wrong answer explanation, or anything else that needs a look."}
        </Muted>

        {error ? <ErrorBanner message={error} /> : null}

        {isCourseRequest ? (
          <>
            <TextField
              label="Course name"
              value={courseName}
              onChangeText={setCourseName}
              placeholder="e.g. AWS Solutions Architect Associate"
              autoCapitalize="words"
              maxLength={200}
              icon="book"
            />
            <TextField
              label="Source (optional)"
              value={courseSourceUrl}
              onChangeText={setCourseSourceUrl}
              placeholder="https://…"
              keyboardType="url"
              maxLength={2000}
              icon="link"
            />
          </>
        ) : null}

        <TextField
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder={isCourseRequest ? "Short summary of the request" : "Short summary of the issue"}
          autoCapitalize="sentences"
          maxLength={200}
          icon="edit-3"
        />
        <TextField
          label="Details"
          value={body}
          onChangeText={setBody}
          placeholder={
            isCourseRequest
              ? "Why it'd be useful, which exam or program it maps to, anything else worth knowing."
              : "What happened, what you expected, and where in the app you saw it."
          }
          autoCapitalize="sentences"
          maxLength={5000}
          multiline
          minHeight={120}
        />
        <Button
          label={isCourseRequest ? "Send request" : "Submit ticket"}
          onPress={submit}
          loading={submitting}
          icon="send"
        />
      </Card>

      <SectionHeader label="Your submissions" />
      {listError ? <ErrorBanner message={listError} /> : null}
      {requests === null && !listError ? (
        <Loading label="Loading your submissions…" />
      ) : requests && requests.length === 0 ? (
        <Card>
          <EmptyState
            icon="inbox"
            title="Nothing submitted yet"
            message="Tickets and course requests you send will show up here with their status."
          />
        </Card>
      ) : (
        (requests ?? []).map((r) => (
          <Card key={r.id} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Badge label={STATUS_LABEL[r.status]} color={STATUS_COLOR[r.status]} />
              <Muted style={{ fontSize: 12 }}>
                {r.kind === "course_request" ? "Course request" : "Ticket"} ·{" "}
                {new Date(r.created_at).toLocaleDateString()}
              </Muted>
            </View>
            <Body style={{ fontWeight: "600" }}>{r.subject}</Body>
            {r.course_name ? <Muted style={{ fontSize: 13 }}>Course: {r.course_name}</Muted> : null}
            <Muted style={{ fontSize: 13 }}>{r.body}</Muted>
            {r.admin_note ? (
              <View style={{ marginTop: spacing.xs, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: spacing.sm }}>
                <Muted style={{ fontSize: 13 }}>{r.admin_note}</Muted>
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
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
import {
  emptySupportFields,
  encodeDraft,
  parseSupportFields,
  supportDraftKey,
  supportDraftPayload,
  supportFieldsAfterFailedSend,
  supportKindFromParam,
  type SupportFields,
} from "@/lib/drafts";
import { localDataGuard } from "@/lib/localData";
import { colors, spacing } from "@/lib/theme";
import { useStoredDraft } from "@/lib/useStoredDraft";
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

// A send that fails after the learner left (or switched form) can't put the
// text back on screen, so it goes back into that form's stored draft. An
// entry already there (typed since) is left alone. Best effort.
async function restoreDraftInStorage(userId: string | undefined, kind: SupportRequestKind, fields: SupportFields) {
  const payload = supportDraftPayload(fields);
  if (!userId || !payload) return;
  const key = supportDraftKey(userId, kind);
  if (!localDataGuard.mayWrite(key)) return;
  try {
    if ((await AsyncStorage.getItem(key)) != null) return;
    await AsyncStorage.setItem(key, encodeDraft(payload, Date.now()));
  } catch {
    // Nothing more to do; the error was already a failed send.
  }
}

export default function Support() {
  // Opened from the sidebar as /support?kind=course_request to land straight
  // on the course-request form instead of the ticket one.
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const router = useRouter();
  const [kind, setKind] = useState<SupportRequestKind>(supportKindFromParam(kindParam) ?? "ticket");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseSourceUrl, setCourseSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // REQ-093: what's typed here survives leaving the screen. One draft per
  // user and per kind (a half-written ticket and a half-written course
  // request are separate), so the fields are swapped when the kind changes.
  // A successful send empties the fields, which clears the stored draft.
  const { user } = useAuth();
  function applyFields(f: { subject: string; body: string; courseName: string; courseSourceUrl: string }) {
    setSubject(f.subject);
    setBody(f.body);
    setCourseName(f.courseName);
    setCourseSourceUrl(f.courseSourceUrl);
  }
  useStoredDraft(
    user ? supportDraftKey(user.id, kind) : null,
    supportDraftPayload({ subject, body, courseName, courseSourceUrl }),
    (stored) => {
      const f = stored ? parseSupportFields(stored) : null;
      if (f) applyFields(f);
    }
  );
  function switchKind(next: SupportRequestKind) {
    if (next === kind) return;
    applyFields(emptySupportFields());
    setKind(next);
    setError(null);
  }

  // `kind` used to be read from the URL only on first load, so a later
  // param change -- the sidebar popping back here with another kind, a deep
  // link, web back/forward -- left the other form on screen (FAIL-064). The
  // chips write the param too, so the URL always names the form showing and
  // a repeat of the same link still counts as a change.
  const switchKindRef = useRef(switchKind);
  switchKindRef.current = switchKind;
  useEffect(() => {
    const next = supportKindFromParam(kindParam);
    if (next) switchKindRef.current(next);
  }, [kindParam]);
  function chooseKind(next: SupportRequestKind) {
    switchKind(next);
    router.setParams({ kind: next });
  }

  // Read when a send finishes, which can be after the learner has switched
  // form or left (see submit).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const latest = useRef({ kind, fields: { subject, body, courseName, courseSourceUrl } });
  latest.current = { kind, fields: { subject, body, courseName, courseSourceUrl } };

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

    // FAIL-066: the form (and so its stored draft) is emptied BEFORE the
    // send, as chat does. Clearing only on success missed the case where the
    // learner left mid-request: the screen was gone when the success came
    // back, the draft stayed, and the next visit offered an already-sent
    // ticket to send again. On failure the sent text comes back.
    const sentKind = kind;
    const sent = { subject, body, courseName, courseSourceUrl };
    applyFields(emptySupportFields());
    setSubmitting(true);
    try {
      await api.post("/api/support", {
        kind: sentKind,
        subject: sent.subject.trim(),
        body: sent.body.trim(),
        ...(sentKind === "course_request"
          ? {
              courseName: sent.courseName.trim(),
              courseSourceUrl: sent.courseSourceUrl.trim() || undefined,
            }
          : {}),
      });
      Alert.alert(
        sentKind === "course_request" ? "Course request sent" : "Ticket submitted",
        "Thanks — you can track its status on this screen."
      );
      await load();
    } catch (err) {
      if (mounted.current && latest.current.kind === sentKind) {
        applyFields(supportFieldsAfterFailedSend(latest.current.fields, sent));
        setError((err as Error).message);
      } else {
        // Left the screen or switched form while it was sending: put the
        // text back where the next visit to that form will find it.
        restoreDraftInStorage(user?.id, sentKind, sent);
      }
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Support" }} />

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Chip
          label="Submit a ticket"
          active={!isCourseRequest}
          onPress={() => chooseKind("ticket")}
        />
        <Chip
          label="Request a course"
          active={isCourseRequest}
          onPress={() => chooseKind("course_request")}
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

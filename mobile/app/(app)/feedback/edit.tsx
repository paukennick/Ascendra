import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Body, Button, Card, Chip, ErrorBanner, H2, H3, LiveAnnouncement, Loading, Muted, Screen, TextField } from "@/components/ui";
import { LoadError } from "@/components/LoadError";
import { Alert } from "@/lib/alert";
import { friendlyError } from "@/lib/errorMessage";
import { spacing } from "@/lib/theme";
import { useGoBack } from "@/lib/useGoBack";
import {
  aboutLine,
  canGiveFeedback,
  FEEDBACK_NAME_MAX,
  FEEDBACK_TEXT_MAX,
  formFrom,
  formProblem,
  newForm,
  payloadFrom,
  RATING_KEYS,
  RATING_LABEL,
  RECOMMEND,
  RECOMMEND_LABEL,
  REPORT_POINTER,
  REVIEWER_ROLES,
  ROLE_LABEL,
  TEXT_KEYS,
  TEXT_LABEL,
  toggle,
  TRIED,
  TRIED_LABEL,
  type Feedback,
  type FormState,
  type RatingKey,
} from "@/lib/reviewers";

// REQ-331: the reviewer feedback form, new or editing one of the reviewer's
// own. Opened from Settings, the Home footer, a course page or a sim's
// results (which carry that course or sim: ids only in the route). Every
// field is optional; saving needs a rating, a comment or a recommendation.
// Leaving with unsaved changes asks first.

interface ListResponse {
  feedback: Feedback[];
  prefill: { name: string | null; areas: string[] };
  context: { trackId: string | null; trackTitle: string | null; simId: string | null; simTitle: string | null };
}

function ChoiceRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{children}</View>;
}

export default function FeedbackForm() {
  const router = useRouter();
  const navigation = useNavigation();
  const goBack = useGoBack("/feedback");
  const { user, status } = useAuth();
  const allowed = canGiveFeedback(user);
  const params = useLocalSearchParams<{ id?: string; trackId?: string; simId?: string }>();
  const editId = typeof params.id === "string" && params.id ? params.id : null;
  const [form, setForm] = useState<FormState | null>(null);
  const [about, setAbout] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const dirty = useRef(false);
  const allowLeave = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      if (editId) {
        const res = await api.get<{ feedback: Feedback }>(`/api/reviewer/feedback/${encodeURIComponent(editId)}`);
        setForm(formFrom(res.feedback));
        setAbout(aboutLine(res.feedback));
      } else {
        const q = [params.trackId ? `trackId=${encodeURIComponent(params.trackId)}` : "", params.simId ? `simId=${encodeURIComponent(params.simId)}` : ""]
          .filter(Boolean)
          .join("&");
        const res = await api.get<ListResponse>(`/api/reviewer/feedback${q ? `?${q}` : ""}`);
        const ctx = res.context ?? { trackId: null, trackTitle: null, simId: null, simTitle: null };
        const contextAreas = [ctx.trackTitle, ctx.simTitle].filter((t): t is string => !!t);
        setForm(newForm({ name: res.prefill?.name, areas: res.prefill?.areas ?? [], trackId: ctx.trackId, simId: ctx.simId, contextAreas }));
        setAbout(contextAreas.length ? aboutLine({ trackTitle: ctx.trackTitle, simTitle: ctx.simTitle }) : null);
      }
      dirty.current = false;
    } catch (err) {
      setLoadError(friendlyError(err));
    }
  }, [editId, params.trackId, params.simId]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  // Unsaved changes: ask before leaving (header back, Android back, the
  // sidebar). Never held against a sign-out or the lock.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (!dirty.current || allowLeave.current || statusRef.current !== "signedIn") return;
      e.preventDefault();
      Alert.alert("Leave without saving?", "Your feedback on this screen hasn't been saved.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
  }, [navigation]);

  const change = useCallback((next: (f: FormState) => FormState) => {
    dirty.current = true;
    setSaved(null);
    setForm((f) => (f ? next(f) : f));
  }, []);

  const save = useCallback(async () => {
    if (!form) return;
    const p = formProblem(form);
    setProblem(p);
    if (p) return;
    setSaving(true);
    try {
      if (editId) await api.put(`/api/reviewer/feedback/${encodeURIComponent(editId)}`, payloadFrom(form));
      else await api.post("/api/reviewer/feedback", payloadFrom(form));
      dirty.current = false;
      allowLeave.current = true;
      setSaved(editId ? "Changes saved. Thank you." : "Feedback sent. Thank you.");
      router.replace("/feedback");
    } catch (err) {
      setProblem(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }, [form, editId, router]);

  if (!allowed) {
    return (
      <Screen>
        <Card>
          <H2>Reviewer feedback</H2>
          <Muted>The reviewer feedback form is for reviewers. To report a problem with a lesson or question, use “Report a problem” on it, or Support.</Muted>
          <Button label="Back" variant="ghost" icon="arrow-left" onPress={goBack} />
        </Card>
      </Screen>
    );
  }
  if (loadError) return <LoadError message={loadError} onRetry={load} />;
  if (!form) return <Loading label="Loading the form" />;

  const rate = (k: RatingKey, n: number) => change((f) => ({ ...f, ratings: { ...f.ratings, [k]: f.ratings[k] === n ? null : n } }));

  return (
    <Screen>
      <Stack.Screen options={{ title: editId ? "Edit feedback" : "Give feedback" }} />
      <LiveAnnouncement message={saved} />

      <Card style={{ gap: spacing.sm }}>
        <H2>{editId ? "Edit your feedback" : "Reviewer feedback"}</H2>
        {about ? <Body>{`About: ${about}`}</Body> : null}
        <Muted>Every question is optional. Only the Ascendra team sees what you send, and you can edit it later.</Muted>
        <Muted>{REPORT_POINTER}</Muted>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <H3>About you</H3>
        <TextField label="Your name" value={form.name} onChangeText={(v) => change((f) => ({ ...f, name: v }))} autoCapitalize="words" maxLength={FEEDBACK_NAME_MAX} icon="user" />
        <Muted>License or role</Muted>
        <ChoiceRow>
          {REVIEWER_ROLES.map((r) => (
            <Chip key={r} label={ROLE_LABEL[r]} active={form.role === r} onPress={() => change((f) => ({ ...f, role: f.role === r ? null : r }))} />
          ))}
        </ChoiceRow>
        {form.role === "other" ? (
          <TextField label="Your role" value={form.roleOther} onChangeText={(v) => change((f) => ({ ...f, roleOther: v }))} autoCapitalize="sentences" maxLength={FEEDBACK_NAME_MAX} />
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <H3>What you looked at</H3>
        <TextField
          label="Areas looked at (separate with commas)"
          value={form.areasText}
          onChangeText={(v) => change((f) => ({ ...f, areasText: v }))}
          placeholder="e.g. NCMHCE, session sims"
          autoCapitalize="sentences"
          maxLength={2000}
        />
        <Muted>What you tried</Muted>
        <ChoiceRow>
          {TRIED.map((t) => (
            <Chip key={t} label={TRIED_LABEL[t]} active={form.tried.includes(t)} onPress={() => change((f) => ({ ...f, tried: toggle(f.tried, t) }))} />
          ))}
        </ChoiceRow>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <H3>Ratings</H3>
        <Muted>1 is poor, 5 is excellent. Tap a number again to clear it.</Muted>
        {RATING_KEYS.map((k) => (
          <View key={k} style={{ gap: spacing.xs }}>
            <Body>{RATING_LABEL[k]}</Body>
            <ChoiceRow>
              {[1, 2, 3, 4, 5].map((n) => (
                <Chip key={n} label={String(n)} active={form.ratings[k] === n} accessibilityLabel={`${RATING_LABEL[k]}: ${n} of 5`} onPress={() => rate(k, n)} />
              ))}
            </ChoiceRow>
          </View>
        ))}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <H3>In your words</H3>
        {TEXT_KEYS.map((k) => (
          <TextField
            key={k}
            label={TEXT_LABEL[k]}
            value={form.texts[k]}
            onChangeText={(v) => change((f) => ({ ...f, texts: { ...f.texts, [k]: v } }))}
            autoCapitalize="sentences"
            multiline
            minHeight={88}
            maxLength={FEEDBACK_TEXT_MAX}
          />
        ))}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <H3>Would you recommend it?</H3>
        <ChoiceRow>
          {RECOMMEND.map((r) => (
            <Chip
              key={r}
              label={RECOMMEND_LABEL[r]}
              active={form.recommend === r}
              accessibilityLabel={`Would recommend: ${RECOMMEND_LABEL[r]}`}
              onPress={() => change((f) => ({ ...f, recommend: f.recommend === r ? null : r }))}
            />
          ))}
        </ChoiceRow>
        <H3>OK for us to follow up with you?</H3>
        <ChoiceRow>
          {([true, false] as const).map((v) => (
            <Chip
              key={String(v)}
              label={v ? "Yes" : "No"}
              active={form.followUp === v}
              accessibilityLabel={`OK to follow up: ${v ? "Yes" : "No"}`}
              onPress={() => change((f) => ({ ...f, followUp: f.followUp === v ? null : v }))}
            />
          ))}
        </ChoiceRow>
      </Card>

      {problem ? <ErrorBanner message={problem} /> : null}
      <Button label={editId ? "Save changes" : "Send feedback"} icon="send" loading={saving} onPress={save} />
      <Button label="Cancel" variant="ghost" onPress={goBack} />
    </Screen>
  );
}

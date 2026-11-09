import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import { Body, Button, Card, ErrorBanner, Loading, Muted, Screen } from "@/components/ui";
import { IntakeFormFields } from "@/components/IntakeForm";
import { IntakeResult } from "@/components/IntakeResult";
import { friendlyError } from "@/lib/errorMessage";
import { EMPTY_FORM, formFromView, intakeBody, parseIntakeView, PRIVACY_LINE, type IntakeForm, type IntakeView } from "@/lib/intake";
import { localToday } from "@/lib/studyPlan";
import { spacing } from "@/lib/theme";

// REQ-169: Settings > Study profile -- the intake answers, editable any
// time. Saving sets each named course's exam date, and weekly hours only for
// a course that has no study plan yet (existing hours are never changed).
export default function StudyProfile() {
  const [view, setView] = useState<IntakeView | null>(null);
  const [form, setForm] = useState<IntakeForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<unknown>(`/api/intake?today=${localToday()}`)
      .then((d) => {
        const v = parseIntakeView(d);
        setView(v);
        setForm(formFromView(v));
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const v = parseIntakeView(await api.put<unknown>("/api/intake", intakeBody(form, localToday())));
      setView(v);
      setForm(formFromView(v));
      setSaved(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Loading your study profile" />;
  return (
    <Screen>
      <Muted>{PRIVACY_LINE}</Muted>
      {error ? <ErrorBanner message={error} onRetry={view ? undefined : load} /> : null}
      <IntakeFormFields value={form} onChange={(f) => { setForm(f); setSaved(false); }} />
      <Button label="Save" icon="check" loading={busy} onPress={save} />
      {saved ? (
        <Card>
          <View accessible accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
            <Body>Saved. Your study plans are updated.</Body>
          </View>
        </Card>
      ) : null}
      {saved ? <IntakeResult view={view} /> : null}
    </Screen>
  );
}

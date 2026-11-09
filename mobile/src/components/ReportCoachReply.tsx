// REQ-165: report an AI coach reply without leaving the app (Google Play
// AI-Generated Content policy: in-app flagging of offensive or wrong AI
// output). Files a Support ticket, tied to the course, quoting the reply, so
// it reaches the support inbox and the learner can follow it under Support.
// Lessons and labs have their own report buttons (ReportLessonProblem,
// ReportProblem); this is the coach's.
import React, { useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import { Button, Card, Chip, ErrorBanner, Muted, TextField } from "@/components/ui";
import { coachReportBody, COACH_REPORT_REASONS, type CoachReportReason } from "@/lib/coachReport";
import { spacing } from "@/lib/theme";

export function ReportCoachReply({
  trackId,
  trackTitle,
  reply,
  onClose,
}: {
  trackId: string;
  trackTitle?: string;
  reply: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<CoachReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <Muted>Thanks — your report was sent. You can follow it under Support.</Muted>
        <Button label="Close" variant="ghost" fullWidth={false} onPress={onClose} />
      </Card>
    );
  }

  const submit = async () => {
    if (!reason) return setError("Choose what's wrong.");
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/support", {
        kind: "ticket",
        subject: `Coach reply report: ${reason}${trackTitle ? ` (${trackTitle})` : ""}`.slice(0, 200),
        body: coachReportBody(details, reply),
        trackId,
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <Muted>What's wrong with this reply?</Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {COACH_REPORT_REASONS.map((r) => (
          <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <TextField
        label="Anything to add? (optional)"
        value={details}
        onChangeText={setDetails}
        placeholder="What's wrong, and what you think is right if you know."
        multiline
        minHeight={70}
        maxLength={1000}
        autoCapitalize="sentences"
      />
      {error ? <ErrorBanner message={error} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Send report" icon="send" size="sm" fullWidth={false} loading={busy} onPress={submit} />
        <Button label="Cancel" variant="ghost" size="sm" fullWidth={false} onPress={onClose} />
      </View>
    </Card>
  );
}

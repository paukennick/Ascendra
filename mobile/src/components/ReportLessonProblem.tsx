// REQ-093: "Report a problem with this lesson". Files a content_report support
// request tied to the objective and the step the learner is on, so the
// reviewer can find the exact lesson (see docs/support-process.md).
// Merged 2026-11-07: line A's ReportProblem (REQ-114, item_flags) is the
// per-question report shown after an answer; this one is lesson-wide, any
// step, and becomes a Support ticket the learner can follow.
import React, { useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import { Button, Card, Chip, ErrorBanner, Muted, TextField } from "@/components/ui";
import { spacing } from "@/lib/theme";

const REASONS = [
  "Information is wrong",
  "Question or answer doesn't make sense",
  "Unsafe or outdated clinical content",
  "Something else",
] as const;

export function ReportLessonProblem({
  objectiveId,
  objectiveTitle,
  stage,
}: {
  objectiveId: string;
  objectiveTitle: string;
  stage: "guess" | "teach" | "fade" | "solo" | "done";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) return <Muted style={{ textAlign: "center" }}>Thanks — your report was sent. You can follow it under Support.</Muted>;
  if (!open) {
    return <Button label="Report a problem with this lesson" variant="link" icon="flag" onPress={() => setOpen(true)} />;
  }

  const submit = async () => {
    if (!reason) return setError("Choose what's wrong.");
    if (!details.trim()) return setError("Tell us what you noticed.");
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/support", {
        kind: "content_report",
        subject: `${reason}: ${objectiveTitle}`.slice(0, 200),
        body: details.trim(),
        objectiveId,
        stage: stage === "done" ? undefined : stage,
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
      <Muted>What's wrong with this lesson?</Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {REASONS.map((r) => (
          <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <TextField
        label="What did you notice?"
        value={details}
        onChangeText={setDetails}
        placeholder="Quote the part that's wrong, and what you think is right if you know."
        multiline
        minHeight={90}
        maxLength={5000}
        autoCapitalize="sentences"
      />
      <Muted style={{ fontSize: 12 }}>Please don't include any real patient's details.</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Send report" icon="send" fullWidth={false} loading={busy} onPress={submit} />
        <Button label="Cancel" variant="ghost" fullWidth={false} onPress={() => setOpen(false)} />
      </View>
    </Card>
  );
}

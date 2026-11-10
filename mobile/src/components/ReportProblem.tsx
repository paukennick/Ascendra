import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "@/api/client";
import { Button, Muted, TextField } from "@/components/ui";
import { colors } from "@/lib/theme";
import { REPORT_NOTE_MAX, reportBody, reportCopy, reportKey, reportReasons, type ReportReason, type ReportTarget } from "@/lib/reportProblem";

// REQ-114 (Audit 3 H2): "Report a problem with this question". A small link
// under a question that opens a reason picker and an optional note, then
// sends POST /api/items/report. Shown after the learner has answered, next to
// the verdict, where a wrong key is noticed. Self-contained: it does not
// touch the screen's own state, so it can sit on any question screen.
//
// Accessibility: the reasons are a radio group (role, checked state, label
// per option), every control has a label a screen reader speaks, text uses
// the theme's body colours (contrast as the rest of the app) and wraps at
// large font sizes.

const sent = new Set<string>();

// REQ-199: also a simulation (kind "sim"), with its own wording. `resolve`,
// when given, builds the target at the moment of sending (a running sim's
// tick and state hash), so nothing is computed on every frame.
export function ReportProblem({ target, resolve }: { target: ReportTarget; resolve?: () => ReportTarget }) {
  const key = reportKey(target);
  const copy = reportCopy(target);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("wrong_answer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(sent.has(key) ? copy.thanks : null);
  const [error, setError] = useState<string | null>(null);

  if (message) {
    return (
      <View accessibilityLiveRegion="polite">
        <Muted style={{ fontSize: 13 }}>{message}</Muted>
      </View>
    );
  }
  if (!open) {
    return (
      <Button
        label={copy.link}
        variant="link"
        size="sm"
        icon="flag"
        fullWidth={false}
        onPress={() => setOpen(true)}
      />
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ recorded: boolean; message?: string }>("/api/items/report", reportBody(resolve ? resolve() : target, reason, note));
      sent.add(key);
      setMessage(res.message ?? copy.thanks);
    } catch (err) {
      setError((err as Error).message || "Couldn't send the report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 8, paddingVertical: 4 }}>
      <Text style={{ color: colors.text, fontWeight: "600" }} accessibilityRole="header">
        {copy.heading}
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: 4 }}>
        {reportReasons(target).map((r) => {
          const checked = reason === r.value;
          return (
            <Pressable
              key={r.value}
              onPress={() => setReason(r.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={r.label}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: checked ? colors.accentHover : colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {checked ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentHover }} /> : null}
              </View>
              <Text style={{ color: colors.text, flexShrink: 1 }}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label="Anything to add? (optional)"
        value={note}
        onChangeText={setNote}
        placeholder={copy.placeholder}
        multiline
        minHeight={72}
        maxLength={REPORT_NOTE_MAX}
        autoCapitalize="sentences"
      />
      {error ? (
        <Text style={{ color: colors.bad }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label="Send report" size="sm" fullWidth={false} loading={busy} onPress={submit} />
        <Button label="Cancel" variant="ghost" size="sm" fullWidth={false} disabled={busy} onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}

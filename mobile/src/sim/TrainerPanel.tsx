import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import type { TrainerLineView, TrainerView } from "./runtime/trainerView.ts";
import { Pill, Row } from "./PanelBits";

// REQ-314 (docs/sims.md 13, 20, 22.27): the client trainer. Reading order and
// web keyboard order: the client and how they present, the gauges in words,
// the read-outs, the scope and stop rules (a met rule is spoken at once and
// shown with a word, not color alone), the intake, the assessment findings,
// the program, then the journal. Questions, cues, program changes and
// referrals are the scenario's actions (ActionBar).

function Flagged({ title, lines }: { title: string; lines: TrainerLineView[] }) {
  if (!lines.length) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <H3>{title}</H3>
      {lines.map((l) => (
        <Row key={l.id} a11y={l.a11y} strong={l.flag} color={l.flag ? colors.warn : undefined}>
          {l.flag ? <Pill text="flag" color={colors.warn} /> : null}
          <Muted>{l.label}</Muted>
          <Body>{l.text}</Body>
        </Row>
      ))}
    </View>
  );
}

export function TrainerPanel({ v, onRead }: { v: TrainerView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View accessible focusable accessibilityLabel={`${v.client.name}: ${v.client.presentation}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
        <H3>{v.client.name}</H3>
        <Muted>{v.client.presentation}</Muted>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {v.gauges.map((g) => (
          <View key={g.id} accessible focusable accessibilityLabel={g.a11y} style={{ flexGrow: 1, flexBasis: "45%", minWidth: 140, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 4 }}>
            <Muted style={{ fontSize: 12 }}>{g.label}</Muted>
            <Body style={{ fontWeight: "700" }}>{g.word}</Body>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
              <View style={{ height: 6, width: `${Math.max(0, Math.min(100, (g.value / g.max) * 100))}%`, backgroundColor: colors.accent, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
      {v.readings.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.readings.map((r) => (
            <View key={r.id} accessible focusable accessibilityLabel={r.a11y} style={{ flexGrow: 1, flexBasis: "30%", minWidth: 110, minHeight: MIN_TOUCH, borderWidth: r.flag ? 2 : 1, borderColor: r.flag ? colors.bad : colors.borderLight, borderRadius: radius.sm, padding: spacing.sm }}>
              <Muted style={{ fontSize: 12 }}>{r.label}</Muted>
              <Body style={{ fontWeight: "700", color: r.flag ? colors.bad : colors.text }}>{r.text}</Body>
              {r.flag ? <Muted style={{ fontSize: 12, color: colors.bad }}>flag</Muted> : null}
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: spacing.xs }}>
        <H3>Scope and stop rules</H3>
        {v.rules.map((r) => (
          <Row key={r.id} a11y={r.a11y} strong={r.met} color={r.met ? colors.bad : undefined}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Pill text={r.met ? "applies now" : "not now"} color={r.met ? colors.bad : colors.muted} />
              <Body style={{ fontWeight: "700" }}>{r.label}</Body>
            </View>
            <Muted>{r.text}</Muted>
          </Row>
        ))}
      </View>
      <Flagged title={v.intakeLabel ?? "Intake"} lines={v.intake} />
      <Flagged title="Assessment" lines={v.findings} />
      {v.program.length ? (
        <View accessible focusable accessibilityLabel={`${v.programLabel ?? "Program"}: ${v.program.join("; ")}`} style={{ gap: 2, minHeight: MIN_TOUCH }}>
          <H3>{v.programLabel ?? "Program"}</H3>
          {v.program.map((p, i) => <Body key={i}>{`• ${p}`}</Body>)}
        </View>
      ) : null}
      {v.journal.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>Journal</H3>
          {v.journal.map((j) => (
            <View key={j.id} accessible focusable accessibilityLabel={j.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 }}>
              <Muted style={{ fontSize: 12 }}>{j.time}</Muted>
              <Body>{j.text}</Body>
            </View>
          ))}
        </View>
      ) : null}
      <Button label="Read the client" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the client's presentation, the gauges, the read-outs, the rules that apply and the flags aloud" />
    </Card>
  );
}

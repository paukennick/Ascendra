import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { HOST_TONE_WORDS, INDICATOR_TONE_WORDS, INDICATOR_TYPE_WORDS, RULE_TONE_WORDS, type ReportLineView, type SandboxView } from "./runtime/sandboxView.ts";
import type { ConsoleTone, IndicatorTone, RuleTone } from "./engine/v1/types.ts";
import { Meters, Pill, Row } from "./PanelBits";

// REQ-314 (docs/sims.md 13, 22.27): the sandbox report. Reading order and web
// keyboard order: the sample and verdict, static findings, the process tree
// (indented under each parent; the label says the parent and the level), the
// network calls, the analyst's indicators and draft rules, then the hosts in
// scope. Defensive only: every address and domain is defanged text, never a
// link, and rule bodies are shown as text, never run. Actions (detonate,
// extract indicators, write and test a rule, isolate, block, share) are the
// scenario's (ActionBar).

const I_COLOR: Record<IndicatorTone, string> = { unreviewed: colors.muted, confirmed: colors.bad, benign: colors.good, actioned: colors.accent };
const R_COLOR: Record<RuleTone, string> = { draft: colors.muted, tested: colors.good, noisy: colors.warn, deployed: colors.accent };
const H_COLOR: Record<ConsoleTone, string> = { ok: colors.good, watch: colors.warn, bad: colors.bad, held: colors.accent };

function Lines({ title, lines, empty, mono }: { title: string; lines: ReportLineView[]; empty: string; mono?: boolean }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <H3>{title}</H3>
      {lines.length ? null : <Muted>{empty}</Muted>}
      {lines.map((l) => (
        <Row key={l.id} a11y={l.a11y} indent={Math.min(l.depth, 4)} strong={l.flag} color={l.flag ? colors.bad : undefined}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
            {l.flag ? <Pill text="malicious" color={colors.bad} /> : null}
            <Body style={{ fontWeight: "700", fontFamily: mono ? "monospace" : undefined }}>{l.label}</Body>
          </View>
          <Muted style={{ fontFamily: mono ? "monospace" : undefined }}>{l.text}</Muted>
        </Row>
      ))}
    </View>
  );
}

export function SandboxPanel({ v, onRead }: { v: SandboxView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View accessible focusable accessibilityLabel={`Sample ${v.sample.name}: ${v.sample.summary}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
        <Muted style={{ fontSize: 12 }}>Sample</Muted>
        <H3 style={{ fontFamily: "monospace" }}>{v.sample.name}</H3>
        <Muted>{v.sample.summary}</Muted>
      </View>
      <Lines title="Static analysis" lines={v.static} empty="Not run yet." />
      <Lines title="Process tree" lines={v.processes} empty="Not detonated yet." mono />
      <Lines title="Network calls" lines={v.network} empty="None recorded yet." mono />
      <View style={{ gap: spacing.xs }}>
        <H3>Indicators</H3>
        {v.indicators.length ? null : <Muted>None extracted yet.</Muted>}
        {v.indicators.map((i) => (
          <Row key={i.id} a11y={i.a11y} color={i.tone === "unreviewed" ? undefined : I_COLOR[i.tone]}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Muted style={{ fontSize: 12 }}>{INDICATOR_TYPE_WORDS[i.type]}</Muted>
              <Pill text={INDICATOR_TONE_WORDS[i.tone]} color={I_COLOR[i.tone]} />
            </View>
            <Body style={{ fontFamily: "monospace" }}>{i.value}</Body>
            <Muted>{i.status}</Muted>
          </Row>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Detection rules</H3>
        {v.rules.length ? null : <Muted>No rule drafted yet.</Muted>}
        {v.rules.map((r) => (
          <Row key={r.id} a11y={r.a11y} color={r.tone === "draft" ? undefined : R_COLOR[r.tone]}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Muted style={{ fontSize: 12 }}>{r.kind === "other" ? "Rule" : r.kind.toUpperCase()}</Muted>
              <Pill text={RULE_TONE_WORDS[r.tone]} color={R_COLOR[r.tone]} />
            </View>
            <Body style={{ fontWeight: "700" }}>{r.label}</Body>
            <View style={{ backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.xs }}>
              <Muted style={{ fontFamily: "monospace", fontSize: 12 }}>{r.text}</Muted>
            </View>
            <Muted>{r.status}</Muted>
          </Row>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Hosts in scope</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.hosts.map((h) => (
            <View
              key={h.id}
              accessible
              focusable
              accessibilityLabel={h.a11y}
              style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: h.tone === "ok" ? colors.borderLight : H_COLOR[h.tone], borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
                <Muted style={{ fontSize: 12 }}>{h.kind}</Muted>
                <Pill text={HOST_TONE_WORDS[h.tone]} color={H_COLOR[h.tone]} />
              </View>
              <Body style={{ fontWeight: "700" }}>{h.label}</Body>
              <Muted>{h.status}</Muted>
            </View>
          ))}
        </View>
        <Meters meters={v.meters} />
      </View>
      <Button label="Read the report" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the sample, every malicious finding, the indicators, the rules and the hosts aloud" />
    </Card>
  );
}

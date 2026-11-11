import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { SEVERITY_WORDS, TONE_WORDS, type ConsoleView } from "./runtime/consoleView.ts";
import type { ConsoleSeverity, ConsoleTone } from "./engine/v1/types.ts";

// REQ-231 (docs/sims.md 13, 20, 22.7): the security operations console.
// Three blocks in reading order: the alert queue, the assets, the log and
// event lines; meters (attacker stage, evidence) under the assets. Each alert,
// asset and log line is one accessible element whose label says its state in
// words; severity and tone are a word plus a colour, never colour alone.
// Every element is at least 48 dp (MIN_TOUCH). "Read the console" speaks the
// whole screen. Containment and investigation are the scenario's action
// groups (ActionBar), not part of this panel, so the panel holds no rule.

const SEVERITY_COLOUR: Record<ConsoleSeverity, string> = { critical: colors.bad, high: colors.bad, medium: colors.warn, low: colors.muted };
const TONE_COLOUR: Record<ConsoleTone, string> = { ok: colors.good, watch: colors.warn, bad: colors.bad, held: colors.accent };

function Pill({ text, colour }: { text: string; colour: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: colour, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color: colour, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

export function ConsolePanel({ v, onRead }: { v: ConsoleView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <H3>{`Alert queue (${v.openCount} open)`}</H3>
        {v.alerts.length ? null : <Muted>No alerts yet.</Muted>}
        {v.alerts.map((a) => (
          <View
            key={a.id}
            accessible
            accessibilityLabel={`${a.open ? "Open. " : ""}${a.a11y}`}
            style={{ minHeight: MIN_TOUCH, borderWidth: a.open ? 2 : 1, borderColor: a.open ? SEVERITY_COLOUR[a.severity] : colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Pill text={SEVERITY_WORDS[a.severity]} colour={SEVERITY_COLOUR[a.severity]} />
              <Muted style={{ fontSize: 12 }}>{`${a.time} · ${a.status}`}</Muted>
            </View>
            <Body style={{ fontWeight: a.open ? "700" : "400" }}>{a.title}</Body>
            {a.detail ? <Muted>{a.detail}</Muted> : null}
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Assets</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.assets.map((a) => (
            <View
              key={a.id}
              accessible
              accessibilityLabel={a.a11y}
              style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: a.tone === "ok" ? colors.borderLight : TONE_COLOUR[a.tone], borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
                <Muted style={{ fontSize: 12 }}>{a.kind}</Muted>
                <Pill text={TONE_WORDS[a.tone]} colour={TONE_COLOUR[a.tone]} />
              </View>
              <Body style={{ fontWeight: "700" }}>{a.label}</Body>
              <Muted>{a.status}</Muted>
            </View>
          ))}
        </View>
        {v.meters.map((m) => (
          <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
            <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
            <Body>{m.text}</Body>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Logs and events</H3>
        {v.events.length ? null : <Muted>Nothing logged yet.</Muted>}
        {v.events.map((e) => (
          <View key={e.id} accessible accessibilityLabel={e.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 }}>
            <Muted style={{ fontSize: 12 }}>{`${e.time} · ${e.source}`}</Muted>
            <Body style={{ fontFamily: "monospace" }}>{e.text}</Body>
          </View>
        ))}
      </View>
      <Button label="Read the console" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the open alerts, the assets and the latest log line aloud" />
    </Card>
  );
}

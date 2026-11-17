import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { ALARM_KIND_WORDS, DOOR_RESULT_WORDS, FACILITY_TONE_WORDS, type FacilityView } from "./runtime/facilityView.ts";
import type { ConsoleSeverity, DoorResult, FacilityTone } from "./engine/v1/types.ts";
import { Meters, Pill, Row } from "./PanelBits";

// REQ-314 (docs/sims.md 13, 22.27): the facility console. Reading order and
// web keyboard order: the site line, the alarm panel, the zones, environment
// read-outs, cameras, people on site, then the badge and door log. Severity,
// tone and door result are a word plus a color, never color alone. Responses
// (lock down, dispatch, evacuate, call the fire service, preserve video) are
// the scenario's actions (ActionBar), so the panel holds no rule.

const SEVERITY_COLOR: Record<ConsoleSeverity, string> = { critical: colors.bad, high: colors.bad, medium: colors.warn, low: colors.muted };
const TONE_COLOR: Record<FacilityTone, string> = { secure: colors.good, watch: colors.warn, alarm: colors.bad, locked: colors.accent };
const RESULT_COLOR: Record<DoorResult, string> = { granted: colors.muted, denied: colors.warn, forced: colors.bad, held: colors.warn, tailgate: colors.bad };

export function FacilityPanel({ v, onRead }: { v: FacilityView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View accessible focusable accessibilityLabel={`${v.site.name}: ${v.site.status}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
        <H3>{v.site.name}</H3>
        <Muted>{v.site.status}</Muted>
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>{`Alarm panel (${v.openCount} open)`}</H3>
        {v.alarms.length ? null : <Muted>No alarms.</Muted>}
        {v.alarms.map((a) => (
          <Row key={a.id} a11y={`${a.open ? "Open. " : ""}${a.a11y}`} strong={a.open} color={a.open ? SEVERITY_COLOR[a.severity] : undefined}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Pill text={ALARM_KIND_WORDS[a.kind]} color={SEVERITY_COLOR[a.severity]} />
              <Muted style={{ fontSize: 12 }}>{`${a.time} · ${a.status}`}</Muted>
            </View>
            <Body style={{ fontWeight: a.open ? "700" : "400" }}>{a.title}</Body>
            {a.detail ? <Muted>{a.detail}</Muted> : null}
          </Row>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Zones</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.zones.map((z) => (
            <View
              key={z.id}
              accessible
              focusable
              accessibilityLabel={z.a11y}
              style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: z.tone === "secure" ? colors.borderLight : TONE_COLOR[z.tone], borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
                <Muted style={{ fontSize: 12 }}>{z.kind}</Muted>
                <Pill text={FACILITY_TONE_WORDS[z.tone]} color={TONE_COLOR[z.tone]} />
              </View>
              <Body style={{ fontWeight: "700" }}>{z.label}</Body>
              <Muted>{z.status}</Muted>
            </View>
          ))}
        </View>
      </View>
      {v.environment.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>Environment</H3>
          {v.environment.map((e) => (
            <Row key={e.id} a11y={e.a11y} strong={!!e.out} color={e.out ? colors.bad : undefined}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
                <Body>{e.label}</Body>
                <Body style={{ fontWeight: "700", color: e.out ? colors.bad : colors.text }}>{`${e.text}${e.out ? ` (too ${e.out})` : ""}`}</Body>
              </View>
            </Row>
          ))}
        </View>
      ) : null}
      {v.cameras.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>Cameras</H3>
          {v.cameras.map((c) => (
            <Row key={c.id} a11y={c.a11y}>
              <Muted style={{ fontSize: 12 }}>{c.label}</Muted>
              <Body>{c.view}</Body>
            </Row>
          ))}
        </View>
      ) : null}
      {v.people.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>People on site</H3>
          {v.people.map((p) => (
            <Row key={p.id} a11y={p.a11y} strong={p.flag} color={p.flag ? colors.warn : undefined}>
              {p.flag ? <Pill text="needs attention" color={colors.warn} /> : null}
              <Body style={{ fontWeight: "700" }}>{p.label}</Body>
              <Muted>{p.status}</Muted>
            </Row>
          ))}
        </View>
      ) : null}
      <Meters meters={v.meters} />
      <View style={{ gap: spacing.xs }}>
        <H3>Badge and door log</H3>
        {v.doors.length ? null : <Muted>Nothing logged yet.</Muted>}
        {v.doors.map((d) => (
          <View key={d.id} accessible focusable accessibilityLabel={d.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2, gap: 2 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Muted style={{ fontSize: 12 }}>{`${d.time} · ${d.reader}`}</Muted>
              <Pill text={DOOR_RESULT_WORDS[d.result]} color={RESULT_COLOR[d.result]} />
            </View>
            <Body>{d.text}</Body>
          </View>
        ))}
      </View>
      <Button label="Read the facility" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the open alarms, the zones, the environment and the latest door log line aloud" />
    </Card>
  );
}

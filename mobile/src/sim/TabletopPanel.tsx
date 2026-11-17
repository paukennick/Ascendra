import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { COMMS_WORDS, ROLE_WORDS, type TabletopView } from "./runtime/tabletopView.ts";
import type { CommsTone, RoleTone } from "./engine/v1/types.ts";

// REQ-313 (docs/sims.md 13, 22.26): the tabletop exercise. Four blocks in
// reading order and web keyboard order: the injects (the facilitator's
// timeline, oldest first; one waiting for a decision has a border and the
// words "Waiting for a decision"), the roles around the table, the
// communications by audience, then the meters and the decision log. Each is
// one accessible element whose label says its state in words; tone is a word
// plus a color, never color alone. Every element is at least 48 dp. "Read the
// table" speaks the whole screen. Decisions are the scenario's action groups
// (ActionBar), not part of this panel, so it holds no rule.

const ROLE_COLOR: Record<RoleTone, string> = { engaged: colors.good, waiting: colors.muted, gap: colors.bad };
const COMMS_COLOR: Record<CommsTone, string> = { none: colors.muted, draft: colors.warn, cleared: colors.accent, sent: colors.good, late: colors.bad };

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

function Tile({ label, a11y, status, word, color, plain }: { label: string; a11y: string; status: string; word: string; color: string; plain: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: plain ? colors.borderLight : color, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
    >
      <Pill text={word} color={color} />
      <Body style={{ fontWeight: "700" }}>{label}</Body>
      {status ? <Muted>{status}</Muted> : null}
    </View>
  );
}

export function TabletopPanel({ v, onRead }: { v: TabletopView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <H3>{`Injects (${v.openCount} waiting for a decision)`}</H3>
        {v.injects.length ? null : <Muted>The facilitator has not read an inject yet.</Muted>}
        {v.injects.map((j) => (
          <View
            key={j.id}
            accessible
            accessibilityLabel={j.a11y}
            style={{ minHeight: MIN_TOUCH, borderWidth: j.open ? 2 : 1, borderColor: j.open ? colors.warn : colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
          >
            <Muted style={{ fontSize: 12 }}>{j.open ? `${j.time} · Waiting for a decision` : j.time}</Muted>
            <Body style={{ fontWeight: j.open ? "700" : "400" }}>{j.title}</Body>
            <Muted>{j.text}</Muted>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Around the table</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.roles.map((r) => (
            <Tile key={r.id} label={r.label} a11y={r.a11y} status={r.status} word={ROLE_WORDS[r.tone]} color={ROLE_COLOR[r.tone]} plain={r.tone === "waiting"} />
          ))}
        </View>
      </View>
      {v.comms.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>Communications</H3>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {v.comms.map((c) => (
              <Tile key={c.id} label={c.label} a11y={c.a11y} status={c.status} word={COMMS_WORDS[c.tone]} color={COMMS_COLOR[c.tone]} plain={c.tone === "none"} />
            ))}
          </View>
        </View>
      ) : null}
      {v.meters.map((m) => (
        <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
          <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
          <Body>{m.text}</Body>
        </View>
      ))}
      {v.decisions && v.decisions.items.length ? (
        <View accessible accessibilityLabel={`${v.decisions.label}: ${v.decisions.items.join(". ")}`} style={{ gap: 2 }}>
          <H3>{v.decisions.label}</H3>
          {v.decisions.items.map((it) => <Muted key={it}>{it}</Muted>)}
        </View>
      ) : null}
      <Button label="Read the table" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the waiting injects, the roles, the communications and the latest decision aloud" />
    </Card>
  );
}

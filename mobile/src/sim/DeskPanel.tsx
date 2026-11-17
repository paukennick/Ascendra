import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { DESK_TONE_WORDS, KIND_WORDS, type DeskView } from "./runtime/deskView.ts";
import type { DeskTone } from "./engine/v1/types.ts";

// REQ-311 (docs/sims.md 13, 22.24): the ITIL service desk. Blocks in reading
// order (and web keyboard order): the queue (open tickets first, then by
// priority and due time), the services, and the priority matrix the learner
// assigns priority by, with its service level targets. Each ticket, service
// and matrix row is one accessible element whose label says its state in
// words; priority, a breach and a service's tone are a word plus a color,
// never color alone. Every element is at least 48 dp (MIN_TOUCH). "Read the
// queue" speaks the whole screen. Classifying, escalating, raising a problem
// or a change are the scenario's action groups (ActionBar), so the panel
// holds no rule.

const TONE_COLOR: Record<DeskTone, string> = { ok: colors.good, degraded: colors.warn, down: colors.bad, maintenance: colors.accent };

function priorityColor(p: number): string {
  return p === 1 ? colors.bad : p === 2 ? colors.warn : p >= 3 ? colors.accent : colors.muted;
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

export function DeskPanel({ v, onRead }: { v: DeskView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <H3>{`Queue (${v.openCount} open${v.breachedCount ? `, ${v.breachedCount} breached` : ""})`}</H3>
        {v.tickets.length ? null : <Muted>The queue is empty.</Muted>}
        {v.tickets.map((t) => (
          <View
            key={t.id}
            accessible
            accessibilityLabel={t.a11y}
            style={{ minHeight: MIN_TOUCH, borderWidth: t.breached ? 2 : 1, borderColor: t.breached ? colors.bad : t.open ? priorityColor(t.priority) : colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2, opacity: t.open ? 1 : 0.75 }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Pill text={t.priorityText} color={priorityColor(t.priority)} />
              {t.breached ? <Pill text="Breached" color={colors.bad} /> : null}
              <Muted style={{ fontSize: 12 }}>{`${KIND_WORDS[t.kind]} ${t.ref} · opened ${t.opened}`}</Muted>
            </View>
            <Body style={{ fontWeight: t.open ? "700" : "400" }}>{t.title}</Body>
            <Muted>{`Impact ${t.impactWord} · urgency ${t.urgencyWord} · ${t.dueText}`}</Muted>
            <Muted>{`${t.status}${t.assignee ? ` · ${t.assignee}` : ""}`}</Muted>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Services</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.services.map((s) => (
            <View
              key={s.id}
              accessible
              accessibilityLabel={s.a11y}
              style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: MIN_TOUCH, borderWidth: s.tone === "down" ? 2 : 1, borderColor: s.tone === "ok" ? colors.borderLight : TONE_COLOR[s.tone], borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
            >
              <Pill text={DESK_TONE_WORDS[s.tone]} color={TONE_COLOR[s.tone]} />
              <Body style={{ fontWeight: "700" }}>{s.label}</Body>
              <Muted>{s.status}</Muted>
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
      <View style={{ gap: spacing.xs }} accessible accessibilityLabel={v.matrix.a11y}>
        <H3>Priority matrix</H3>
        <View style={{ flexDirection: "row", gap: 2 }}>
          <View style={{ flex: 1.4 }}>
            <Muted style={{ fontSize: 12 }}>Impact by urgency</Muted>
          </View>
          {v.matrix.urgencies.map((u) => (
            <View key={u} style={{ flex: 1 }}>
              <Muted style={{ fontSize: 12, fontWeight: "700" }}>{u}</Muted>
            </View>
          ))}
        </View>
        {v.matrix.impacts.map((imp, r) => (
          <View key={imp} style={{ flexDirection: "row", gap: 2, minHeight: 28, alignItems: "center" }}>
            <View style={{ flex: 1.4 }}>
              <Muted style={{ fontSize: 12, fontWeight: "700" }}>{imp}</Muted>
            </View>
            {v.matrix.urgencies.map((u, c) => {
              const p = v.matrix.priorities[r]?.[c] ?? 0;
              return (
                <View key={u} style={{ flex: 1 }}>
                  <Pill text={`P${p}`} color={priorityColor(p)} />
                </View>
              );
            })}
          </View>
        ))}
        <Muted style={{ fontSize: 12 }}>{v.matrix.targets.map((t) => `P${t.priority}: ${t.label}`).join(" · ")}</Muted>
      </View>
      <Button label="Read the queue" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the open tickets, their priority and due times, and the services aloud" />
    </Card>
  );
}

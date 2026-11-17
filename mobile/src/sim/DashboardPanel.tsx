import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import type { DashChartView, DashboardView } from "./runtime/dashboardView.ts";

// REQ-311 (docs/sims.md 13, 20, 22.24): the project dashboard, in predictive
// or Sprint mode. Blocks in reading order (and web keyboard order): the
// heading and the commitments (Product Goal, Sprint Goal, Definition of Done;
// or the project's objective), the board by column, the chart with its
// summary in words, the open impediments or risks, the people as gauges read
// in words, and the events (Daily Scrums, Review, Retrospective; or
// milestones). Each element is one accessible element whose label says its
// state in words; a flag or an open impediment is a word plus a color, never
// color alone. Every element is at least 48 dp (MIN_TOUCH). "Read the
// dashboard" speaks the whole screen. The learner acts through the
// scenario's action groups (ActionBar), so the panel holds no rule.

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

const CHART_HEIGHT = 96;

// A bar per slot for each actual series and a marker for each plan line at
// the same slot. The picture is decorative for the screen reader: the summary
// and the per-slot text below it carry the same numbers.
function Chart({ c }: { c: DashChartView }) {
  const max = c.max > 0 ? c.max : 1;
  const actual = c.series.filter((s) => s.style === "actual");
  const plan = c.series.filter((s) => s.style === "plan");
  const rows = Array.from({ length: c.slots }, (_, i) => {
    const vals = c.series.map((s) => (s.points[i] === null || s.points[i] === undefined ? null : `${s.label} ${Math.round((s.points[i] as number) * 10) / 10}`)).filter(Boolean);
    return vals.length ? `${c.slotLabel} ${i + 1}: ${vals.join(", ")}` : null;
  }).filter(Boolean) as string[];
  return (
    <View style={{ gap: spacing.xs }}>
      <H3>{c.label}</H3>
      <View accessible accessibilityLabel={c.summary} style={{ minHeight: MIN_TOUCH }}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_HEIGHT, gap: 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          {Array.from({ length: c.slots }, (_, i) => (
            <View key={i} style={{ flex: 1, height: CHART_HEIGHT, justifyContent: "flex-end", flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
              {actual.map((s) => {
                const v = s.points[i];
                return <View key={s.id} style={{ flex: 1, height: v === null || v === undefined ? 0 : Math.max(1, Math.round((v / max) * CHART_HEIGHT)), backgroundColor: colors.accent, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />;
              })}
              {plan.map((s) => {
                const v = s.points[i];
                return v === null || v === undefined ? null : (
                  <View key={s.id} style={{ position: "absolute", left: 0, right: 0, bottom: Math.round((v / max) * CHART_HEIGHT), height: 2, backgroundColor: colors.warn }} />
                );
              })}
            </View>
          ))}
        </View>
        <Muted style={{ fontSize: 12 }}>{`${actual.map((s) => `Bars: ${s.label}`).join("; ")}${plan.length ? `; lines: ${plan.map((s) => s.label).join(", ")}` : ""} (${c.unit}, by ${c.slotLabel.toLowerCase()})`}</Muted>
        <Body>{c.summary}</Body>
      </View>
      {rows.length ? <Muted style={{ fontSize: 12 }}>{rows.join(" · ")}</Muted> : null}
    </View>
  );
}

export function DashboardPanel({ v, onRead }: { v: DashboardView | null; onRead: () => void }) {
  if (!v) return null;
  const sprint = v.mode === "sprint";
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <View accessible accessibilityRole="header" accessibilityLabel={v.heading} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
          <H3>{v.heading}</H3>
        </View>
        {v.commitments.map((c) => (
          <View key={c.id} accessible accessibilityLabel={c.a11y} style={{ minHeight: MIN_TOUCH, borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: spacing.sm, justifyContent: "center" }}>
            <Muted style={{ fontSize: 12 }}>{c.label}</Muted>
            <Body>{c.text}</Body>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>{sprint ? (v.flagCount ? `Sprint Backlog (${v.flagCount} blocked)` : "Sprint Backlog") : v.flagCount ? `Work (${v.flagCount} at risk)` : "Work"}</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.columns.map((c) => (
            <View key={c.id} style={{ flexGrow: 1, flexBasis: "30%", minWidth: 150, gap: spacing.xs }}>
              <View accessible accessibilityRole="header" accessibilityLabel={c.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
                <Muted style={{ fontWeight: "700" }}>{`${c.label} (${c.items.length})`}</Muted>
              </View>
              {c.items.map((it) => (
                <View
                  key={it.id}
                  accessible
                  accessibilityLabel={it.a11y}
                  style={{ minHeight: MIN_TOUCH, borderWidth: it.flag ? 2 : 1, borderColor: it.flag ? colors.bad : colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
                    {it.flag ? <Pill text={sprint ? "Blocked" : "At risk"} color={colors.bad} /> : null}
                    {it.size ? <Muted style={{ fontSize: 12 }}>{it.size}</Muted> : null}
                  </View>
                  <Body>{it.label}</Body>
                  {it.note ? <Muted>{it.note}</Muted> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
      {v.chart ? <Chart c={v.chart} /> : null}
      <View style={{ gap: spacing.xs }}>
        <H3>{sprint ? `Impediments (${v.openCount} open)` : `Risks and issues (${v.openCount} open)`}</H3>
        {v.issues.length ? null : <Muted>{sprint ? "No impediments raised." : "Nothing raised."}</Muted>}
        {v.issues.map((x) => (
          <View
            key={x.id}
            accessible
            accessibilityLabel={x.a11y}
            style={{ minHeight: MIN_TOUCH, borderWidth: x.open ? 2 : 1, borderColor: x.open ? colors.warn : colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Pill text={x.open ? "Open" : "Closed"} color={x.open ? colors.warn : colors.muted} />
              <Muted style={{ fontSize: 12 }}>{`${x.time} · ${x.status}`}</Muted>
            </View>
            <Body style={{ fontWeight: x.open ? "700" : "400" }}>{x.label}</Body>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>People</H3>
        {v.people.map((g) => (
          <View key={g.id} accessible accessibilityLabel={g.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center", gap: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
              <Muted>{g.label}</Muted>
              <Body style={{ fontWeight: "700" }}>{g.word}</Body>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${Math.round(g.fraction * 100)}%`, height: 6, backgroundColor: colors.accent }} />
            </View>
          </View>
        ))}
        {v.meters.map((m) => (
          <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
            <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
            <Body>{m.text}</Body>
          </View>
        ))}
      </View>
      {v.events.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>{sprint ? "Events" : "Milestones"}</H3>
          {v.events.map((e) => (
            <View key={e.id} accessible accessibilityLabel={e.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 }}>
              <Muted style={{ fontSize: 12 }}>{`${e.time} · ${e.label}`}</Muted>
              <Body>{e.status}</Body>
            </View>
          ))}
        </View>
      ) : null}
      <Button label="Read the dashboard" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel={sprint ? "Read the Sprint Goal, the board, the burn-down, the impediments and the people aloud" : "Read the objective, the work, the chart, the issues and the people aloud"} />
    </Card>
  );
}

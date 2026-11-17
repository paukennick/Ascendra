import React from "react";
import { View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { APPETITE_WORDS, RATING_WORDS, type GovernanceView } from "./runtime/governanceView.ts";
import type { AppetiteTone, RiskRating } from "./engine/v1/types.ts";

// REQ-313 (docs/sims.md 13, 22.26): the governance board. Four blocks in
// reading order and web keyboard order: the risk register (above appetite
// first), stakeholder support, the budget and meters, then the docket. Each
// risk, stakeholder, docket item and meter is one accessible element whose
// label says its state in words; rating and appetite are a word plus a color,
// never color alone. Every element is at least 48 dp (MIN_TOUCH). "Read the
// board" speaks the whole screen. The quarter's decisions are the scenario's
// action groups (ActionBar), not part of this panel, so it holds no rule.

const RATING_COLOR: Record<RiskRating, string> = { critical: colors.bad, high: colors.bad, medium: colors.warn, low: colors.muted };
const APPETITE_COLOR: Record<AppetiteTone, string> = { within: colors.good, above: colors.bad, excepted: colors.warn };

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

export function GovernancePanel({ v, onRead }: { v: GovernanceView | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <H3>{`Risk register (${v.aboveCount} above appetite)`}</H3>
        {v.risks.map((r) => (
          <View
            key={r.id}
            accessible
            accessibilityLabel={r.a11y}
            style={{ minHeight: MIN_TOUCH, borderWidth: r.appetite === "above" ? 2 : 1, borderColor: r.appetite === "within" ? colors.borderLight : APPETITE_COLOR[r.appetite], borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" }}>
              <Pill text={RATING_WORDS[r.rating]} color={RATING_COLOR[r.rating]} />
              <Pill text={APPETITE_WORDS[r.appetite]} color={APPETITE_COLOR[r.appetite]} />
            </View>
            <Body style={{ fontWeight: r.appetite === "above" ? "700" : "400" }}>{r.label}</Body>
            <Muted>{`Owner: ${r.owner}`}</Muted>
            {r.status ? <Muted>{r.status}</Muted> : null}
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Support</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.stakeholders.map((k) => (
            <View
              key={k.id}
              accessible
              accessibilityLabel={k.a11y}
              style={{ flexGrow: 1, flexBasis: "45%", minWidth: 140, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 4 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
                <Muted style={{ fontSize: 12 }}>{k.label}</Muted>
                <Muted style={{ fontSize: 12 }}>{k.value === null ? "--" : `${Math.round(k.value)} of ${k.max}`}</Muted>
              </View>
              <Body style={{ fontWeight: "700" }}>{k.word}</Body>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
                <View style={{ width: `${Math.round(k.fraction * 100)}%`, height: 6, backgroundColor: colors.accent }} />
              </View>
            </View>
          ))}
        </View>
      </View>
      {v.budget ? (
        <View accessible accessibilityLabel={v.budget.a11y} style={{ minHeight: MIN_TOUCH, gap: 4, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs, flexWrap: "wrap" }}>
            <Muted style={{ fontSize: 12 }}>{v.budget.label}</Muted>
            {v.budget.over ? <Pill text="Over budget" color={colors.bad} /> : null}
          </View>
          <Body>{v.budget.text}</Body>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(v.budget.fraction * 100)}%`, height: 6, backgroundColor: v.budget.over ? colors.bad : colors.accent }} />
          </View>
        </View>
      ) : null}
      {v.meters.map((m) => (
        <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
          <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
          <Body>{m.text}</Body>
        </View>
      ))}
      <View style={{ gap: spacing.xs }}>
        <H3>Docket</H3>
        {v.docket.length ? null : <Muted>Nothing on the docket yet.</Muted>}
        {v.docket.map((d) => (
          <View
            key={d.id}
            accessible
            accessibilityLabel={d.a11y}
            style={{ minHeight: MIN_TOUCH, justifyContent: "center", borderWidth: d.flag ? 2 : 0, borderBottomWidth: d.flag ? 2 : 1, borderColor: d.flag ? colors.bad : "transparent", borderBottomColor: d.flag ? colors.bad : colors.border, borderRadius: d.flag ? radius.sm : 0, padding: d.flag ? spacing.sm : 0, paddingVertical: 2 }}
          >
            <Muted style={{ fontSize: 12 }}>{d.flag ? `Needs attention · ${d.kind}` : d.kind}</Muted>
            <Body>{d.label}</Body>
            {d.status ? <Muted>{d.status}</Muted> : null}
          </View>
        ))}
      </View>
      <Button label="Read the board" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the risk register, support, budget and docket aloud" />
    </Card>
  );
}

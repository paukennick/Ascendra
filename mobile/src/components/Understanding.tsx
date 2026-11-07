import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { Body, Button, Card, H3, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import {
  cardSubtitle,
  comparisonRows,
  conceptList,
  explainBackOpen,
  offerRefresherAfter,
  refresherPrompt,
  rowAccessibilityLabel,
  type ComparisonSet,
  type Diagnosis,
} from "@/lib/understanding";

// REQ-111: small, optional pieces the lesson screen shows -- a named
// misconception after a miss, a prerequisite refresher offer, and links to
// comparison cards and explain-it-back on the done card -- plus the
// comparison card itself. Each is self-contained (fetches its own data and
// renders nothing when there is nothing to offer), so the lesson screen only
// places them.

// One sentence naming the likely mix-up. Framed as information.
export function MisconceptionNote({ diagnosis }: { diagnosis?: Diagnosis | null }) {
  if (!diagnosis?.sentence) return null;
  return (
    <View
      accessible
      accessibilityLabel={`Likely mix-up: ${diagnosis.sentence}`}
      style={{
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.cardAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Feather name="compass" size={16} color={colors.secondary} style={{ marginTop: 2 }} />
      <Body style={{ flex: 1 }}>{diagnosis.sentence}</Body>
    </View>
  );
}

interface Offer {
  prerequisite: { id: string; title: string };
  status: string;
  refresher: string;
  minutes: number;
  trimmed: boolean;
}

// After a miss: "this builds on X -- want a quick refresher?" Shows nothing
// unless the server finds a weak prerequisite with cached teaching.
export function RefresherOffer({ objectiveId, verdict }: { objectiveId: string; verdict?: string | null }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);
  const show = offerRefresherAfter(verdict);
  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    api
      .get<{ offer: Offer | null }>(`/api/objectives/${objectiveId}/refresher`)
      .then((res) => {
        if (!cancelled) setOffer(res.offer);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [objectiveId, show]);
  if (!show || !offer) return null;

  function openRefresher() {
    setOpen(true);
    // Recorded so we can tell whether refreshers help; never blocks reading.
    api.post(`/api/objectives/${objectiveId}/refresher`, { prerequisiteId: offer!.prerequisite.id }).catch(() => undefined);
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      {!open ? (
        <>
          <Body>{refresherPrompt(offer.prerequisite.title, offer.minutes)}</Body>
          <Button label="Show the refresher" icon="book-open" variant="ghost" onPress={openRefresher} />
        </>
      ) : (
        <>
          <View accessibilityRole="header">
            <H3>Refresher: {offer.prerequisite.title}</H3>
          </View>
          <Body>{offer.refresher}</Body>
          {offer.trimmed ? <Muted>The full lesson for this objective has more.</Muted> : null}
          <Muted>When you're ready, try the question again — this was the groundwork for it.</Muted>
        </>
      )}
    </Card>
  );
}

// Done card: optional next steps that deepen understanding.
export function UnderstandingActions({
  trackId,
  objectiveId,
  objectiveTitle,
  status,
}: {
  trackId: string;
  objectiveId: string;
  objectiveTitle?: string;
  status: string | null;
}) {
  const router = useRouter();
  const [hasCards, setHasCards] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ sets: ComparisonSet[] }>(`/api/courses/${trackId}/comparisons?objectiveId=${objectiveId}`)
      .then((res) => {
        if (!cancelled) setHasCards(res.sets.length > 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [trackId, objectiveId]);
  const canExplain = explainBackOpen(status);
  if (!canExplain && !hasCards) return null;
  return (
    <View style={{ gap: spacing.sm, alignSelf: "stretch" }}>
      <Muted style={{ textAlign: "center" }}>Optional: go a little deeper</Muted>
      {canExplain ? (
        <Button
          label="Explain it back"
          icon="edit-3"
          variant="ghost"
          accessibilityLabel="Explain it back in your own words"
          onPress={() =>
            router.push({ pathname: `/course/${trackId}/explain/${objectiveId}`, params: { objectiveTitle: objectiveTitle ?? "" } })
          }
        />
      ) : null}
      {hasCards ? (
        <Button
          label="Compare look-alikes"
          icon="columns"
          variant="ghost"
          onPress={() => router.push({ pathname: `/course/${trackId}/compare`, params: { objectiveId } })}
        />
      ) : null}
    </View>
  );
}

// The comparison card: concepts side by side, one dimension at a time.
export function ComparisonCard({ set }: { set: ComparisonSet }) {
  const names = set.concepts.map((c) => c.name);
  const subtitle = cardSubtitle(set);
  return (
    <View style={{ gap: spacing.sm }}>
      <View accessibilityRole="header">
        <H3>{conceptList(names)}</H3>
      </View>
      {subtitle ? <Muted>{subtitle}</Muted> : null}
      {set.howToTell ? (
        <View
          style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
          accessible
          accessibilityLabel={`How to tell them apart: ${set.howToTell}`}
        >
          <Feather name="key" size={15} color={colors.accent} style={{ marginTop: 3 }} />
          <Body style={{ flex: 1, fontFamily: fonts.bodyBold }}>{set.howToTell}</Body>
        </View>
      ) : null}
      {comparisonRows(set).map((row) => (
        <View
          key={row.dimension}
          accessible
          accessibilityLabel={rowAccessibilityLabel(row)}
          style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 }}
        >
          <Muted style={{ fontFamily: fonts.bodyBold, color: colors.text }}>{row.dimension}</Muted>
          {row.cells.map((cell) => (
            <View key={cell.concept} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Muted style={{ color: colors.secondary, fontFamily: fonts.bodyBold }}>{cell.concept}:</Muted>
              <Body style={{ flexShrink: 1 }}>{cell.value}</Body>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

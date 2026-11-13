import React from "react";
import { Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Badge, Card, FavoriteButton, H2, Muted, ProgressBar } from "@/components/ui";
import { colors, getCourseIcon, spacing } from "@/lib/theme";
import type { Track } from "@/types";
import { simBadge } from "@/lib/courseSims";

type IconName = React.ComponentProps<typeof Feather>["name"];

// REQ-036/038: freshness badge labels/colors, mirroring view_content_freshness's
// own status values rather than inventing new ones.
const freshnessLabel: Record<string, string> = {
  current: "Verified",
  review_due: "Review due",
  unverified: "Unverified",
};
const freshnessColor: Record<string, string> = {
  current: colors.good,
  review_due: colors.warn,
  unverified: colors.mutedDim,
};

// Certification vs. Course: driven directly by track_type rather than a new
// field -- "certification" tracks are exam prep tied to a vendor/body's own
// blueprint; every other track_type (graduate/academic/professional/skills)
// is a course with no external exam behind it.
function contentKindLabel(trackType: string): string {
  return trackType === "certification" ? "Certification" : "Course";
}

export function CourseCard({
  track,
  onPress,
  onToggleFavorite,
}: {
  track: Track;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const { emoji, icon, accent, iconColor } = getCourseIcon(track);
  // REQ-249: a course with sims says so. The badge row below is left out of
  // the reading order, so the button's own label carries "Has N simulations".
  const sims = simBadge(track);
  return (
    // REQ-206 (FAIL-933): the star used to sit inside a pressable Card, a
    // button inside a button (43 axe "nested-interactive" hits on Explore, and
    // a screen reader could not reach the star). The card is now a plain
    // surface: the title area is the one button that opens the course, the
    // star is its sibling, and the lower half is a mouse/touch extension of the
    // same button that is left out of the tab order and the reading order.
    <Card>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${track.title}, ${track.code}. ${track.mastered_objectives ?? 0} of ${track.total_objectives ?? 0} objectives at Independent or above.${sims ? ` ${sims.accessibilityLabel}.` : ""}`}
          style={({ pressed }) => [{ flex: 1, flexDirection: "row", gap: spacing.md, alignItems: "flex-start", minHeight: 48 }, pressed && { opacity: 0.75 }]}
        >
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent) }]}>
          {emoji ? (
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
          ) : (
            <Feather name={icon as IconName} size={18} color={iconColor} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <H2>{track.title}</H2>
          <Muted>
            {track.code}
            {track.subcategory_name ? ` · ${track.subcategory_name}` : ""}
          </Muted>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedDim} />
        </Pressable>
        <FavoriteButton active={!!track.is_favorite} onPress={onToggleFavorite} size={32} />
      </View>
      <Pressable onPress={onPress} accessible={false} focusable={false} style={{ gap: spacing.sm }}>
      <ProgressBar percent={track.percent_progress ?? 0} />
      {/* REQ-249: the row wraps, so a fourth badge (sims) never pushes the
          others off a narrow phone. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", rowGap: 6 }}>
        <Muted>
          {track.mastered_objectives ?? 0}/{track.total_objectives ?? 0} objectives at Independent+
        </Muted>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {/* The same "activity" icon as the course page's Simulations button. */}
          {sims ? <Badge label={sims.label} color={colors.accent} icon="activity" /> : null}
          <Badge label={contentKindLabel(track.track_type)} color={colors.mutedDim} />
          {track.freshness_status ? (
            <Badge
              label={freshnessLabel[track.freshness_status] ?? track.freshness_status}
              color={freshnessColor[track.freshness_status] ?? colors.mutedDim}
            />
          ) : null}
          <Badge
            label={track.percent_progress != null ? `${track.percent_progress}%` : "Not started"}
            color={track.percent_progress ? colors.good : colors.mutedDim}
          />
        </View>
      </View>
      </Pressable>
    </Card>
  );
}

function withAlpha(hex: string): string {
  // Same 0.16-alpha tint Badge uses, so a card's icon chip reads as a soft
  // wash of its accent color rather than a flat block -- consistent with
  // the "brand color scarce and intentional" rule, not a colored card.
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
}

const styles = {
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};

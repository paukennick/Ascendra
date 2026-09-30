import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Badge, Card, FavoriteButton, H2, Muted, ProgressBar } from "@/components/ui";
import { categoryAccent, categoryIcon, colors, courseAccent, courseEmoji, spacing, trackTypeIcon } from "@/lib/theme";
import type { Track } from "@/types";

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

// Icon + accent lookup, in order of specificity: a course's own hand-picked
// emoji (the original nine tracks) -> its category's icon/accent (everything
// else, scales as new tracks land in an existing category) -> a generic
// track_type icon (a track with no category at all).
function courseIcon(track: Track): { emoji?: string; icon: IconName; accent: string } {
  const emoji = courseEmoji[track.code];
  if (emoji) return { emoji, icon: "book", accent: courseAccent[track.code] ?? colors.accent };
  const catSlug = track.category_slug ?? undefined;
  if (catSlug && categoryIcon[catSlug]) {
    return { icon: categoryIcon[catSlug] as IconName, accent: categoryAccent[catSlug] ?? colors.accent };
  }
  return { icon: (trackTypeIcon[track.track_type] ?? "book") as IconName, accent: colors.accent };
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
  const { emoji, icon, accent } = courseIcon(track);
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent) }]}>
          {emoji ? (
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
          ) : (
            <Feather name={icon} size={18} color={accent} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <H2>{track.title}</H2>
          <Muted>
            {track.code}
            {track.subcategory_name ? ` · ${track.subcategory_name}` : ""}
          </Muted>
        </View>
        <FavoriteButton active={!!track.is_favorite} onPress={onToggleFavorite} size={32} />
        <Feather name="chevron-right" size={20} color={colors.mutedDim} />
      </View>
      <ProgressBar percent={track.percent_progress ?? 0} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Muted>
          {track.mastered_objectives ?? 0}/{track.total_objectives ?? 0} objectives at Independent+
        </Muted>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
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

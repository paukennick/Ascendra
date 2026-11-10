import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { Card, H2, Muted } from "@/components/ui";
import { colors, fonts, spacing } from "@/lib/theme";
import { neighbourRows, parsePaths, stepLine, stepOfLine, type CoursePath } from "@/lib/studyPath";

// REQ-198: "Recommended before / Recommended after" on a course that sits
// on a study path (backend supabase/seed/paths.ts), with the whole path in
// order. Hidden for a course on no path, and hidden if the request fails:
// the course works without it.
export function StudyPathPanel({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [paths, setPaths] = useState<CoursePath[]>([]);

  useFocusEffect(
    useCallback(() => {
      api
        .get<unknown>(`/api/courses/${encodeURIComponent(trackId)}/path`)
        .then((r) => setPaths(parsePaths(r)))
        .catch(() => setPaths([]));
    }, [trackId])
  );

  if (!paths.length) return null;
  return (
    <>
      {paths.map((path) => (
        <Card key={path.slug}>
          <H2>{path.title}</H2>
          <Muted style={{ fontSize: 12 }}>
            For: {path.audience.toLowerCase()}
            {stepOfLine(path) ? `  ·  ${stepOfLine(path)}` : ""}
          </Muted>

          {neighbourRows(path).map((row) => (
            <Pressable
              key={row.kind}
              accessibilityRole="button"
              accessibilityLabel={row.a11y}
              onPress={() => router.push(`/course/${row.step.trackId}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <Feather name={row.kind === "before" ? "arrow-left" : "arrow-right"} size={18} color={colors.text} />
              <View style={{ flex: 1, gap: 2 }}>
                <Muted style={{ fontSize: 12, color: colors.text, fontFamily: fonts.bodyBold }}>{row.label}</Muted>
                <Muted style={{ color: colors.text }}>{row.step.title}</Muted>
                <Muted style={{ fontSize: 12 }}>{row.step.when}</Muted>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedDim} />
            </Pressable>
          ))}

          <View style={{ gap: 2, marginTop: spacing.sm }} accessibilityLabel={`The full path, in order: ${path.steps.map((s) => s.title).join(", then ")}`}>
            {path.steps.map((s) => (
              <Muted
                key={s.trackId}
                style={{ fontSize: 12, color: s.current ? colors.text : colors.muted, fontFamily: s.current ? fonts.bodyBold : undefined }}
              >
                {stepLine(s)}
              </Muted>
            ))}
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = {
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 8,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
};

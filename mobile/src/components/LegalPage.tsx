// REQ-093: renders one document from src/content/legal.ts. Every legal page
// is this component plus a document, so the text has one home.
import React from "react";
import { View } from "react-native";
import { Screen, H1, H2, Body, Muted } from "@/components/ui";
import { spacing } from "@/lib/theme";
import type { LegalDoc } from "@/content/legal";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <Screen>
      <H1>{doc.title}</H1>
      <Muted style={{ marginTop: spacing.xs }}>
        Last updated {doc.updated}.
      </Muted>
      {doc.intro ? <Body style={{ marginTop: spacing.md }}>{doc.intro}</Body> : null}
      {doc.sections.map((s) => (
        <View key={s.title} style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <H2>{s.title}</H2>
          {s.body.map((p, i) =>
            p.startsWith("• ") ? (
              <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 4 }}>
                <Body>•</Body>
                <Body style={{ flex: 1 }}>{p.slice(2)}</Body>
              </View>
            ) : (
              <Body key={i}>{p}</Body>
            )
          )}
        </View>
      ))}
    </Screen>
  );
}

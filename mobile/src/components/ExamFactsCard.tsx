import React from "react";
import { View } from "react-native";
import { Body, Card, H3, Muted } from "@/components/ui";
import { colors, fonts, spacing } from "@/lib/theme";
import { domainLine, examFactRows, type ExamFactsPayload } from "@/lib/examFacts";

// REQ-319: the exam's published facts at the top of an unbranded course's
// page (src/lib/examFacts.ts). Facts, not names: question count, time,
// adaptive or linear, the passing standard as published, eligibility, and the
// domains with their weights.
export function ExamFactsCard({ facts }: { facts: ExamFactsPayload }) {
  const rows = examFactRows(facts);
  return (
    <Card>
      <H3>{facts.heading}</H3>
      {facts.reference ? <Body>{facts.reference.line}</Body> : null}
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 2 }} accessible accessibilityLabel={`${r.label}: ${r.value}`}>
          <Muted style={{ fontSize: 12, color: colors.text, fontFamily: fonts.bodyBold }}>{r.label}</Muted>
          <Muted style={{ fontSize: 12 }}>{r.value}</Muted>
        </View>
      ))}
      {facts.domains.length ? (
        <View style={{ gap: 2, marginTop: spacing.xs }}>
          <Muted style={{ fontSize: 12, color: colors.text, fontFamily: fonts.bodyBold }}>Domains and weights</Muted>
          {facts.domains.map((d) => (
            <Muted key={d.name} style={{ fontSize: 12 }}>
              {domainLine(d)}
            </Muted>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

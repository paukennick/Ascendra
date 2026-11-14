import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Body, Button, H3, Muted } from "@/components/ui";
import { spacing } from "@/lib/theme";
import type { MockStartSummary } from "@/lib/examPractice";
import type { ExamMockInfo } from "@/types/exam";

// REQ-298: what the real exam behind a mock is, said before the learner
// starts: its length, how it reports a result (and what we do not claim), what
// the mock cannot show, how the clock behaves, and where each fact was read
// and when. Plain sentences, no table, so it reads on a phone and aloud.
export function ExamStartFacts({ summary, mock }: { summary: MockStartSummary; mock: ExamMockInfo | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <H3>{summary.title}</H3>
      <Body>{summary.timeLine}</Body>
      {summary.lines.map((l) => (
        <Muted key={l}>{l}</Muted>
      ))}
      {mock ? (
        <>
          <Button
            label={open ? "Hide how this exam is scored" : "How this exam is scored, and the clock"}
            variant="link"
            onPress={() => setOpen(!open)}
            accessibilityLabel={open ? "Hide how this exam is scored and how the clock works" : "Show how this exam is scored and how the clock works"}
          />
          {open ? (
            <View style={{ gap: spacing.sm }}>
              <Muted>{mock.passPolicy}</Muted>
              <Muted>{mock.pauseRule}</Muted>
              {mock.sources.map((s) => (
                <View key={s.url} style={{ gap: 2 }}>
                  <Muted style={{ fontSize: 12 }}>
                    Read on {s.readAt}: {s.title}
                  </Muted>
                  <Button
                    label="Open the source"
                    variant="link"
                    onPress={() => Linking.openURL(s.url).catch(() => undefined)}
                    accessibilityLabel={`Open the source: ${s.title}`}
                  />
                </View>
              ))}
              {!mock.sources.length ? (
                <Muted>The length here comes from our course data, not yet from a reading of the exam's own site.</Muted>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

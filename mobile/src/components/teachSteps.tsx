import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Body, Button, H3, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { SKIP_CHECK_LABEL, stepCheckFeedback, stepsProgress, type TeachStepData } from "@/lib/teachSteps";

// REQ-262: the beginner version's Teach, one small step at a time. Each step is
// a plain explanation, one everyday example, the precise exam wording, then a
// quick multiple-choice check with instant feedback that explains the picked
// option. The check is a self-check: never graded on the server, never an
// attempt, never mastery evidence, and never blocks the lesson -- "Skip check"
// is always visible until it is answered. Switched off on the server for every
// course; nothing renders this until a course is turned on and a version exists.
export function TeachSteps({ steps, onDone }: { steps: TeachStepData[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  // per step: the picked option, or "skipped"
  const [done, setDone] = useState<Record<number, number | "skipped">>({});
  const p = stepsProgress(index, steps.length);
  const step = steps[p.index];
  const state = done[p.index];
  const picked = typeof state === "number" ? state : null;
  const fb = picked != null ? stepCheckFeedback(step.check, picked) : null;
  const resolved = state !== undefined;

  return (
    <View style={{ gap: spacing.sm }}>
      <View accessibilityLiveRegion="polite">
        <Muted>{p.label}</Muted>
      </View>
      <H3>{step.title}</H3>
      <Body>{step.plain}</Body>
      <View style={styles.block}>
        <Muted style={styles.blockLabel}>An everyday example</Muted>
        <Body>{step.example}</Body>
      </View>
      <View style={styles.block}>
        <Muted style={styles.blockLabel}>In the exam's words</Muted>
        <Body>{step.precise}</Body>
      </View>

      <View style={{ gap: 8, marginTop: spacing.xs }}>
        <Muted style={styles.blockLabel}>Quick check</Muted>
        <Body style={{ fontFamily: fonts.bodySemiBold }}>{step.check.question}</Body>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {step.check.choices.map((c, i) => {
            const isPicked = picked === i;
            const isRight = fb != null && i === fb.correctIndex;
            const tone = fb == null ? null : isRight ? colors.good : isPicked ? colors.warn : null;
            return (
              <Pressable
                key={i}
                disabled={resolved}
                onPress={() => setDone((d) => ({ ...d, [p.index]: i }))}
                accessibilityRole="radio"
                accessibilityLabel={c}
                accessibilityState={{ selected: isPicked, disabled: resolved }}
                style={[styles.choice, tone ? { borderColor: tone } : null]}
              >
                {tone ? <Feather name={isRight ? "check-circle" : "info"} size={18} color={tone} /> : <View style={styles.radio} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Body>{c}</Body>
                  {fb && (isPicked || isRight) ? (
                    <Muted style={{ color: tone ?? colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                      {isRight ? (isPicked ? "Your answer - correct" : "The answer") : "Your answer - not this one"}
                    </Muted>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {fb ? (
          <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
            <Body style={{ fontSize: 14 }}>{fb.reason}</Body>
            {fb.rightReason ? <Body style={{ fontSize: 14 }}>{fb.rightReason}</Body> : null}
          </View>
        ) : null}
        {!resolved ? (
          <Button
            label={SKIP_CHECK_LABEL}
            variant="link"
            icon="skip-forward"
            onPress={() => setDone((d) => ({ ...d, [p.index]: "skipped" }))}
            accessibilityLabel="Skip this quick check. It is only a self-check and does not count toward anything."
          />
        ) : null}
      </View>

      {resolved ? (
        <Button
          label={p.isLast ? "Continue" : "Next step"}
          icon="arrow-right"
          onPress={() => (p.isLast ? onDone() : setIndex(p.index + 1))}
        />
      ) : null}
      {p.index > 0 ? <Button label="Back" variant="link" icon="arrow-left" onPress={() => setIndex(p.index - 1)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: spacing.sm, gap: 2 },
  blockLabel: { fontSize: 12, fontFamily: fonts.bodySemiBold },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.mutedDim },
});

// The accept screen for a gated course.
//
// The backend enforces this gate on its own (lib/auth/requireAcknowledgement
// checks before lesson, grade, pbq and chat will answer), so this is not the
// security boundary -- it is the only way a learner can clear it. Without
// this screen a gated course returns 403 with no route forward.
//
// Deliberately not styled as an alarm. A red warning slab trains people to
// dismiss it; the point is that the learner reads it once and understands
// what this course is and is not. Calm, editorial, one clear action.

import React, { useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "@/api/client";
import type { Disclaimer } from "@/content/disclaimers";
import { Body, Button, Card, ErrorBanner, H2, Muted } from "@/components/ui";
import { colors, fonts, spacing } from "@/lib/theme";

export function DisclaimerGate({
  trackId,
  disclaimer,
  onAccepted,
}: {
  trackId: string;
  disclaimer: Disclaimer;
  onAccepted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = () => {
    setSubmitting(true);
    setError(null);
    // The version the learner actually saw is echoed back, so agreeing to
    // wording that was superseded mid-session cannot be recorded as agreement
    // to the new wording.
    api
      .post(`/api/courses/${trackId}/acknowledgement`, { disclaimerVersion: disclaimer.version })
      .then(() => onAccepted())
      .catch((err) => {
        setError(err.message);
        setSubmitting(false);
      });
  };

  return (
    <View>
      {error ? <ErrorBanner message={error} /> : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
        <Feather name="shield" size={16} color={colors.accent} />
        <Muted style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
          Required
        </Muted>
      </View>

      <H2>{disclaimer.title}</H2>
      <Muted style={{ marginBottom: spacing.md }}>{disclaimer.summary}</Muted>

      <Card>
        {disclaimer.body.map((paragraph, i) => (
          <Body key={i} style={{ marginBottom: i === disclaimer.body.length - 1 ? 0 : spacing.md }}>
            {paragraph}
          </Body>
        ))}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button
          label={disclaimer.acceptLabel}
          onPress={accept}
          loading={submitting}
          disabled={submitting}
        />
        <Muted style={{ marginTop: spacing.sm, fontSize: 12 }}>
          Recorded against your account, so you will not be asked again on another device unless this
          notice changes.
        </Muted>
      </View>
    </View>
  );
}

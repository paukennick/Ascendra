import React, { useState } from "react";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { api } from "@/api/client";
import { Body, Button, Card, ErrorBanner, Muted } from "@/components/ui";
import { colors, fonts, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { disclaimerA11yLabel, mustAcknowledge, type LabDisclaimer } from "@/lib/labs";

// REQ-125: the practice-lab disclaimer, shown on every lab before the
// learner starts and kept on screen with the results. The wording comes from
// the server with the lab (backend/lib/lab-disclaimer.ts). On a clinical or
// fitness lab the learner accepts it once per subject family before their
// first lab there; the server refuses to start or grade one until they have.
//
// Accessibility: the text is one element with one spoken label; the accept
// button is a full-width 48 dp button with its own label; the warning colour
// is the AA-checked theme token, and nothing depends on colour alone.

export function LabDisclaimerCard({
  disclaimer,
  labId,
  onAcknowledged,
}: {
  disclaimer: LabDisclaimer;
  labId?: string;
  onAcknowledged?: (acknowledgedAt: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owed = mustAcknowledge(disclaimer) && !!labId;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ acknowledgedAt: string }>(`/api/labs/${labId}/acknowledgement`, { version: disclaimer.version });
      onAcknowledged?.(res.acknowledgedAt);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={{ gap: spacing.xs }} accessible accessibilityLabel={disclaimerA11yLabel(disclaimer)}>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <Feather name="info" size={16} color={colors.warn} />
          <Body style={{ fontFamily: fonts.bodySemiBold, flex: 1 }}>{disclaimer.title}</Body>
        </View>
        {disclaimer.lines.map((line, i) => (
          <Muted key={i} style={{ color: colors.text }}>
            {line}
          </Muted>
        ))}
      </View>
      {owed ? (
        <>
          <Muted style={{ fontSize: 13 }}>You only need to confirm this once for these courses.</Muted>
          {error ? <ErrorBanner message={error} onRetry={accept} /> : null}
          <Button label={disclaimer.acknowledgement.label} icon="check" loading={busy} onPress={accept} />
        </>
      ) : null}
    </Card>
  );
}

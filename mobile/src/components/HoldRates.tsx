import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import { Body, Button, Card, ErrorBanner, Muted, SectionHeader } from "@/components/ui";
import { friendlyError } from "@/lib/errorMessage";
import { kindLine, parseHoldRates, reasonsLine, type HoldRateReport } from "@/lib/holdRates";
import { spacing } from "@/lib/theme";

// REQ-235: Settings > Access "Hold rates" (owner only; the screen renders it
// after its owner check and the route checks again). Per course and item
// kind: generated vs held back in the last 7 and 30 days, and the top hold
// reasons. Counts only.
export function HoldRates() {
  const [report, setReport] = useState<HoldRateReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setReport(parseHoldRates(await api.get<unknown>("/api/access/hold-rates")));
      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <SectionHeader label="Hold rates" />
      <Card style={{ gap: spacing.xs }}>
        <Muted>
          How often generated content was held back instead of shown: held drafts over everything written, per course and kind. Counts only.
        </Muted>
        {error ? <ErrorBanner message={error} /> : null}
        {report && !report.courses.length ? <Muted>Nothing generated in the last 30 days.</Muted> : null}
        {(report?.courses ?? []).map((c) => (
          <View key={c.code} style={{ gap: 2, marginTop: spacing.xs }}>
            <Body>{`${c.title} (${c.code})`}</Body>
            {c.kinds.length ? c.kinds.map((k) => <Muted key={k.kind}>{kindLine(k)}</Muted>) : <Muted>Nothing generated in the last 30 days.</Muted>}
            {reasonsLine(c) ? <Muted>{reasonsLine(c)!}</Muted> : null}
          </View>
        ))}
        <Button label="Refresh" variant="ghost" icon="refresh-cw" loading={busy} onPress={load} />
      </Card>
    </>
  );
}

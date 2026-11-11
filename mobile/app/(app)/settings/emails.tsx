import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { api } from "@/api/client";
import { Body, Card, ErrorBanner, H2, Loading, Muted, Screen } from "@/components/ui";
import { ACCOUNT_EMAILS_NOTE, EMAIL_PREF_ROWS, NOT_SENDING_YET, parseEmailPrefs, UNVERIFIED_NOTE, type EmailPrefs } from "@/lib/emailPrefs";
import { friendlyError } from "@/lib/errorMessage";
import { colors, spacing } from "@/lib/theme";

// REQ-197: one switch per non-account email. Saved on the server, so it
// applies on every device and on the web; each email's own "Turn off" link
// writes the same setting.
export default function EmailSettings() {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [verified, setVerified] = useState(true);
  const [sending, setSending] = useState<EmailPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get<unknown>("/api/account/email-preferences")
      .then((r) => {
        const parsed = parseEmailPrefs(r);
        if (!parsed) throw new Error("bad response");
        setPrefs(parsed.prefs);
        setVerified(parsed.verified);
        setSending(parsed.sending);
        setError(null);
      })
      .catch((err) => setError(friendlyError(err)));

  useEffect(() => {
    void load();
  }, []);

  async function toggle(key: keyof EmailPrefs, value: boolean) {
    if (!prefs || busy) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    setBusy(true);
    try {
      const parsed = parseEmailPrefs(await api.put<unknown>("/api/account/email-preferences", { [key]: value }));
      if (parsed) {
        setPrefs(parsed.prefs);
        setVerified(parsed.verified);
        setSending(parsed.sending);
      }
      setError(null);
    } catch (err) {
      setPrefs(before);
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) return error ? <Screen><ErrorBanner message={error} onRetry={load} /></Screen> : <Loading />;

  return (
    <Screen>
      {!verified ? <ErrorBanner message={UNVERIFIED_NOTE} /> : null}
      {EMAIL_PREF_ROWS.map((row) => (
        <Card key={row.key} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <H2>{row.label}</H2>
              <Muted>{row.detail}</Muted>
              {sending && !sending[row.key] ? <Muted style={{ fontStyle: "italic" }}>{NOT_SENDING_YET}</Muted> : null}
            </View>
            <Switch
              value={prefs[row.key]}
              onValueChange={(v) => toggle(row.key, v)}
              disabled={busy}
              accessibilityLabel={row.label}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </Card>
      ))}
      {error ? <ErrorBanner message={error} /> : null}
      <Body style={{ color: colors.muted }}>{ACCOUNT_EMAILS_NOTE}</Body>
    </Screen>
  );
}

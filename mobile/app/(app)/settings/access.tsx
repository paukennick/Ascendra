import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { DateField } from "@/components/DatePicker";
import { Body, Button, Card, Divider, ErrorBanner, H2, ListRow, Loading, Muted, Screen, SectionHeader, TextField } from "@/components/ui";
import { Alert } from "@/lib/alert";
import { friendlyError } from "@/lib/errorMessage";
import {
  aiModeLine,
  bulkFormProblem,
  bulkResultLine,
  emailList,
  grantAiLine,
  grantFormProblem,
  grantStatusLine,
  historyLine,
  parseAiMode,
  showAccessSettings,
  type AccessGrant,
  type AccessList,
  type AiMode,
  type BulkGrantResult,
} from "@/lib/access";
import { spacing } from "@/lib/theme";

// REQ-144: Settings > Access, for owners only (OWNER_EMAILS on the server).
// Lists the unrestricted grants, gives one by email (with an optional end
// date and note) and removes one. An address with no account yet waits and
// applies once that address signs up and is verified. Owners are listed
// but can't be removed here. Every change is checked by the server, kept
// in an audit trail and emailed to the owner who made it.

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AccessSettings() {
  const { user } = useAuth();
  const [list, setList] = useState<AccessList | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>("all");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [until, setUntil] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const owner = showAccessSettings(user);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AccessList & { aiMode?: unknown }>("/api/access/grants");
      setList(res);
      setAiMode(parseAiMode(res.aiMode));
      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, []);

  useEffect(() => {
    if (owner) load();
  }, [owner, load]);

  const give = useCallback(async () => {
    // REQ-201: one address, or several pasted at once (an AI pilot group).
    const emails = emailList(email);
    const problem = emails.length > 1 ? bulkFormProblem(email, until, note, localToday()) : grantFormProblem(email, until, note, localToday());
    setFormError(problem);
    setDone(null);
    if (problem) return;
    setBusy("grant");
    try {
      if (emails.length > 1) {
        const res = await api.post<{ results: BulkGrantResult[] }>("/api/access/grants", { emails, until: until || undefined, note: note.trim() || undefined });
        setDone(bulkResultLine(res.results));
      } else {
        await api.post("/api/access/grants", { email: email.trim(), until: until || undefined, note: note.trim() || undefined });
      }
      setEmail("");
      setUntil(null);
      setNote("");
      await load();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, [email, until, note, load]);

  const remove = useCallback(
    (g: AccessGrant) => {
      Alert.alert("Remove unrestricted access?", `${g.email} goes back to the plan they'd have without it, straight away.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(g.id);
            try {
              await api.delete(`/api/access/grants/${g.id}`);
              await load();
            } catch (err) {
              setError(friendlyError(err));
            } finally {
              setBusy(null);
            }
          },
        },
      ]);
    },
    [load]
  );

  if (!showAccessSettings(user)) {
    return (
      <Screen>
        <Card>
          <H2>Access</H2>
          <Muted>Only the account owner can manage access.</Muted>
        </Card>
      </Screen>
    );
  }
  if (!list && !error) return <Loading label="Loading access" />;

  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <H2>Give unrestricted access</H2>
        <Muted>
          Every course, lab and feature, with no plan counts, and early access to features still switched off. A daily AI safety
          limit still applies. It doesn't let them see anyone else's data.
        </Muted>
        <Muted>{aiModeLine(aiMode)}</Muted>
        <TextField
          label="Email (or several, one per line)"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          icon="mail"
          multiline
          minHeight={48}
        />
        <DateField label="Ends on (optional)" value={until} onChange={setUntil} min={localToday()} />
        <TextField label="Note (optional, only you see it)" value={note} onChangeText={setNote} placeholder="Why, e.g. AI pilot" autoCapitalize="sentences" />
        {formError ? <ErrorBanner message={formError} /> : null}
        {done ? <Muted>{done}</Muted> : null}
        <Button label="Give access" icon="key" loading={busy === "grant"} onPress={give} />
        <Muted>If there's no account with an address yet, it applies once they sign up and verify it. Up to 50 addresses at a time.</Muted>
      </Card>

      <SectionHeader label="Owners" />
      <Card style={{ gap: 0 }}>
        {(list?.owners ?? []).map((o, i) => (
          <View key={o.email}>
            {i > 0 ? <Divider /> : null}
            <ListRow icon="shield" label={o.email} value={o.hasAccount ? "Owner" : "Owner, no verified account yet"} />
          </View>
        ))}
        <Muted>Owners are set on the server and can't be removed here.</Muted>
      </Card>

      <SectionHeader label="Unrestricted access" />
      {list?.grants.length ? (
        list.grants.map((g) => (
          <Card key={g.id} style={{ gap: spacing.xs }}>
            <Body>{g.email}</Body>
            <Muted>{grantStatusLine(g)}</Muted>
            {aiMode !== "all" ? <Muted>{grantAiLine(g)}</Muted> : null}
            {g.note ? <Muted>{`Note: ${g.note}`}</Muted> : null}
            {g.grantedBy ? <Muted>{`Given by ${g.grantedBy}`}</Muted> : null}
            <Button label="Remove access" variant="ghost" icon="x" loading={busy === g.id} onPress={() => remove(g)} accessibilityLabel={`Remove access for ${g.email}`} />
          </Card>
        ))
      ) : (
        <Card>
          <Muted>Nobody else has unrestricted access.</Muted>
        </Card>
      )}

      {list?.history.length ? (
        <>
          <SectionHeader label="Recent changes" />
          <Card style={{ gap: 2 }}>
            {list.history.slice(0, 20).map((h, i) => (
              <Muted key={`${h.at}-${i}`}>{historyLine(h)}</Muted>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

import React, { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { api } from "@/api/client";
import { Card, Divider, EmptyState, ErrorBanner, IconButton, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { Alert } from "@/lib/alert";
import { colors, spacing } from "@/lib/theme";

interface Session {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_used_at: string;
}

function describeDevice(s: Session): string {
  if (s.device_label) return s.device_label;
  const ua = s.user_agent ?? "";
  if (/iphone|ipad/i.test(ua)) return "iOS device";
  if (/android/i.test(ua)) return "Android device";
  if (ua) return "Web browser";
  return "Unknown device";
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<{ sessions: Session[] }>("/api/auth/sessions")
      .then((res) => setSessions(res.sessions))
      .catch((err) => setError(err.message));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmRevoke(session: Session) {
    Alert.alert("Sign out this device?", describeDevice(session), [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => revoke(session.id) },
    ]);
  }

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      await api.delete(`/api/auth/sessions/${id}`);
      setSessions((prev) => prev?.filter((s) => s.id !== id) ?? prev);
    } catch (err) {
      Alert.alert("Couldn't sign out that device", (err as Error).message);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Screen>
      <SectionHeader label="Active sessions" />
      {error ? <ErrorBanner message={error} /> : null}
      {!sessions && !error ? <Loading label="Loading sessions..." /> : null}
      {sessions && sessions.length === 0 ? (
        <Card>
          <EmptyState icon="smartphone" title="No active sessions" />
        </Card>
      ) : null}
      {sessions && sessions.length > 0 ? (
        <Card style={{ gap: 0 }}>
          {sessions.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 }}>
                <Feather name="smartphone" size={16} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Muted style={{ color: colors.text }}>{describeDevice(s)}</Muted>
                  <Muted>Active {formatWhen(s.last_used_at)}</Muted>
                </View>
                {revokingId === s.id ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <IconButton icon="log-out" size={32} onPress={() => confirmRevoke(s)} />
                )}
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <Muted>Signing out a device ends that session immediately — it will need to sign in again.</Muted>
    </Screen>
  );
}

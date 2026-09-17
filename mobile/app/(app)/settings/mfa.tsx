import React, { useState } from "react";
import { Image, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  H2,
  IconButton,
  Muted,
  Screen,
  Tag,
  TextField,
} from "@/components/ui";
import { colors, radius } from "@/lib/theme";

type MfaView = "status" | "setup" | "backup-codes" | "disable" | "regenerate";

export default function MfaSettings() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [view, setView] = useState<MfaView>("status");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    if (!manualSecret) return;
    await Clipboard.setStringAsync(manualSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function startSetup() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ secret: string; qrDataUrl: string }>("/api/auth/mfa/setup");
      setManualSecret(res.secret);
      setQrDataUrl(res.qrDataUrl);
      setCode("");
      setView("setup");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start MFA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    if (!code.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ backupCodes: string[] }>("/api/auth/mfa/enable", { code: code.trim() });
      setBackupCodes(res.backupCodes);
      setView("backup-codes");
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm that code.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/auth/mfa/disable", { password });
      await refreshUser();
      setPassword("");
      setView("status");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't disable MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ backupCodes: string[] }>("/api/auth/mfa/backup-codes", { password });
      setBackupCodes(res.backupCodes);
      setPassword("");
      setView("backup-codes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't regenerate backup codes.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "backup-codes") {
    return (
      <Screen>
        <H2>Save your backup codes</H2>
        <Muted>
          Each code works once, if you lose access to your authenticator app. Store them somewhere
          safe — this is the only time they're shown.
        </Muted>
        <Card style={{ gap: 8 }}>
          {backupCodes.map((c) => (
            <Body key={c} style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 1 }}>
              {c}
            </Body>
          ))}
        </Card>
        <Button label="Done" icon="check" onPress={() => { setView("status"); router.back(); }} />
      </Screen>
    );
  }

  if (view === "setup") {
    return (
      <Screen>
        <H2>Scan this QR code</H2>
        <Muted>Use Google Authenticator, Authy, or any TOTP app.</Muted>
        {error ? <ErrorBanner message={error} /> : null}
        <Card style={{ alignItems: "center", gap: 12 }}>
          {qrDataUrl ? (
            <Image source={{ uri: qrDataUrl }} style={{ width: 220, height: 220, borderRadius: radius.md }} />
          ) : null}
          <Muted style={{ textAlign: "center" }}>Can't scan? Copy this code into your authenticator app:</Muted>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Tag label={manualSecret ?? ""} />
            <IconButton icon={copied ? "check" : "copy"} size={32} onPress={copySecret} />
          </View>
          {copied ? <Muted style={{ color: colors.good }}>Copied to clipboard</Muted> : null}
        </Card>
        <Card>
          <TextField
            label="Code from your authenticator app"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            icon="shield"
          />
          <Button label="Confirm and enable" icon="check-circle" onPress={confirmSetup} loading={busy} />
        </Card>
        <Button label="Cancel" variant="link" onPress={() => setView("status")} />
      </Screen>
    );
  }

  if (view === "disable" || view === "regenerate") {
    const isDisable = view === "disable";
    return (
      <Screen>
        <H2>{isDisable ? "Disable two-factor authentication" : "Regenerate backup codes"}</H2>
        <Muted>
          {isDisable
            ? "This removes the extra verification step at login. Enter your password to confirm."
            : "This invalidates your existing backup codes and issues 10 new ones. Enter your password to confirm."}
        </Muted>
        {error ? <ErrorBanner message={error} /> : null}
        <Card>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            icon="lock"
          />
          <Button
            label={isDisable ? "Disable" : "Regenerate codes"}
            variant={isDisable ? "danger" : "primary"}
            icon={isDisable ? "shield-off" : "refresh-cw"}
            onPress={isDisable ? disable : regenerate}
            loading={busy}
          />
        </Card>
        <Button label="Cancel" variant="link" onPress={() => { setPassword(""); setError(null); setView("status"); }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H2>Two-factor authentication</H2>
      {error ? <ErrorBanner message={error} /> : null}
      {user?.mfaEnabled ? (
        <Card>
          <EmptyState icon="shield" title="Enabled" message="Your account requires a code from your authenticator app at login." />
          <Button label="Regenerate backup codes" variant="ghost" icon="refresh-cw" onPress={() => setView("regenerate")} />
          <Button label="Disable two-factor authentication" variant="danger" icon="shield-off" onPress={() => setView("disable")} />
        </Card>
      ) : (
        <Card>
          <EmptyState icon="shield-off" title="Disabled" message="Add an authenticator app code as a second step at login." />
          <Button label="Enable two-factor authentication" icon="shield" onPress={startSetup} loading={busy} />
        </Card>
      )}
    </Screen>
  );
}

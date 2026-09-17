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
  Divider,
  EmptyState,
  ErrorBanner,
  H2,
  IconButton,
  ListRow,
  Muted,
  Screen,
  Tag,
  TextField,
} from "@/components/ui";
import { colors, radius } from "@/lib/theme";

type MfaView = "status" | "totp-setup" | "email-setup" | "backup-codes" | "disable" | "regenerate";
type MfaMethod = "totp" | "email";

export default function MfaSettings() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [view, setView] = useState<MfaView>("status");
  // Which method the "disable" or "regenerate" view acts on -- backup codes
  // and the disable flow are both per-method now.
  const [targetMethod, setTargetMethod] = useState<MfaMethod>("totp");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  // Set once /api/auth/mfa/(email/)disable reports this would be the last
  // remaining method -- the same password submission then also needs an
  // emailed confirmation code before it actually disables anything.
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  async function copySecret() {
    if (!manualSecret) return;
    await Clipboard.setStringAsync(manualSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function startTotpSetup() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ secret: string; qrDataUrl: string }>("/api/auth/mfa/setup");
      setManualSecret(res.secret);
      setQrDataUrl(res.qrDataUrl);
      setCode("");
      setView("totp-setup");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start authenticator app setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotpSetup() {
    if (!code.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ backupCodes: string[] }>("/api/auth/mfa/enable", { code: code.trim() });
      await refreshUser();
      if (res.backupCodes.length > 0) {
        setBackupCodes(res.backupCodes);
        setView("backup-codes");
      } else {
        setView("status");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm that code.");
    } finally {
      setBusy(false);
    }
  }

  // Entering this view already sends the first code -- same prove-then-commit
  // shape as the login-time email challenge (see mfa-challenge.tsx).
  async function startEmailSetup() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/auth/mfa/email/setup");
      setCode("");
      setView("email-setup");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function resendEmailSetupCode() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/auth/mfa/email/setup");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmailSetup() {
    if (!code.trim()) {
      setError("Enter the 6-digit code we emailed you.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ backupCodes: string[] }>("/api/auth/mfa/email/enable", { code: code.trim() });
      await refreshUser();
      if (res.backupCodes.length > 0) {
        setBackupCodes(res.backupCodes);
        setView("backup-codes");
      } else {
        setView("status");
      }
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
    if (needsConfirmation && !confirmationCode.trim()) {
      setError("Enter the code we emailed you.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const endpoint = targetMethod === "totp" ? "/api/auth/mfa/disable" : "/api/auth/mfa/email/disable";
      const res = await api.post<{ confirmationRequired?: boolean }>(endpoint, {
        password,
        ...(needsConfirmation ? { confirmationCode: confirmationCode.trim() } : {}),
      });
      if (res.confirmationRequired) {
        setNeedsConfirmation(true);
        return;
      }
      await refreshUser();
      setPassword("");
      setConfirmationCode("");
      setNeedsConfirmation(false);
      setView("status");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't turn that off.");
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
      const res = await api.post<{ backupCodes: string[] }>("/api/auth/mfa/backup-codes", {
        password,
        method: targetMethod,
      });
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
          Each code works once, if you lose access to your other sign-in methods. Store them
          somewhere safe — this is the only time they're shown.
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

  if (view === "totp-setup") {
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
          <Button label="Confirm and enable" icon="check-circle" onPress={confirmTotpSetup} loading={busy} />
        </Card>
        <Button label="Cancel" variant="link" onPress={() => setView("status")} />
      </Screen>
    );
  }

  if (view === "email-setup") {
    return (
      <Screen>
        <H2>Check your email</H2>
        <Muted>We sent a 6-digit code to {user?.email}.</Muted>
        {error ? <ErrorBanner message={error} /> : null}
        <Card>
          <TextField
            label="Code from your email"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            icon="shield"
          />
          <Button label="Confirm and enable" icon="check-circle" onPress={confirmEmailSetup} loading={busy} />
          <Button label="Resend code" variant="link" onPress={resendEmailSetupCode} disabled={busy} />
        </Card>
        <Button label="Cancel" variant="link" onPress={() => setView("status")} />
      </Screen>
    );
  }

  if (view === "disable" || view === "regenerate") {
    const isDisable = view === "disable";
    const targetLabel = targetMethod === "totp" ? "authenticator app codes" : "email codes";
    return (
      <Screen>
        <H2>{isDisable ? `Turn off ${targetLabel}` : `Regenerate ${targetLabel === "email codes" ? "email" : "authenticator app"} backup codes`}</H2>
        <Muted>
          {isDisable
            ? needsConfirmation
              ? "This is the last verification method on your account, so we've also emailed a confirmation code."
              : "This removes it as a sign-in step. Enter your password to confirm."
            : "This invalidates the existing backup codes for this method and issues 10 new ones. Enter your password to confirm."}
        </Muted>
        {error ? <ErrorBanner message={error} /> : null}
        <Card>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            textContentType="password"
            autoComplete="current-password"
            icon="lock"
          />
          {isDisable && needsConfirmation ? (
            <TextField
              label="Emailed confirmation code"
              value={confirmationCode}
              onChangeText={setConfirmationCode}
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              icon="mail"
            />
          ) : null}
          <Button
            label={isDisable ? "Turn off" : "Regenerate codes"}
            variant={isDisable ? "danger" : "primary"}
            icon={isDisable ? "shield-off" : "refresh-cw"}
            onPress={isDisable ? disable : regenerate}
            loading={busy}
          />
        </Card>
        <Button
          label="Cancel"
          variant="link"
          onPress={() => {
            setPassword("");
            setConfirmationCode("");
            setNeedsConfirmation(false);
            setError(null);
            setView("status");
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <H2>Two-factor authentication</H2>
      {error ? <ErrorBanner message={error} /> : null}
      {!user?.mfaEnabled ? (
        <EmptyState
          icon="shield-off"
          title="Disabled"
          message="Add an authenticator app or emailed code as a second step at login."
        />
      ) : null}
      <Card style={{ gap: 0 }}>
        <ListRow
          icon="smartphone"
          label="Authenticator app"
          value={user?.totpEnabled ? "Enabled" : "Disabled"}
          onPress={() => {
            setTargetMethod("totp");
            setNeedsConfirmation(false);
            setConfirmationCode("");
            if (user?.totpEnabled) {
              setView("disable");
            } else {
              startTotpSetup();
            }
          }}
        />
        <Divider />
        <ListRow
          icon="mail"
          label="Email code"
          value={user?.emailMfaEnabled ? "Enabled" : "Disabled"}
          onPress={() => {
            setTargetMethod("email");
            setNeedsConfirmation(false);
            setConfirmationCode("");
            if (user?.emailMfaEnabled) {
              setView("disable");
            } else {
              startEmailSetup();
            }
          }}
        />
      </Card>
      {user?.totpEnabled ? (
        <Button
          label="Regenerate authenticator app backup codes"
          variant="ghost"
          icon="refresh-cw"
          onPress={() => {
            setTargetMethod("totp");
            setView("regenerate");
          }}
        />
      ) : null}
      {user?.emailMfaEnabled ? (
        <Button
          label="Regenerate email backup codes"
          variant="ghost"
          icon="refresh-cw"
          onPress={() => {
            setTargetMethod("email");
            setView("regenerate");
          }}
        />
      ) : null}
    </Screen>
  );
}

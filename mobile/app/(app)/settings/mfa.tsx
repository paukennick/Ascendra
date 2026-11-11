import React, { useEffect, useRef, useState } from "react";
import { Image, Platform, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "expo-router";
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
import { Alert } from "@/lib/alert";
import { withBackgroundHold } from "@/lib/backgroundHold";
import { backupCodesText, isShareDismissal, mfaLeaveGuard, type MfaView } from "@/lib/mfaLeaveGuard";
import { installWebLeaveGuard } from "@/lib/webLeaveGuard";
import { colors, radius } from "@/lib/theme";
import { needsReauth, reauthFields, reauthPromptFor } from "@/lib/reauth";
import { useGoogleAuthRequest } from "@/auth/googleSignIn";
import { useGoBack } from "@/lib/useGoBack";

type MfaMethod = "totp" | "email";

export default function MfaSettings() {
  const goBack = useGoBack("/settings");
  const navigation = useNavigation();
  const { user, refreshUser, status } = useAuth();
  // Read inside the beforeRemove listener: a sign-out or lock must never be
  // held back by the leave guard.
  const statusRef = useRef(status);
  statusRef.current = status;
  const [view, setView] = useState<MfaView>("status");

  // REQ-131: leaving with backup codes on screen loses them for good (they
  // are shown once and never stored), and leaving mid-setup silently drops
  // the setup. A "beforeRemove" listener covers every way out -- header back,
  // Android hardware back, the sidebar, router calls. (expo-router 57 does
  // not re-export React Navigation's usePreventRemove; this event is the
  // public equivalent.) The latest view is read through a ref so the
  // listener doesn't need re-subscribing on every step.
  const viewRef = useRef<MfaView>(view);
  viewRef.current = view;
  const allowLeave = useRef(false);
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      const guard = mfaLeaveGuard(viewRef.current, allowLeave.current, statusRef.current === "signedIn");
      if (!guard) return;
      e.preventDefault();
      const leave = () => {
        allowLeave.current = true;
        navigation.dispatch(e.data.action);
      };
      if (guard === "codes") {
        Alert.alert(
          "Have you saved your backup codes?",
          "They are shown only once. Without them, you could be locked out if you lose your other sign-in methods.",
          [
            { text: "Keep this screen", style: "cancel" },
            { text: "I've saved them", onPress: leave },
          ]
        );
      } else {
        Alert.alert(
          "Leave two-factor setup?",
          "It isn't turned on until you enter the code. Your progress here will be lost.",
          [
            { text: "Keep setting up", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: leave },
          ]
        );
      }
    });
  }, [navigation]);

  // Web: the browser's back button, refresh and tab close skip beforeRemove
  // entirely (FAIL-063, src/lib/webLeaveGuard.ts). Armed only while backup
  // codes are on screen and the learner is signed in.
  useEffect(() => {
    if (Platform.OS !== "web" || view !== "backup-codes" || typeof window === "undefined") return;
    return installWebLeaveGuard(
      window,
      () => mfaLeaveGuard(viewRef.current, allowLeave.current, statusRef.current === "signedIn") === "codes",
      (leave) =>
        Alert.alert(
          "Have you saved your backup codes?",
          "They are shown only once. Without them, you could be locked out if you lose your other sign-in methods.",
          [
            { text: "Keep this screen", style: "cancel" },
            {
              text: "I've saved them",
              onPress: () => {
                allowLeave.current = true;
                leave();
              },
            },
          ]
        )
    );
  }, [view]);
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
  const [codesCopied, setCodesCopied] = useState(false);
  // Set once /api/auth/mfa/(email/)disable reports this would be the last
  // remaining method -- the same password submission then also needs an
  // emailed confirmation code before it actually disables anything.
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  // REQ-116: with two-factor already on, adding an authenticator first
  // needs a current code, a backup code or the password.
  const [reauthSecret, setReauthSecret] = useState("");
  const hasPassword = !!user?.hasPassword;
  const { clientId: googleClientId, signInAsync: googleSignInAsync } = useGoogleAuthRequest();

  // A denied clipboard (web permission, some browsers) used to reject
  // unhandled here (FAIL-069); the secret is on screen to type instead.
  async function copySecret() {
    if (!manualSecret) return;
    try {
      await Clipboard.setStringAsync(manualSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert("Couldn't copy", "Type the key into your authenticator app instead.");
    }
  }

  async function copyCodes() {
    try {
      await Clipboard.setStringAsync(backupCodesText(backupCodes));
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    } catch {
      Alert.alert("Couldn't copy", "Try Share instead, or write the codes down.");
    }
  }

  // The OS share sheet (notes, password manager, email to self). Dismissing
  // it is not an error (web reports it as an AbortError); a platform without
  // sharing (some web browsers) is. Sharing to another app puts Ascendra in
  // the background, so the background sign-out is held off while it is open
  // (FAIL-062, src/lib/backgroundHold.ts).
  async function shareCodes() {
    try {
      await withBackgroundHold(() => Share.share({ message: backupCodesText(backupCodes) }));
    } catch (err) {
      if (isShareDismissal(err)) return;
      Alert.alert("Couldn't open sharing", "Use Copy instead, or write the codes down.");
    }
  }

  // Tapping this is the learner's confirmation that the codes are saved. The
  // view ref is set at once (state only updates on the next render, which
  // would be after goBack() has already hit the guard), and the codes
  // are dropped from memory.
  function finishBackupCodes() {
    viewRef.current = "status";
    setBackupCodes([]);
    setView("status");
    goBack();
  }

  // REQ-203 (FAIL-860): the server asks the learner to confirm it's them
  // before an authenticator is added, whether or not two-factor is already
  // on (any account with a password, a code or a Google link).
  async function startTotpSetup(fields?: { reauth?: string; googleIdToken?: string }) {
    if (!fields && needsReauth(user)) {
      setError(null);
      setReauthSecret("");
      setView("totp-reauth");
      return;
    }
    if (fields && !fields.reauth && !fields.googleIdToken) {
      setError(reauthPromptFor(user).hint);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ secret: string; qrDataUrl: string }>("/api/auth/mfa/setup", fields);
      setReauthSecret("");
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

  // A Google-only account without two-factor confirms by signing in with
  // Google again; the ID token goes to the server as the proof.
  async function confirmWithGoogle() {
    setError(null);
    let idToken: string | null = null;
    try {
      idToken = await withBackgroundHold(() => googleSignInAsync());
    } catch {
      idToken = null;
    }
    if (!idToken) {
      setError("Google sign-in didn't finish. Try again.");
      return;
    }
    await startTotpSetup(reauthFields(reauthPromptFor(user), idToken));
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
      // REQ-217 (FAIL-1047): two-factor is on as soon as the server said so, and
      // the backup codes are shown once and never kept -- so they come on
      // screen first, and a failed profile reload cannot take them away.
      if (res.backupCodes.length > 0) {
        setBackupCodes(res.backupCodes);
        setView("backup-codes");
      } else {
        setView("status");
      }
      await refreshUser().catch(() => undefined);
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
      // REQ-217 (FAIL-1047): two-factor is on as soon as the server said so, and
      // the backup codes are shown once and never kept -- so they come on
      // screen first, and a failed profile reload cannot take them away.
      if (res.backupCodes.length > 0) {
        setBackupCodes(res.backupCodes);
        setView("backup-codes");
      } else {
        setView("status");
      }
      await refreshUser().catch(() => undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't confirm that code.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    // REQ-116: an account without a password (Google-only) confirms with
    // the emailed code instead.
    if (hasPassword && !password) {
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
        ...(hasPassword ? { password } : {}),
        ...(needsConfirmation ? { confirmationCode: confirmationCode.trim() } : {}),
      });
      if (res.confirmationRequired) {
        setNeedsConfirmation(true);
        return;
      }
      await refreshUser().catch(() => undefined);
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

  // REQ-219 (FAIL-1101): the same proofs as every other confirm-it's-you
  // screen (src/lib/reauth.ts): the password, an authenticator or backup code,
  // or -- for a Google-only account -- a fresh Google sign-in. Regenerating
  // used to accept a password only, which a Google-only account doesn't have.
  async function regenerate(googleIdToken?: string) {
    const prompt = reauthPromptFor(user);
    const proof = googleIdToken ? { googleIdToken } : reauthFields(prompt, password);
    if (!proof.reauth && !proof.googleIdToken) {
      setError(prompt.hint);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ backupCodes: string[] }>("/api/auth/mfa/backup-codes", {
        ...proof,
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

  async function regenerateWithGoogle() {
    setError(null);
    let idToken: string | null = null;
    try {
      idToken = await withBackgroundHold(() => googleSignInAsync());
    } catch {
      idToken = null;
    }
    if (!idToken) {
      setError("Google sign-in didn't finish. Try again.");
      return;
    }
    await regenerate(idToken);
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
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button
            label={codesCopied ? "Copied" : "Copy"}
            icon={codesCopied ? "check" : "copy"}
            variant="ghost"
            fullWidth={false}
            onPress={copyCodes}
          />
          <Button label="Share" icon="share" variant="ghost" fullWidth={false} onPress={shareCodes} />
        </View>
        <Button label="I've saved these codes" icon="check" onPress={finishBackupCodes} />
      </Screen>
    );
  }

  if (view === "totp-reauth") {
    const prompt = reauthPromptFor(user);
    return (
      <Screen>
        <H2>Confirm it's you</H2>
        <Muted>Adding an authenticator app changes how you sign in, so it needs one more check.</Muted>
        <Muted>{prompt.hint}</Muted>
        {error ? <ErrorBanner message={error} /> : null}
        <Card>
          {prompt.kind === "secret" ? (
            <>
              <TextField
                label={prompt.label}
                value={reauthSecret}
                onChangeText={setReauthSecret}
                secureTextEntry={prompt.secure}
                placeholder={prompt.secure ? "••••••••" : "123456"}
                textContentType={prompt.secure ? "password" : "oneTimeCode"}
                autoComplete={prompt.secure ? "current-password" : "one-time-code"}
                icon="lock"
              />
              <Button
                label="Continue"
                icon="check-circle"
                onPress={() => startTotpSetup(reauthFields(prompt, reauthSecret))}
                loading={busy}
              />
            </>
          ) : (
            <>
              <Button
                label={prompt.label}
                icon="check-circle"
                onPress={confirmWithGoogle}
                loading={busy}
                disabled={!googleClientId}
              />
              {!googleClientId ? (
                <Muted>Google sign-in isn't available here. Use the app on your phone to add an authenticator.</Muted>
              ) : null}
            </>
          )}
        </Card>
        <Button
          label="Cancel"
          variant="link"
          onPress={() => {
            setReauthSecret("");
            setError(null);
            setView("status");
          }}
        />
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
            <IconButton
              icon={copied ? "check" : "copy"}
              size={32}
              accessibilityLabel={copied ? "Code copied" : "Copy the setup code"}
              onPress={copySecret}
            />
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
    const regeneratePrompt = reauthPromptFor(user);
    const targetLabel = targetMethod === "totp" ? "authenticator app codes" : "email codes";
    return (
      <Screen>
        <H2>{isDisable ? `Turn off ${targetLabel}` : `Regenerate ${targetLabel === "email codes" ? "email" : "authenticator app"} backup codes`}</H2>
        <Muted>
          {isDisable
            ? needsConfirmation
              ? "This is the last verification method on your account, so we've also emailed a confirmation code."
              : hasPassword
                ? "This removes it as a sign-in step. Enter your password to confirm."
                : "This removes it as a sign-in step. We'll email you a code to confirm."
            : `This invalidates the existing backup codes for this method and issues 10 new ones. ${reauthPromptFor(user).hint}`}
        </Muted>
        {error ? <ErrorBanner message={error} /> : null}
        <Card>
          {isDisable && hasPassword ? (
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
          ) : null}
          {!isDisable && regeneratePrompt.kind === "secret" ? (
            <TextField
              label={regeneratePrompt.label}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={regeneratePrompt.secure}
              placeholder={regeneratePrompt.secure ? "••••••••" : "123456"}
              textContentType={regeneratePrompt.secure ? "password" : "oneTimeCode"}
              autoComplete={regeneratePrompt.secure ? "current-password" : "one-time-code"}
              icon="lock"
            />
          ) : null}
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
          {!isDisable && regeneratePrompt.kind === "google" ? (
            <>
              <Button
                label={regeneratePrompt.label}
                icon="check-circle"
                onPress={regenerateWithGoogle}
                loading={busy}
                disabled={!googleClientId}
              />
              {!googleClientId ? <Muted>Google sign-in isn't available here. Use the app on your phone.</Muted> : null}
            </>
          ) : (
            <Button
              label={isDisable ? "Turn off" : "Regenerate codes"}
              variant={isDisable ? "danger" : "primary"}
              icon={isDisable ? "shield-off" : "refresh-cw"}
              onPress={isDisable ? disable : () => regenerate()}
              loading={busy}
            />
          )}
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

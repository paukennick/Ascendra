// REQ-177: the lock after time away (src/lib/autoLock.ts), drawn over the
// signed-in screens so they stay mounted underneath. Biometric unlock (with
// the device passcode as the OS's own fallback) when it is on, otherwise
// the password -- or a code, or Google, for an account without one
// (src/lib/reauth.ts). Sign out is always offered; it keeps the drafts the
// device holds only if the learner signs back in as the same account.
import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { useGoogleAuthRequest } from "@/auth/googleSignIn";
import { BrandMark, Button, ErrorBanner, H1, Muted, TextField } from "@/components/ui";
import { reauthFields, reauthPromptFor } from "@/lib/reauth";
import { colors, spacing } from "@/lib/theme";

const cover = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.bg,
};

export function AppLock() {
  const { user, unlockMethod, unlockApp, biometricLabel, logout } = useAuth();
  const [mode, setMode] = useState(unlockMethod);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompt = reauthPromptFor(user);
  const google = useGoogleAuthRequest();

  const attempt = useCallback(
    async (input?: { reauth?: string; googleIdToken?: string }) => {
      setBusy(true);
      setError(null);
      const res = await unlockApp(input);
      setBusy(false);
      if (!res.ok) setError(res.error ?? "Couldn't unlock. Try again.");
      else setSecret("");
    },
    [unlockApp]
  );

  // Back must not reach the screens underneath.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Prompt for biometrics as soon as the lock shows, as the launch lock does.
  useEffect(() => {
    if (mode === "biometric") void attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withGoogle() {
    const idToken = await google.signInAsync().catch(() => null);
    if (idToken) await attempt(reauthFields(prompt, idToken));
  }

  return (
    <SafeAreaView style={[cover, { alignItems: "center", justifyContent: "center", padding: spacing.xl }]} accessibilityViewIsModal>
      <View style={{ width: "100%", maxWidth: 360, gap: spacing.lg, alignItems: "stretch" }}>
        <View style={{ alignItems: "center", gap: 6 }}>
          <BrandMark size={64} />
          <H1>Ascendra is locked</H1>
          <Muted style={{ textAlign: "center" }}>
            {mode === "biometric"
              ? `Use ${biometricLabel} to continue. Your work is right where you left it.`
              : `${prompt.hint.replace("To confirm it's you, ", "To continue, ")} Your work is right where you left it.`}
          </Muted>
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        {mode === "biometric" ? (
          <>
            <Button label={`Unlock with ${biometricLabel}`} icon="unlock" onPress={() => attempt()} loading={busy} />
            <Button label="Use password instead" variant="ghost" onPress={() => setMode("password")} />
          </>
        ) : prompt.kind === "google" ? (
          <Button label="Continue with Google" icon="log-in" onPress={withGoogle} loading={busy} disabled={!google.clientId || !google.request} />
        ) : (
          <>
            <TextField
              label={prompt.label}
              value={secret}
              onChangeText={setSecret}
              secureTextEntry={prompt.secure}
              autoComplete={prompt.secure ? "current-password" : "one-time-code"}
              textContentType={prompt.secure ? "password" : "oneTimeCode"}
            />
            <Button label="Unlock" icon="unlock" onPress={() => attempt(reauthFields(prompt, secret))} loading={busy} disabled={!secret} />
          </>
        )}
        <Button label="Sign out" variant="ghost" onPress={() => logout()} />
        {Platform.OS === "web" ? (
          <Muted style={{ textAlign: "center" }}>For your security, Ascendra signs out after 30 minutes away.</Muted>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

// Native: covers the screen while the app is not in front, so the app
// switcher's snapshot shows the brand mark instead of a lesson or account
// details (iOS takes it on "inactive"; Android's recents snapshot may still
// show content -- that needs FLAG_SECURE, a native change).
export function PrivacyCover() {
  return (
    <View style={[cover, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
      <BrandMark size={64} />
    </View>
  );
}

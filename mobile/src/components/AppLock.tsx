// REQ-177: the lock after time away (src/lib/autoLock.ts), drawn over the
// signed-in screens so they stay mounted underneath. Biometric unlock (with
// the device passcode as the OS's own fallback) when it is on, otherwise
// the password -- or a code, or Google, for an account without one
// (src/lib/reauth.ts). Sign out is always offered; it keeps the drafts the
// device holds only if the learner signs back in as the same account.
import React, { useCallback, useEffect, useRef, useState } from "react";
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

const FOCUSABLE = 'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

// Web: the controls inside `node` that can take focus, in tab order.
function focusableIn(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true" && el.tabIndex >= 0
  );
}

export function AppLock() {
  const { user, unlockMethod, unlockApp, biometricLabel, logout, webIdleWarningSecondsLeft } = useAuth();
  const dialogRef = useRef<View>(null);
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

  // REQ-206 (FAIL-920), web: focus moves into the lock when it opens, Tab and
  // Shift+Tab wrap inside it, and focus returns to where it was on unlock (app/_layout.tsx, which owns the inert switch). The
  // screens underneath are `inert` (app/_layout.tsx), so nothing outside the
  // lock can be reached or activated.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = dialogRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusableIn(node);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = !!active && node.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  // The first control (the field, or the unlock button) gets focus, again if
  // the learner switches from biometrics to the password.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = dialogRef.current as unknown as HTMLElement | null;
    if (node) focusableIn(node)[0]?.focus();
  }, [mode]);

  async function withGoogle() {
    const idToken = await google.signInAsync().catch(() => null);
    if (idToken) await attempt(reauthFields(prompt, idToken));
  }

  return (
    <SafeAreaView style={[cover, { alignItems: "center", justifyContent: "center", padding: spacing.xl }]} accessibilityViewIsModal>
      <View
        ref={dialogRef}
        role="dialog"
        aria-modal
        aria-label="Ascendra is locked"
        style={{ width: "100%", maxWidth: 360, gap: spacing.lg, alignItems: "stretch" }}
      >
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
              returnKeyType="go"
              onSubmitEditing={() => {
                if (secret && !busy) void attempt(reauthFields(prompt, secret));
              }}
            />
            <Button label="Unlock" icon="unlock" onPress={() => attempt(reauthFields(prompt, secret))} loading={busy} disabled={!secret} />
          </>
        )}
        <Button label="Sign out" variant="ghost" onPress={() => logout()} />
        {Platform.OS === "web" ? (
          <Muted style={{ textAlign: "center" }}>For your security, Ascendra signs out after 30 minutes away.</Muted>
        ) : null}
        {/* REQ-206 (FAIL-931): the last minute before that sign-out. The words
            are announced once; no per-second countdown is read out. */}
        {Platform.OS === "web" && webIdleWarningSecondsLeft !== null ? (
          <View accessibilityLiveRegion="polite">
            <Muted style={{ textAlign: "center", color: colors.warn }}>
              You'll be signed out in under a minute. Unlock to stay signed in.
            </Muted>
          </View>
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

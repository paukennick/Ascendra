// REQ-175: first, so the API client knows this build before any request.
import "@/updates/appIdentity";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
// REQ-113 (Audit 3 mobile M2): one import per weight. The packages' index
// files require every weight and italic (54 font files, ~11 MB of the
// Android export) even though only these ten are used.
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces/700Bold";
import { SourceSans3_400Regular } from "@expo-google-fonts/source-sans-3/400Regular";
import { SourceSans3_500Medium } from "@expo-google-fonts/source-sans-3/500Medium";
import { SourceSans3_600SemiBold } from "@expo-google-fonts/source-sans-3/600SemiBold";
import { SourceSans3_700Bold } from "@expo-google-fonts/source-sans-3/700Bold";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono/600SemiBold";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { OnboardingProvider, useOnboarding } from "@/auth/OnboardingContext";
import { MatureContentProvider } from "@/auth/MatureContentContext";
import { gateRedirect } from "@/lib/legal";
import { UpdateBanner } from "@/components/UpdateBanner";
import { AppLock, PrivacyCover } from "@/components/AppLock";
import { SessionRetry } from "@/components/SessionRetry";
import { useReminderTap } from "@/lib/useReminderTap";
import { UpdateRequired } from "@/components/UpdateRequired";
import { registerUpdateRequiredHook } from "@/api/client";
import type { UpdateRequired as UpdateRequiredInfo } from "@/lib/appVersion";
import { AUTO_RELOAD_KEY, autoReloadMarker, mayAutoReload } from "@/lib/webVersion";
import { titleForPath } from "@/lib/routeTitles";

const WEB_BUILD_ID = process.env.EXPO_PUBLIC_WEB_BUILD_ID ?? "";
import { useAppUpdates } from "@/updates/useAppUpdates";
import { AlertHost } from "@/lib/alert";
import { installWebAutofillStyles } from "@/lib/webAutofillStyles";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";

installWebAutofillStyles();

// Held until AuthProvider resolves whether a session exists AND fonts finish
// loading, so the user never sees a flash of the wrong screen or a
// system-font flash before Fraunces/Source Sans 3 come in.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Web only -- warns before the 30-minute idle timeout in AuthContext signs
// the user out. Any click anywhere, including this banner's own "Stay
// signed in", already resets the idle clock via that effect's own window
// listeners, so this needs no dismiss handler of its own.
function IdleWarningBanner({ secondsLeft }: { secondsLeft: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.lg,
        backgroundColor: colors.warnDim,
        borderWidth: 1,
        borderColor: colors.warn,
        borderRadius: radius.md,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        ...shadow.sm,
      }}
    >
      <Feather name="clock" size={16} color={colors.warn} />
      {/* The words are announced once (a live region); the seconds are drawn
          only, so the countdown isn't read out every second. */}
      <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
        <Text style={{ color: colors.text, fontFamily: fonts.body }}>You'll be signed out soon due to inactivity.</Text>
      </View>
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold }} aria-hidden>
        {secondsLeft}s
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {}}
        style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.warn }}
      >
        <Text style={{ color: colors.bg, fontFamily: fonts.bodySemiBold }}>Stay signed in</Text>
      </Pressable>
    </View>
  );
}

function RootNavigator() {
  const { status, webIdleWarningSecondsLeft, appLocked } = useAuth();
  // REQ-177: native -- hide the screen while the app is not in front, for
  // the app switcher's snapshot.
  const [inFront, setInFront] = useState(true);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (next) => setInFront(next === "active"));
    return () => sub.remove();
  }, []);
  // REQ-206: a title per page on web (expo-router leaves it at "Ascendra").
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") document.title = titleForPath(pathname);
  }, [pathname]);
  const locked = status === "signedIn" && appLocked;
  const appRef = useRef<View>(null);
  // A layout effect, so the control that had focus is read before the lock's
  // own effect moves focus into it, and focus goes back to that control after
  // `inert` is lifted (an inert element can't be focused).
  const returnFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;
    const node = appRef.current as unknown as HTMLElement | null;
    if (!node) return;
    if (locked) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      node.setAttribute("inert", "");
    } else {
      node.removeAttribute("inert");
      const back = returnFocus.current;
      returnFocus.current = null;
      if (back && back.isConnected && back !== document.body) back.focus();
    }
  }, [locked]);
  const { gate } = useOnboarding();
  useReminderTap(status === "signedIn" && !appLocked);
  const segments = useSegments();
  const router = useRouter();
  const { updateReady, applyUpdate, dismiss } = useAppUpdates();
  const [updateRequired, setUpdateRequired] = useState<UpdateRequiredInfo | null>(null);

  useEffect(() => {
    registerUpdateRequiredHook(setUpdateRequired);
    return () => registerUpdateRequiredHook(null);
  }, []);

  // REQ-177: web -- the server says this bundle is too old. Reload at once
  // to fetch the current one, unless the screen holds work in progress (then
  // the Update required screen asks), and at most once per bundle per 10
  // minutes so a server that keeps refusing can't loop the tab.
  useEffect(() => {
    if (!updateRequired || Platform.OS !== "web" || typeof window === "undefined") return;
    let marker: string | null = null;
    try {
      marker = window.sessionStorage.getItem(AUTO_RELOAD_KEY);
    } catch {
      /* storage blocked: treat as never reloaded */
    }
    const now = Date.now();
    const pathname = window.location.pathname;
    if (!mayAutoReload({ pathname, buildId: WEB_BUILD_ID || null, marker, now })) return;
    try {
      window.sessionStorage.setItem(AUTO_RELOAD_KEY, autoReloadMarker(WEB_BUILD_ID || null, now));
    } catch {
      return; // can't record it, so don't risk a loop
    }
    window.location.reload();
  }, [updateRequired]);

  useEffect(() => {
    if (status === "loading") return;
    SplashScreen.hideAsync().catch(() => undefined);

    const inAuthGroup = segments[0] === "(auth)";
    const onLockScreen = segments[0] === "lock";
    const inLegalGroup = segments[0] === "(legal)";
    if (inLegalGroup) {
      // Terms/privacy/cookies must stay reachable regardless of auth status
      // (pre-signup reading, or a signed-in user revisiting them).
    } else if (status === "signedOut" && !inAuthGroup) {
      router.replace("/login");
    } else if (status === "locked" && !onLockScreen) {
      router.replace("/lock");
    } else if (status === "signedIn" && (inAuthGroup || onLockScreen)) {
      router.replace("/");
    } else if (status === "signedIn") {
      // REQ-119: the one-tap Terms prompt, then first run (src/lib/legal.ts).
      const to = gateRedirect(gate, segments);
      if (to) router.replace(to);
    }
  }, [status, segments, router, gate]);

  return (
    <>
      {/* REQ-206 (FAIL-920): while locked the screens stay mounted but cannot
          be reached: `inert` on web (no Tab, no Enter, nothing read), and the
          native equivalents. The overlay covered them only to the eye. */}
      <View
        ref={appRef}
        style={{ flex: 1 }}
        importantForAccessibility={locked ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={locked}
        aria-hidden={locked ? true : undefined}
      >
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(legal)" />
          <Stack.Screen name="lock" />
        </Stack>
      </View>
      {Platform.OS === "web" && webIdleWarningSecondsLeft !== null && !appLocked ? (
        <IdleWarningBanner secondsLeft={webIdleWarningSecondsLeft} />
      ) : null}
      {Platform.OS === "web" ? <AlertHost /> : null}
      {/* Sits below the idle warning in priority: that one is about to take
          something away from the user, this one is only an offer. */}
      {updateReady && webIdleWarningSecondsLeft === null && !appLocked ? (
        <UpdateBanner onApply={applyUpdate} onDismiss={dismiss} />
      ) : null}
      {/* REQ-177: the lock after time away covers the screens, which stay mounted. */}
      {locked ? <AppLock /> : null}
      {/* REQ-217 (FAIL-1041): a stored session the server couldn't be reached to resume. */}
      {status === "retry" ? <SessionRetry /> : null}
      {status === "signedIn" && !inFront ? <PrivacyCover /> : null}
      {updateRequired ? <UpdateRequired info={updateRequired} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <OnboardingProvider>
          {/* REQ-224: the 18+ notice for mental health courses. */}
          <MatureContentProvider>
            <RootNavigator />
          </MatureContentProvider>
        </OnboardingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

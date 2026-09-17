import { useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from "@expo-google-fonts/source-sans-3";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";

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
      <Text style={{ color: colors.text, fontFamily: fonts.body, flex: 1 }}>
        You'll be signed out in {secondsLeft}s due to inactivity.
      </Text>
      <Pressable
        onPress={() => {}}
        style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.warn }}
      >
        <Text style={{ color: colors.bg, fontFamily: fonts.bodySemiBold }}>Stay signed in</Text>
      </Pressable>
    </View>
  );
}

function RootNavigator() {
  const { status, webIdleWarningSecondsLeft } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    }
  }, [status, segments, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(legal)" />
        <Stack.Screen name="lock" />
      </Stack>
      {Platform.OS === "web" && webIdleWarningSecondsLeft !== null ? (
        <IdleWarningBanner secondsLeft={webIdleWarningSecondsLeft} />
      ) : null}
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
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

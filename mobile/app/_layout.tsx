import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { colors } from "@/lib/theme";

// Held until AuthProvider resolves whether a session exists, so the user
// never sees a flash of the wrong screen (login vs. course list).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    SplashScreen.hideAsync().catch(() => undefined);

    const inAuthGroup = segments[0] === "(auth)";
    if (status === "signedOut" && !inAuthGroup) {
      router.replace("/login");
    } else if (status === "signedIn" && inAuthGroup) {
      router.replace("/");
    }
  }, [status, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

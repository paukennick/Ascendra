import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";
import { useColumnScreenOptions, webColumnLayout } from "@/components/WebColumn";

export default function AuthLayout() {
  // REQ-322: on wide web windows the header lines up with the column.
  const screenOptions = useColumnScreenOptions({
    headerStyle: { backgroundColor: colors.bgAlt },
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.bg },
  });
  return (
    <Stack
      // Desktop web: a centered column on wide windows (src/lib/webColumn.ts).
      screenLayout={webColumnLayout}
      screenOptions={screenOptions}
    >
      <Stack.Screen name="login" options={{ title: "Log in" }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
      <Stack.Screen name="verify-email-pending" options={{ title: "Verify your email" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Reset password" }} />
      <Stack.Screen name="mfa-challenge" options={{ title: "Verify it's you" }} />
    </Stack>
  );
}

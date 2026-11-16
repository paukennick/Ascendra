import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";
import { webColumnLayout } from "@/components/WebColumn";

export default function LegalLayout() {
  return (
    <Stack
      // Desktop web: a centered column on wide windows (src/lib/webColumn.ts).
      screenLayout={webColumnLayout}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgAlt },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="terms" options={{ title: "Terms of Service" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="cookies" options={{ title: "Cookies & Storage" }} />
      <Stack.Screen name="faq" options={{ title: "FAQ" }} />
      <Stack.Screen name="disclaimer" options={{ title: "Disclaimer" }} />
      <Stack.Screen name="sources" options={{ title: "Sources & Trademarks" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
    </Stack>
  );
}

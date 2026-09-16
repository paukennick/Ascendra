import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgAlt },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text, fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ascendra", headerLargeTitle: true }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="settings/mfa" options={{ title: "Two-factor authentication" }} />
      <Stack.Screen name="course/[trackId]/index" options={{ title: "Course" }} />
      <Stack.Screen name="course/[trackId]/lesson/[objectiveId]" options={{ title: "Lesson" }} />
      <Stack.Screen name="course/[trackId]/pbq" options={{ title: "PBQ Simulator" }} />
      <Stack.Screen name="course/[trackId]/chat" options={{ title: "Ask the coach" }} />
      <Stack.Screen name="course/[trackId]/progress" options={{ title: "Progress" }} />
      <Stack.Screen name="course/[trackId]/history" options={{ title: "History" }} />
    </Stack>
  );
}

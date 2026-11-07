import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgAlt },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ascendra", headerLargeTitle: true }} />
      <Stack.Screen name="explore" options={{ title: "Explore" }} />
      <Stack.Screen name="review" options={{ title: "Review" }} />
      <Stack.Screen name="review-session" options={{ title: "Today's review" }} />
      <Stack.Screen name="review-coverage" options={{ title: "Terms you know" }} />
      <Stack.Screen name="unit-check" options={{ title: "Unit check" }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="account/sessions" options={{ title: "Active sessions" }} />
      <Stack.Screen name="account/change-password" options={{ title: "Change password" }} />
      <Stack.Screen name="account/change-email" options={{ title: "Change email" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="settings/mfa" options={{ title: "Two-factor authentication" }} />
      <Stack.Screen name="course/[trackId]/index" options={{ title: "Course" }} />
      <Stack.Screen name="course/[trackId]/lesson/[objectiveId]" options={{ title: "Lesson" }} />
      <Stack.Screen name="course/[trackId]/pbq" options={{ title: "PBQ Simulator" }} />
      <Stack.Screen name="course/[trackId]/chat" options={{ title: "Ask the coach" }} />
      <Stack.Screen name="course/[trackId]/progress" options={{ title: "Mastery" }} />
      <Stack.Screen name="course/[trackId]/history" options={{ title: "History" }} />
      <Stack.Screen name="course/[trackId]/exam" options={{ title: "Practice exam" }} />
      <Stack.Screen name="course/[trackId]/compare" options={{ title: "Compare look-alikes" }} />
      <Stack.Screen name="course/[trackId]/explain/[objectiveId]" options={{ title: "Explain it back" }} />
      <Stack.Screen name="course/[trackId]/plan" options={{ title: "Study plan" }} />
      <Stack.Screen name="course/[trackId]/placement" options={{ title: "Placement check" }} />
      <Stack.Screen name="course/[trackId]/quiz" options={{ title: "Quiz me" }} />
    </Stack>
  );
}

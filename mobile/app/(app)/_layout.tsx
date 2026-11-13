import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";
import { BillingProvider } from "@/billing/BillingContext";
import { useAuth } from "@/auth/AuthContext";
import { Loading } from "@/components/ui";

export default function AppLayout() {
  const { status } = useAuth();
  // REQ-206 (FAIL-922): on a reload or a deep link every signed-in screen
  // mounted at once and sent its requests before the session was restored from
  // the refresh cookie (or before the launch lock was opened), so
  // /account/sessions and others answered 401. The screens wait; the splash
  // screen is still up for exactly this long (app/_layout.tsx), so nothing
  // visible changes.
  if (status === "loading" || status === "locked" || status === "retry") return <Loading label="Restoring your session..." />;
  // REQ-122: the plan (inert while paid plans are off) for every signed-in screen.
  return (
    <BillingProvider>
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
      <Stack.Screen name="settings/reminders" options={{ title: "Study reminders" }} />
      <Stack.Screen name="settings/emails" options={{ title: "Email" }} />
      <Stack.Screen name="settings/study-profile" options={{ title: "Study profile" }} />
      <Stack.Screen name="whats-new" options={{ title: "What's new" }} />
      {/* REQ-119: one-tap Terms prompt and the first-run flow (no back: each finishes by moving on). */}
      <Stack.Screen name="agree" options={{ title: "Before you continue", headerBackVisible: false, gestureEnabled: false }} />
      {/* REQ-165: the one study notice (content disclaimer + AI data disclosure). */}
      <Stack.Screen name="notice" options={{ title: "Before you start", headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="welcome" options={{ title: "Welcome", headerBackVisible: false, gestureEnabled: false }} />
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
      <Stack.Screen name="course/[trackId]/level" options={{ title: "Your level" }} />
      <Stack.Screen name="course/[trackId]/placement" options={{ title: "Placement check" }} />
      <Stack.Screen name="course/[trackId]/quiz" options={{ title: "Quiz me" }} />
      <Stack.Screen name="course/[trackId]/outcome" options={{ title: "I took the exam" }} />
      <Stack.Screen name="plans" options={{ title: "Plans" }} />
      <Stack.Screen name="settings/free-course" options={{ title: "Your free course" }} />
      <Stack.Screen name="settings/access" options={{ title: "Access" }} />
      {/* REQ-206 (FAIL-936): these had no entry, so the header read the file path
          ("settings/discount") until the screen set its own title. */}
      <Stack.Screen name="settings/discount" options={{ title: "Verified discount" }} />
      <Stack.Screen name="support" options={{ title: "Support" }} />
      <Stack.Screen name="course/[trackId]/labs" options={{ title: "Labs" }} />
      <Stack.Screen name="course/[trackId]/lab/[labId]" options={{ title: "Lab" }} />
      <Stack.Screen name="course/[trackId]/sims" options={{ title: "Simulations" }} />
      <Stack.Screen name="course/[trackId]/sim/[simId]" options={{ title: "Simulation" }} />
    </Stack>
    </BillingProvider>
  );
}

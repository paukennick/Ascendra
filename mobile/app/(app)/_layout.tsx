import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f8fafc",
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ascendra" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="course/[trackId]/index" options={{ title: "Course" }} />
      <Stack.Screen name="course/[trackId]/lesson/[objectiveId]" options={{ title: "Lesson" }} />
      <Stack.Screen name="course/[trackId]/pbq" options={{ title: "PBQ Simulator" }} />
      <Stack.Screen name="course/[trackId]/chat" options={{ title: "Ask the coach" }} />
      <Stack.Screen name="course/[trackId]/progress" options={{ title: "Progress" }} />
      <Stack.Screen name="course/[trackId]/history" options={{ title: "History" }} />
    </Stack>
  );
}

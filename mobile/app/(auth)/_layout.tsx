import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f8fafc",
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Log in" }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
      <Stack.Screen name="verify-email-pending" options={{ title: "Verify your email" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Reset password" }} />
    </Stack>
  );
}

import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

// Device-aware label -- never claim "Face ID" on a device that only has a
// fingerprint sensor, or vice versa (see AuthenticationType docs).
export async function getBiometricLabel(): Promise<string> {
  if (Platform.OS === "web") return "Biometric sign-in";
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "Face unlock";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint unlock";
  }
  return "Biometric unlock";
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

// Used once, at enrollment time, to prove the device can actually
// authenticate before Ascendra relies on it to gate the stored session --
// the ongoing unlock gate itself is enforced by SecureStore's
// `requireAuthentication` option (see secureStorage.ts / AuthContext.tsx),
// not by this call.
export async function confirmBiometric(promptMessage: string): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false });
  return res.success;
}

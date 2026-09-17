import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface SecureItemOptions {
  // When true (native only -- there is no equivalent on web), the OS itself
  // (Keychain/Keystore) requires a fresh biometric/device-passcode check
  // before releasing the value, rather than Ascendra's own JS deciding
  // whether to gate access. See src/lib/biometric.ts and AuthContext.tsx.
  requireAuthentication?: boolean;
  authenticationPrompt?: string;
}

// expo-secure-store has no web implementation (the native module is simply
// absent there), so route web through localStorage instead. The refresh
// token is the only thing stored here, and it's already short-lived and
// server-revocable, so localStorage's weaker guarantees are an acceptable
// trade for the web preview target working at all. `requireAuthentication`
// is silently ignored on web -- there's no biometric gate to offer there.
export const secureStorage = {
  async getItem(key: string, options?: SecureItemOptions): Promise<string | null> {
    if (Platform.OS === "web") return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key, options);
  },
  async setItem(key: string, value: string, options?: SecureItemOptions): Promise<void> {
    if (Platform.OS === "web") {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, options);
  },
  async deleteItem(key: string, options?: SecureItemOptions): Promise<void> {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key, options);
  },
};

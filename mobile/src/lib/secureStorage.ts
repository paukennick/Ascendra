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
// absent there), so route web through sessionStorage instead of
// localStorage. This is deliberate, not a fallback of convenience:
// sessionStorage is cleared when the browser session ends (tab/window/
// browser closed), which is what makes a closed browser actually sign the
// user out on web -- localStorage would instead survive a full browser
// restart or computer reboot, which is exactly the bug this replaced.
// Native's equivalent "closed app" signal is the AppState listener in
// AuthContext.tsx; web has no matching event, so the storage lifetime
// itself has to be the mechanism. This is separate from (and doesn't
// replace) web's 30-minute idle-timeout sign-out just below in
// AuthContext.tsx, which handles a tab left open but inactive.
// `requireAuthentication` is silently ignored on web -- there's no
// biometric gate to offer there.
export const secureStorage = {
  async getItem(key: string, options?: SecureItemOptions): Promise<string | null> {
    if (Platform.OS === "web") return window.sessionStorage.getItem(key);
    return SecureStore.getItemAsync(key, options);
  },
  async setItem(key: string, value: string, options?: SecureItemOptions): Promise<void> {
    if (Platform.OS === "web") {
      window.sessionStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, options);
  },
  async deleteItem(key: string, options?: SecureItemOptions): Promise<void> {
    if (Platform.OS === "web") {
      window.sessionStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key, options);
  },
};

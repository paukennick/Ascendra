// REQ-306: loads (or creates) this device's id and hands it to the API client.
// Imported for its side effect at the top of app/_layout.tsx, like
// appIdentity. Native keeps it in the secure store; web in localStorage (the
// app's sessionStorage-backed secureStorage would make a new id per tab).
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { setDeviceId } from "@/api/client";
import { DEVICE_ID_KEY, isDeviceId, newDeviceId } from "@/lib/deviceId";

async function load(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      let id = window.localStorage.getItem(DEVICE_ID_KEY);
      if (!isDeviceId(id)) {
        id = newDeviceId(Crypto.getRandomBytes);
        window.localStorage.setItem(DEVICE_ID_KEY, id);
      }
      setDeviceId(id);
      return;
    }
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!isDeviceId(id)) {
      id = newDeviceId(Crypto.getRandomBytes);
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    setDeviceId(id);
  } catch {
    // Storage unavailable (private mode, a keystore error): no header, so this
    // device's sessions simply aren't replaced on sign-in, as before.
  }
}

void load();

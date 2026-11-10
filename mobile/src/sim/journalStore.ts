import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JournalBackend } from "./runtime/journal.ts";

// REQ-199: where the sim command journal lives. Native: AsyncStorage. Web:
// window.localStorage directly, which writes synchronously, so a command is
// on the device before its request leaves. Every call is wrapped: private
// windows, blocked site data and a full disk all fail quietly, and the run
// then behaves as it did before the journal (the queue stays in memory).
const webStorage = (): Storage | null => {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const journalBackend: JournalBackend =
  Platform.OS === "web"
    ? {
        async get(key) {
          try {
            return webStorage()?.getItem(key) ?? null;
          } catch {
            return null;
          }
        },
        async set(key, value) {
          try {
            webStorage()?.setItem(key, value);
          } catch {
            /* quota or blocked */
          }
        },
        async remove(key) {
          try {
            webStorage()?.removeItem(key);
          } catch {
            /* blocked */
          }
        },
      }
    : {
        async get(key) {
          try {
            return await AsyncStorage.getItem(key);
          } catch {
            return null;
          }
        },
        async set(key, value) {
          try {
            await AsyncStorage.setItem(key, value);
          } catch {
            /* full or unavailable */
          }
        },
        async remove(key) {
          try {
            await AsyncStorage.removeItem(key);
          } catch {
            /* unavailable */
          }
        },
      };

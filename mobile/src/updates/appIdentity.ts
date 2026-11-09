// REQ-175: tells the API client which build this is (src/lib/appVersion.ts).
// Imported for its side effect at the top of app/_layout.tsx, so it runs
// before any request. Kept out of src/api/client.ts because that module is
// loaded by node tests, where expo-updates and react-native are absent.
import { Platform } from "react-native";
import * as Updates from "expo-updates";
import { setAppIdentity } from "@/api/client";
import { APP_VERSION, buildTag, type AppPlatform } from "@/lib/appVersion";

const platform: AppPlatform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";

let updateId: string | null = null;
let embedded = true;
if (platform !== "web") {
  try {
    updateId = Updates.updateId ?? null;
    embedded = Updates.isEmbeddedLaunch;
  } catch {
    // Expo Go or a development build without the updates module: "embedded".
  }
}

setAppIdentity({ version: APP_VERSION, build: buildTag(platform, updateId, embedded), platform });

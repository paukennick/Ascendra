// REQ-300: what the "Update required" screen says and does (components/
// UpdateRequired.tsx), kept pure so the rules can be tested. docs/versioning.md
// "How an old app is told to update".
//
//   web      Reload. The tab runs the bundle it loaded; a reload fetches the
//            current one.
//   phone    First try an over-the-air update: a build whose JavaScript is
//            older than MIN_APP_VERSION but whose native part is current gets
//            the newer version that way, with no store visit. Only when there
//            is none (or updates are off, as in Expo Go) does it point to the
//            store -- a build whose native part is too old can only be
//            replaced there.
import type { AppPlatform, UpdateRequired } from "./appVersion.ts";

export type UpdatePhase = "checking" | "installing" | "store";

export interface UpdatePromptView {
  title: string;
  message: string;
  // What the main button does; null while the app works on it.
  action: "reload" | "store" | "check-again" | null;
  actionLabel: string | null;
  // The store button needs a link; without one the screen says what to do by hand.
  busy: boolean;
}

const STORE_FALLBACK = "Open your app store and update Ascendra to keep going.";

// "You have 2.0.0; 2.1.0 or newer is needed." or "" when the server named no minimum.
export function versionLine(current: string, minVersion: string | null): string {
  return minVersion ? `You have version ${current}; version ${minVersion} or newer is needed.` : "";
}

export function updatePromptView(
  platform: AppPlatform,
  phase: UpdatePhase,
  info: Pick<UpdateRequired, "message" | "minVersion" | "storeUrl">,
  currentVersion: string
): UpdatePromptView {
  if (platform === "web") {
    return {
      title: "Update required",
      message: "A newer version of Ascendra is available. Reload to get it.",
      action: "reload",
      actionLabel: "Reload",
      busy: false,
    };
  }
  if (phase === "checking") {
    return { title: "Checking for an update", message: "One moment. If there is an update, we'll install it and restart.", action: null, actionLabel: null, busy: true };
  }
  if (phase === "installing") {
    return { title: "Installing the update", message: "Ascendra will restart when it's ready.", action: null, actionLabel: null, busy: true };
  }
  const line = versionLine(currentVersion, info.minVersion);
  const message = [info.message.trim() || "Please update Ascendra.", line].filter(Boolean).join(" ");
  return info.storeUrl
    ? { title: "Update required", message, action: "store", actionLabel: "Update Ascendra", busy: false }
    : { title: "Update required", message: `${message} ${STORE_FALLBACK}`, action: "check-again", actionLabel: "Check again", busy: false };
}

// Whether a phone should look for an over-the-air update before sending the
// learner to the store: updates must be on (not Expo Go, not a dev build).
export function shouldTryOta(platform: AppPlatform, updatesEnabled: boolean): boolean {
  return platform !== "web" && updatesEnabled;
}

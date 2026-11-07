// REQ-119 (Audit 3 product M7): hands the reminder plan from
// src/lib/reminders.ts to expo-notifications. Local notifications only;
// nothing is registered with a push service and no token leaves the phone.
//
// Every reminder this app schedules carries data.kind = "study-reminder", so
// a change cancels exactly ours and reschedules from the current prefs.
// Web has no scheduled local notifications: everything here is a no-op there
// and the settings screen says reminders live in the phone app.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { parseReminderPrefs, reminderKey, reminderSchedule, type ReminderPrefs } from "@/lib/reminders";

const KIND = "study-reminder";
const CHANNEL = "study-reminders";

export const remindersSupported = Platform.OS === "ios" || Platform.OS === "android";

let handlerSet = false;
function ensureHandler() {
  if (handlerSet || !remindersSupported) return;
  handlerSet = true;
  // Shown as a quiet banner while the app is open: no sound, no badge.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function loadReminderPrefs(userId: string): Promise<ReminderPrefs> {
  try {
    return parseReminderPrefs(await AsyncStorage.getItem(reminderKey(userId)));
  } catch {
    return parseReminderPrefs(null);
  }
}

export async function saveReminderPrefs(userId: string, prefs: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(reminderKey(userId), JSON.stringify(prefs));
}

// "granted" | "denied" | "undetermined"; asks only when `ask` is true (the
// learner just switched reminders on), never on its own.
export async function notificationPermission(ask: boolean): Promise<"granted" | "denied" | "undetermined"> {
  if (!remindersSupported) return "denied";
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !ask) return current.granted ? "granted" : current.canAskAgain ? "undetermined" : "denied";
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: false, allowBadge: false } });
  return asked.granted ? "granted" : "denied";
}

export async function cancelStudyReminders(): Promise<void> {
  if (!remindersSupported) return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content.data as { kind?: string } | null)?.kind === KIND)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Nothing scheduled, or the module is unavailable: nothing to cancel.
  }
}

// Replace whatever is scheduled with the plan for `prefs`. Returns how many
// reminders are now scheduled (0 when off, on web, or without permission).
export async function applyReminders(prefs: ReminderPrefs): Promise<number> {
  await cancelStudyReminders();
  const slots = reminderSchedule(prefs);
  if (!remindersSupported || !slots.length) return 0;
  if ((await notificationPermission(false)) !== "granted") return 0;
  ensureHandler();
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Study reminders",
      description: "The reminders you set in Settings. Turn them off there any time.",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  }
  for (const s of slots) {
    await Notifications.scheduleNotificationAsync({
      content: { title: s.title, body: s.body, data: { kind: KIND }, sound: false },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: s.weekday,
        hour: s.hour,
        minute: s.minute,
        channelId: CHANNEL,
      },
    });
  }
  return slots.length;
}

// On sign-in (or a different account on the same phone): schedule this
// user's reminders and nobody else's.
export async function syncRemindersFor(userId: string | null): Promise<void> {
  if (!remindersSupported) return;
  try {
    if (!userId) return await cancelStudyReminders();
    await applyReminders(await loadReminderPrefs(userId));
  } catch {
    // Best effort: a reminder problem must never get in the way of the app.
  }
}

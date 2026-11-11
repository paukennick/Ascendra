// REQ-119 (Audit 3 product M7): hands the reminder plan from
// src/lib/reminders.ts to expo-notifications. Local notifications only;
// nothing is registered with a push service and no token leaves the phone.
//
// REQ-197: the words come from the server's plan (GET /api/reminders/plan),
// fetched at sign-in and whenever the app comes back to the front (at most
// every 30 minutes), and kept on the phone (ascendra.reminderPlan.<userId>)
// so a settings change can be re-applied offline. Each reminder is a
// one-off notification on a date (no weekly repeat): a learner who stops
// opening the app gets at most the days already planned, then silence --
// never a stream of nudges.
//
// Every reminder this app schedules carries data.kind = "study-reminder", so
// a change cancels exactly ours and reschedules from the current prefs.
// Web has no scheduled local notifications: everything here is a no-op there
// and the settings screen says reminders live in the phone app.
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { api } from "@/api/client";
import { createSerialQueue } from "@/lib/serialQueue";
import {
  localDay,
  REMINDER_KIND,
  parsePlan,
  parseReminderPrefs,
  reminderKey,
  reminderSchedule,
  type PlanReminder,
  type ReminderPrefs,
} from "@/lib/reminders";

const KIND = REMINDER_KIND;
// REQ-217 (FAIL-1058): every change to what is scheduled runs through this, one at a time.
const serial = createSerialQueue();
const CHANNEL = "study-reminders";
const PLAN_DAYS = 7;
const REFRESH_MS = 30 * 60 * 1000;

export const remindersSupported = Platform.OS === "ios" || Platform.OS === "android";

const planKey = (userId: string) => `ascendra.reminderPlan.${userId}`;

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

async function cachedPlan(userId: string): Promise<PlanReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(planKey(userId));
    return raw ? parsePlan(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

// The server's plan for the next week, or null when it can't be reached
// (offline, signed out): the caller then keeps what is already scheduled.
async function fetchPlan(userId: string): Promise<PlanReminder[] | null> {
  try {
    const res = await api.get<unknown>(`/api/reminders/plan?today=${localDay(new Date())}&days=${PLAN_DAYS}`);
    const plan = parsePlan(res);
    await AsyncStorage.setItem(planKey(userId), JSON.stringify({ reminders: plan }));
    return plan;
  } catch {
    return null;
  }
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

async function cancelAll(): Promise<void> {
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

export function cancelStudyReminders(): Promise<void> {
  return serial(cancelAll);
}

// Replace whatever is scheduled with the plan for `prefs`. Returns how many
// reminders are now scheduled (0 when off, on web, without permission, or
// when nothing is due in the coming days).
export function applyReminders(userId: string, prefs: ReminderPrefs, opts: { refresh?: boolean } = {}): Promise<number> {
  if (!remindersSupported) return Promise.resolve(0);
  return serial(() => applyNow(userId, prefs, opts));
}

async function applyNow(userId: string, prefs: ReminderPrefs, opts: { refresh?: boolean }): Promise<number> {
  if (!prefs.enabled) {
    await cancelAll();
    return 0;
  }
  const fresh = opts.refresh === false ? null : await fetchPlan(userId);
  const plan = fresh ?? (await cachedPlan(userId));
  await cancelAll();
  const slots = reminderSchedule(prefs, plan, new Date());
  if (!slots.length) return 0;
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
      content: { title: s.title, body: s.body, data: { kind: KIND, trackId: s.trackId }, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: s.at, channelId: CHANNEL },
    });
  }
  return slots.length;
}

let lastSync = 0;
let syncedUser: string | null = null;

// On sign-in (or a different account on the same phone): schedule this
// user's reminders and nobody else's.
export async function syncRemindersFor(userId: string | null): Promise<void> {
  if (!remindersSupported) return;
  try {
    syncedUser = userId;
    if (!userId) return await cancelStudyReminders();
    lastSync = Date.now();
    await applyReminders(userId, await loadReminderPrefs(userId));
  } catch {
    // Best effort: a reminder problem must never get in the way of the app.
  }
}

// REQ-197: re-plan when the app comes back to the front, so what was
// reviewed today (here or on the web) is not what tomorrow's reminder names.
export function watchAppForeground(getUserId: () => string | null): () => void {
  if (!remindersSupported) return () => undefined;
  const sub = AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    const userId = getUserId();
    if (!userId || (userId === syncedUser && Date.now() - lastSync < REFRESH_MS)) return;
    void syncRemindersFor(userId);
  });
  return () => sub.remove();
}

// REQ-217 (FAIL-1059): tapping a study reminder opens Review. Nothing handled
// the tap before, so it opened whatever screen the app was last left on, not
// the one the reminder named. A cold start from the tap is handled too (the
// last response is read once the learner is signed in); each tap once.
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { reminderTapTarget } from "@/lib/reminders";
import { remindersSupported } from "@/lib/reminderScheduler";

export function useReminderTap(signedIn: boolean): void {
  const router = useRouter();
  const handled = useRef<string | null>(null);
  // Reading the hook on web would touch a native module; the check is constant for the app's life.
  const response = remindersSupported ? Notifications.useLastNotificationResponse() : null;
  useEffect(() => {
    if (!signedIn || !response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    const target = reminderTapTarget(response.notification.request.content.data);
    if (!target) return;
    handled.current = id;
    router.push(target);
  }, [signedIn, response, router]);
}

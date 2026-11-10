import React, { useEffect, useState } from "react";
import { Linking, Switch, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { Body, Button, Card, Chip, ErrorBanner, H2, Loading, Muted, Screen } from "@/components/ui";
import {
  DAY_NAMES,
  DEFAULT_REMINDERS,
  GENERIC_REMINDER,
  formatTime,
  reminderError,
  shiftTime,
  type ReminderPrefs,
} from "@/lib/reminders";
import {
  applyReminders,
  loadReminderPrefs,
  notificationPermission,
  remindersSupported,
  saveReminderPrefs,
} from "@/lib/reminderScheduler";
import { colors, spacing } from "@/lib/theme";

// REQ-119 (Audit 3 product M7): opt-in study reminders. Off until the
// learner turns them on; they pick the days and the time, and the time
// can't fall in their quiet hours. Local notifications only.
// REQ-197: each one names what is due and why, from the learner's review
// schedule; no reminder on a day with nothing due; "Show topic on lock
// screen" (on by default) can swap in a generic line.

function TimeStepper({ label, value, onChange }: { label: string; value: number; onChange: (m: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
      <Body style={{ flex: 1 }}>{label}</Body>
      <Button label="Earlier" accessibilityLabel={`${label}: 15 minutes earlier`} icon="minus" variant="ghost" size="sm" fullWidth={false} onPress={() => onChange(shiftTime(value, -15))} />
      <View accessible accessibilityLabel={`${label}: ${formatTime(value)}`} accessibilityLiveRegion="polite">
        <Muted style={{ minWidth: 72, textAlign: "center", color: colors.text }}>{formatTime(value)}</Muted>
      </View>
      <Button label="Later" accessibilityLabel={`${label}: 15 minutes later`} icon="plus" variant="ghost" size="sm" fullWidth={false} onPress={() => onChange(shiftTime(value, 15))} />
    </View>
  );
}

function savedMessage(n: number, time: number): string {
  if (n === 0) return `Saved. Nothing is due on your chosen days this week, so no reminder is set yet; this updates when you open the app.`;
  return `Saved. ${n} reminder${n === 1 ? "" : "s"} set for the coming week at ${formatTime(time)}, each naming what's due.`;
}

export default function RemindersSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadReminderPrefs(user.id).then(setPrefs);
  }, [user]);

  if (!remindersSupported) {
    return (
      <Screen>
        <Card>
          <H2>Study reminders</H2>
          <Muted>
            Study reminders are only in the Ascendra phone app; the web version doesn&apos;t send any. On the phone they are off
            unless you turn them on.
          </Muted>
        </Card>
      </Screen>
    );
  }
  if (!prefs || !user) return <Loading />;

  const problem = reminderError(prefs);

  async function save(next: ReminderPrefs) {
    setPrefs(next);
    setSaved(null);
    setError(null);
    if (reminderError(next)) return; // shown inline; nothing changes until it's fixed
    try {
      if (next.enabled) {
        const permission = await notificationPermission(true);
        setDenied(permission !== "granted");
        if (permission !== "granted") {
          await saveReminderPrefs(user!.id, { ...next, enabled: false });
          setPrefs({ ...next, enabled: false });
          return;
        }
      }
      await saveReminderPrefs(user!.id, next);
      const n = await applyReminders(user!.id, next);
      setSaved(next.enabled ? savedMessage(n, next.time) : "Reminders are off.");
    } catch {
      setError("Reminders couldn't be set just now. Your choices are kept; try again in a moment.");
    }
  }

  const toggleDay = (d: number) => {
    const days = prefs.days.includes(d) ? prefs.days.filter((x) => x !== d) : [...prefs.days, d].sort((a, b) => a - b);
    void save({ ...prefs, days });
  };

  return (
    <Screen>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <H2>Study reminders</H2>
            <Muted>
              On the days you choose, one reminder naming what&apos;s due for review, about how long it takes, and the days to your
              exam if you set one. No reminder when nothing is due. No streaks, no guilt.
            </Muted>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={(v) => save({ ...prefs, enabled: v })}
            accessibilityLabel="Study reminders"
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        {denied ? (
          <View style={{ gap: spacing.xs }}>
            <ErrorBanner message="Notifications are turned off for Ascendra in your phone's settings, so reminders can't show. You can allow them there and come back." />
            <Button label="Open phone settings" variant="link" fullWidth={false} onPress={() => Linking.openSettings()} />
          </View>
        ) : null}
      </Card>

      {prefs.enabled ? (
        <>
          <Card style={{ gap: spacing.sm }}>
            <H2>Days</H2>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {DAY_NAMES.map((name, d) => (
                <Chip key={name} label={name} active={prefs.days.includes(d)} onPress={() => toggleDay(d)} />
              ))}
            </View>
          </Card>
          <Card style={{ gap: spacing.md }}>
            <H2>Time</H2>
            <TimeStepper label="Remind me at" value={prefs.time} onChange={(time) => save({ ...prefs, time })} />
            <H2>Quiet hours</H2>
            <Muted>No reminder is ever set inside these hours.</Muted>
            <TimeStepper label="Quiet from" value={prefs.quietStart} onChange={(quietStart) => save({ ...prefs, quietStart })} />
            <TimeStepper label="Quiet until" value={prefs.quietEnd} onChange={(quietEnd) => save({ ...prefs, quietEnd })} />
          </Card>
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <H2>Show topic on lock screen</H2>
                <Muted>
                  {prefs.showTopic
                    ? "Reminders name the course and topic, which anyone who sees your lock screen can read."
                    : `Reminders say only "${GENERIC_REMINDER.body}"`}
                </Muted>
              </View>
              <Switch
                value={prefs.showTopic}
                onValueChange={(v) => save({ ...prefs, showTopic: v })}
                accessibilityLabel="Show topic on lock screen"
                trackColor={{ true: colors.accent, false: colors.border }}
              />
            </View>
          </Card>
        </>
      ) : null}

      {problem ? <ErrorBanner message={problem} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {saved && !problem ? (
        <View accessibilityLiveRegion="polite">
          <Muted style={{ textAlign: "center" }}>{saved}</Muted>
        </View>
      ) : null}
      {prefs.enabled ? (
        <Button label="Reset to defaults" variant="link" fullWidth={false} onPress={() => save({ ...DEFAULT_REMINDERS, enabled: true })} />
      ) : null}
    </Screen>
  );
}

import React, { useCallback, useState } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { Card, ChoiceSheet, Divider, ListRow, Muted, Screen, SectionHeader } from "@/components/ui";
import { LOCK_AFTER_OPTIONS, lockAfterLabel } from "@/lib/autoLock";
import { Alert } from "@/lib/alert";
import { colors } from "@/lib/theme";
import { useAuth } from "@/auth/AuthContext";
import { useBilling } from "@/billing/BillingContext";
import { planSummary } from "@/lib/billing";
import { accessPlanLine, parseAccess, showAccessSettings } from "@/lib/access";
import { useDiscounts } from "@/billing/useDiscounts";
import { settingsRowValue } from "@/lib/discounts";
import { reminderRowValue, type ReminderPrefs } from "@/lib/reminders";
import { loadReminderPrefs, remindersSupported } from "@/lib/reminderScheduler";

export default function Settings() {
  const router = useRouter();
  const { user, biometricAvailable, biometricEnabled, biometricLabel, enableBiometric, disableBiometric, lockAfter, setLockAfter } =
    useAuth();
  const [lockSheet, setLockSheet] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const { config, me } = useBilling();
  const { status: discounts } = useDiscounts();
  const access = parseAccess(user?.access);
  // REQ-206: the row used to say "Off unless you turn them on" whatever was saved.
  const [reminders, setReminders] = useState<ReminderPrefs | null>(null);
  const userId = user?.id;
  useFocusEffect(
    useCallback(() => {
      if (!userId || !remindersSupported) return;
      let live = true;
      loadReminderPrefs(userId)
        .then((p) => live && setReminders(p))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, [userId])
  );

  async function toggleBiometric(next: boolean) {
    setBiometricBusy(true);
    try {
      if (next) {
        const res = await enableBiometric();
        if (!res.ok) Alert.alert("Couldn't enable", res.error ?? "Something went wrong.");
      } else {
        await disableBiometric();
      }
    } catch {
      // REQ-217 (FAIL-1063): a failed keystore write used to leave the switch
      // snapping back with nothing said.
      Alert.alert(
        next ? "Couldn't turn this on" : "Couldn't turn this off",
        "The phone's secure storage didn't accept the change. Your sign-in is unchanged. Try again, or sign out and back in first."
      );
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <Screen>
      <SectionHeader label="Account" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="user" label="Profile & sign-in" value={user?.displayName ?? user?.email} onPress={() => router.push("/account")} />
      </Card>

      {/* REQ-144: unrestricted access is shown as the plan, with plans on or off. */}
      {access ? (
        <>
          <SectionHeader label="Plan" />
          <Card style={{ gap: 0 }}>
            <ListRow icon="star" label="Current plan" value={accessPlanLine(access)} onPress={config.enabled ? () => router.push("/plans") : undefined} />
          </Card>
        </>
      ) : null}

      {/* REQ-144: owners only; the server refuses everyone else too. */}
      {showAccessSettings(user) ? (
        <>
          <SectionHeader label="Access" />
          <Card style={{ gap: 0 }}>
            <ListRow icon="key" label="Unrestricted access" value="Give or remove" onPress={() => router.push("/settings/access")} />
          </Card>
        </>
      ) : null}

      {/* REQ-122: only while paid plans are on. */}
      {config.enabled && !access ? (
        <>
          <SectionHeader label="Plan" />
          <Card style={{ gap: 0 }}>
            <ListRow icon="star" label="Current plan" value={planSummary(me) || "Free"} onPress={() => router.push("/plans")} />
            {/* REQ-170: the free course matters until the plans cover every course. */}
            {me && !me.coversEverything ? (
              <>
                <Divider />
                <ListRow icon="book" label="Free course" value={me.freeCourse?.title ?? "Not picked yet"} onPress={() => router.push("/settings/free-course")} />
              </>
            ) : null}
            {/* REQ-166: only when the server offers verified discounts. */}
            {discounts.available ? (
              <>
                <Divider />
                <ListRow icon="award" label="Verified discount" value={settingsRowValue(discounts)} onPress={() => router.push("/settings/discount")} />
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* REQ-119 (M7): opt-in, kind study reminders. */}
      <SectionHeader label="Study" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="target" label="Study profile" value="Your goal, exams and study time" onPress={() => router.push("/settings/study-profile")} />
        <ListRow icon="bell" label="Study reminders" value={reminderRowValue(reminders, remindersSupported)} onPress={() => router.push("/settings/reminders")} />
        <Divider />
        {/* REQ-197: exam change notices, exam countdown, weekly digest. */}
        <ListRow icon="mail" label="Email" value="Exam notices and digest" onPress={() => router.push("/settings/emails")} />
      </Card>

      <SectionHeader label="Security" />
      <Card style={{ gap: 0 }}>
        <ListRow
          icon="shield"
          label="Two-factor authentication"
          value={user?.mfaEnabled ? "Enabled" : "Disabled"}
          onPress={() => router.push("/settings/mfa")}
        />
        {/* REQ-177: how long away before Ascendra locks. */}
        <Divider />
        <ListRow icon="lock" label="Lock Ascendra" value={lockAfterLabel(lockAfter)} onPress={() => setLockSheet(true)} />
        {biometricAvailable ? (
          <>
            <Divider />
            <ListRow
              icon="unlock"
              label={`Use ${biometricLabel}`}
              right={
                biometricBusy ? (
                  <ActivityIndicator size="small" color={colors.accent} accessibilityLabel={`Updating ${biometricLabel}`} />
                ) : (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ true: colors.accent, false: colors.border }}
                    accessibilityRole="switch"
                    accessibilityLabel={`Use ${biometricLabel}`}
                    accessibilityState={{ checked: biometricEnabled }}
                  />
                )
              }
            />
          </>
        ) : null}
      </Card>

      <ChoiceSheet
        visible={lockSheet}
        title="Lock Ascendra"
        message={
          biometricEnabled
            ? `After you've been away this long, unlock with ${biometricLabel} or your device passcode.`
            : "After you've been away this long, enter your password to carry on. Your work stays where you left it."
        }
        options={LOCK_AFTER_OPTIONS.map((o) => ({
          label: lockAfterLabel(o),
          variant: o === lockAfter ? "primary" : "ghost",
          selected: o === lockAfter,
          onPress: () => void setLockAfter(o),
        }))}
        onCancel={() => setLockSheet(false)}
      />

      <SectionHeader label="About" />
      <Card>
        {/* REQ-140: every release note, newest first. */}
        <ListRow icon="gift" label="What's new" onPress={() => router.push("/whats-new")} />
        <Divider />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Version</Muted>
          <Muted>{Constants.expoConfig?.version ?? "1.0.0"}</Muted>
        </View>
        <Divider />
        <Muted>
          Ascendra tracks your course progress, generates lessons and practice questions, and
          keeps everything in sync across devices.
        </Muted>
        <Divider />
        {/* REQ-119 (M6): every exam body, not only CompTIA. */}
        <Muted>
          Ascendra is an independent study aid. It is not affiliated with or endorsed by CompTIA, AWS,
          Microsoft, Google, PMI or any other certification or exam body. Exam and certification names
          and trademarks belong to their owners.
        </Muted>
        <Divider />
        <ListRow icon="info" label="Disclaimer and trademarks" onPress={() => router.push("/disclaimer")} />
        <ListRow icon="shield" label="Privacy Policy" onPress={() => router.push("/privacy")} />
        <ListRow icon="file-text" label="Terms of Service" onPress={() => router.push("/terms")} />
      </Card>
    </Screen>
  );
}

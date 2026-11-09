import React, { useState } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Card, Divider, ListRow, Muted, Screen, SectionHeader } from "@/components/ui";
import { Alert } from "@/lib/alert";
import { colors } from "@/lib/theme";
import { useAuth } from "@/auth/AuthContext";
import { useBilling } from "@/billing/BillingContext";
import { planSummary } from "@/lib/billing";
import { accessPlanLine, parseAccess, showAccessSettings } from "@/lib/access";
import { useDiscounts } from "@/billing/useDiscounts";
import { settingsRowValue } from "@/lib/discounts";

export default function Settings() {
  const router = useRouter();
  const { user, biometricAvailable, biometricEnabled, biometricLabel, enableBiometric, disableBiometric } = useAuth();
  const [biometricBusy, setBiometricBusy] = useState(false);
  const { config, me } = useBilling();
  const { status: discounts } = useDiscounts();
  const access = parseAccess(user?.access);

  async function toggleBiometric(next: boolean) {
    setBiometricBusy(true);
    try {
      if (next) {
        const res = await enableBiometric();
        if (!res.ok) Alert.alert("Couldn't enable", res.error ?? "Something went wrong.");
      } else {
        await disableBiometric();
      }
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
            {me?.tier === "free" ? (
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
        <ListRow icon="bell" label="Study reminders" value="Off unless you turn them on" onPress={() => router.push("/settings/reminders")} />
      </Card>

      <SectionHeader label="Security" />
      <Card style={{ gap: 0 }}>
        <ListRow
          icon="shield"
          label="Two-factor authentication"
          value={user?.mfaEnabled ? "Enabled" : "Disabled"}
          onPress={() => router.push("/settings/mfa")}
        />
        {biometricAvailable ? (
          <>
            <Divider />
            <ListRow
              icon="unlock"
              label={`Use ${biometricLabel}`}
              right={
                biometricBusy ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ true: colors.accent, false: colors.border }}
                  />
                )
              }
            />
          </>
        ) : null}
      </Card>

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

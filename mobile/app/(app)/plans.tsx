import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useBilling } from "@/billing/BillingContext";
import { buy, loadStorePackages, purchasesAvailable, restore, type StorePackage } from "@/billing/purchases";
import { Body, Button, Card, Chip, ErrorBanner, H2, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { friendlyError } from "@/lib/errorMessage";
import {
  FREE_MASTERY_NOTE,
  allowanceLine,
  googlePlanChange,
  manageUrl,
  perMonthText,
  planSummary,
  plansFor,
  priceText,
  savingsPercent,
  TIER_NAME,
  type BillingPlan,
} from "@/lib/billing";
import { colors, spacing } from "@/lib/theme";

// REQ-122: the plans screen. Reachable only while paid plans are on (the
// Settings row and the upgrade sheet are the only ways in); if the switch is
// turned off while it is open, it says plans aren't available and nothing
// else.
//
// Phones buy through the App Store / Google Play (RevenueCat); the web app
// through Stripe Checkout. Either way the server learns of it from the
// store's webhook, and this screen re-reads the plan afterwards.

export default function Plans() {
  const router = useRouter();
  const { user } = useAuth();
  const { config, me, refresh } = useBilling();
  const [tier, setTier] = useState<"plus" | "pro">("plus");
  const [store, setStore] = useState<StorePackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const native = Platform.OS === "ios" || Platform.OS === "android";
  const canBuyInApp = native && purchasesAvailable(config);

  useEffect(() => {
    if (!config.enabled || !user || !canBuyInApp) return;
    loadStorePackages(config, user.id, config.plans)
      .then(setStore)
      .catch(() => setStore([]));
  }, [config, user, canBuyInApp]);

  const choose = useCallback(
    async (plan: BillingPlan) => {
      if (!user) return;
      setError(null);
      setNote(null);
      setBusy(plan.id);
      try {
        if (native) {
          const pkg = store?.find((s) => s.planId === plan.id)?.pkg;
          if (!pkg) throw new Error("This plan isn't available in your store yet. Please try again later.");
          // REQ-124: on Play, replace the current subscription (upgrade now,
          // downgrade at the end of the paid period).
          const change = me?.entitlement
            ? googlePlanChange({ tier: me.tier, manage: me.entitlement.manage, productId: me.entitlement.productId, status: me.entitlement.status }, plan)
            : null;
          const r = await buy(config, user.id, pkg, change);
          if (r === "cancelled") return;
          setNote("Thanks! Your plan is being set up. It can take a minute to show here.");
          setTimeout(() => refresh(), 4000);
        } else {
          const { url } = await api.post<{ url: string }>("/api/billing/checkout", { planId: plan.id });
          if (Platform.OS === "web" && typeof window !== "undefined") window.location.assign(url);
          else await Linking.openURL(url);
        }
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setBusy(null);
      }
    },
    [config, me, native, refresh, store, user]
  );

  const doRestore = useCallback(async () => {
    if (!user) return;
    setError(null);
    setNote(null);
    setBusy("restore");
    try {
      await restore(config, user.id);
      setNote("Purchases restored. If you had a plan, it will show here in a moment.");
      setTimeout(() => refresh(), 4000);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, [config, refresh, user]);

  const manage = useCallback(async () => {
    setError(null);
    const m = me?.entitlement?.manage;
    try {
      if (m === "stripe") {
        const { url } = await api.post<{ url: string }>("/api/billing/portal", {});
        if (Platform.OS === "web" && typeof window !== "undefined") window.location.assign(url);
        else await Linking.openURL(url);
        return;
      }
      const url = manageUrl(m);
      if (url) await Linking.openURL(url);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [me]);

  if (!config.enabled) {
    return (
      <Screen>
        <Card>
          <H2>Plans</H2>
          <Muted>Paid plans aren't available yet. Everything in the app is open to you.</Muted>
        </Card>
      </Screen>
    );
  }
  if (native && canBuyInApp && store === null) return <Loading label="Loading plans" />;

  const current = me?.tier ?? "free";
  const tierInfo = config.tiers.find((t) => t.id === tier);
  const list = plansFor(config, tier);
  const monthly = list.find((p) => p.period === "monthly");
  const storePrice = (id: string) => store?.find((s) => s.planId === id)?.priceString ?? null;

  return (
    <Screen>
      <Card>
        <Muted>Your plan</Muted>
        <H2>{planSummary(me) || TIER_NAME[current]}</H2>
        {me?.allowances?.length ? (
          <View style={{ gap: 2 }}>
            {me.allowances.map((a) => (
              <Muted key={a.kind}>{allowanceLine(a)}</Muted>
            ))}
          </View>
        ) : null}
        {current === "free" ? <Muted>{FREE_MASTERY_NOTE}</Muted> : null}
        {me?.entitlement && me.entitlement.manage !== "grant" ? (
          <Button label="Manage subscription" variant="ghost" icon="external-link" onPress={manage} />
        ) : null}
      </Card>

      {error ? <ErrorBanner message={error} /> : null}
      {note ? (
        <Card>
          <View accessible accessibilityLiveRegion="polite">
            <Body>{note}</Body>
          </View>
        </Card>
      ) : null}

      {current !== "pro" ? (
        <>
          <View style={{ flexDirection: "row", gap: spacing.sm }} accessibilityRole="tablist">
            <Chip label="Plus" active={tier === "plus"} onPress={() => setTier("plus")} />
            <Chip label="Pro" active={tier === "pro"} onPress={() => setTier("pro")} />
          </View>
          {tierInfo ? (
            <Card>
              <H2>{tierInfo.name}</H2>
              <Body>{tierInfo.summary}</Body>
              {tierInfo.points.map((p) => (
                <Muted key={p}>{`• ${p}`}</Muted>
              ))}
            </Card>
          ) : null}
          <SectionHeader label="Choose how long" />
          {list.map((plan) => {
            const price = priceText(plan, storePrice(plan.id));
            const save = savingsPercent(plan, monthly);
            const per = storePrice(plan.id) ? null : perMonthText(plan);
            const unavailable = native ? !canBuyInApp || !storePrice(plan.id) : !config.webCheckout || !plan.web;
            return (
              <Card key={plan.id}>
                <Body style={{ color: colors.text }}>{price}</Body>
                {per || save ? <Muted>{[per, save ? `saves about ${save}% over monthly` : null].filter(Boolean).join(", ")}</Muted> : null}
                <Button
                  label={unavailable ? "Not available yet" : `Get ${TIER_NAME[plan.tier]}`}
                  accessibilityLabel={`Get ${TIER_NAME[plan.tier]}, ${price}`}
                  disabled={unavailable || (current === plan.tier && !!me?.entitlement)}
                  loading={busy === plan.id}
                  onPress={() => choose(plan)}
                />
              </Card>
            );
          })}
          {!native || store?.length ? null : (
            <Muted>Prices are shown by your app store in your own currency.</Muted>
          )}
          <Muted>
            Subscriptions renew automatically until you cancel. You can cancel any time in your
            {native ? (Platform.OS === "ios" ? " App Store" : " Google Play") : ""} subscription settings. If you cancel or move to a
            lower plan, you keep your current plan until the end of the period you paid for; moving up starts at once.
          </Muted>
        </>
      ) : null}

      {native && canBuyInApp ? (
        <Button label="Restore purchases" variant="link" loading={busy === "restore"} onPress={doRestore} />
      ) : null}
      {current === "free" ? (
        <Button label="Change my free course" variant="link" onPress={() => router.push("/settings/free-course")} />
      ) : null}
    </Screen>
  );
}

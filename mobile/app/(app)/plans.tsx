import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  defaultFamily,
  familiesFor,
  isScope,
  type BillingPlan,
  type PlanScope,
} from "@/lib/billing";
import { colors, spacing } from "@/lib/theme";
import { accessPlanLine, parseAccess, UNRESTRICTED_NOTE } from "@/lib/access";
import { useDiscounts } from "@/billing/useDiscounts";
import { plansDiscountLine } from "@/lib/discounts";

// REQ-170: plans are by category. The screen opens on the category the
// learner came from (the upgrade sheet passes it, the intake suggestion
// passes it and a length), else the first. A suggested length is only
// marked "Suggested for you"; its price is the same published price as
// every other learner sees.
//
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
  // REQ-166: verified group discounts (shown only when the server offers them).
  const { status: discounts } = useDiscounts();
  const params = useLocalSearchParams<{ scope?: string; period?: string; tier?: string }>();
  const [scope, setScope] = useState<PlanScope>(isScope(params.scope) ? params.scope : "it_cloud");
  const [family, setFamily] = useState<string | null>(null);
  const suggestedPeriod = typeof params.period === "string" && isScope(params.scope) && params.scope === scope ? params.period : null;
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
            ? googlePlanChange(
                { tier: me.tier, manage: me.entitlement.manage, productId: me.entitlement.productId, status: me.entitlement.status },
                plan,
                config.families
              )
            : null;
          // REQ-166: on Play a verified learner buys the group's published offer.
          // REQ-166: on Play a verified learner buys the group's published offer.
          const r = await buy(config, user.id, pkg, change, discounts.active?.playOfferId ?? null);
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
    [config, discounts.active, me, native, refresh, store, user]
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

  // REQ-144: owner and unrestricted accounts see that instead of plans.
  const unrestricted = parseAccess(user?.access) ?? parseAccess(me?.unrestricted);
  if (unrestricted) {
    return (
      <Screen>
        <Card>
          <Muted>Your plan</Muted>
          <H2>{accessPlanLine(unrestricted)}</H2>
          <Muted>{UNRESTRICTED_NOTE}</Muted>
        </Card>
      </Screen>
    );
  }
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
  const families = familiesFor(config, scope, me);
  const fam = family && families.includes(family) ? family : defaultFamily(config, scope, me, params.tier === "pro" ? "pro" : "plus");
  const famInfo = fam ? config.families[fam] : null;
  const scopeInfo = config.scopes.find((s) => s.id === scope);
  const tierInfo = famInfo ? config.tiers.find((t) => t.id === famInfo.tier) : null;
  const list = fam ? plansFor(config, fam) : [];
  const owned = new Set((me?.plans ?? []).map((p) => p.family));
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

      {!me?.coversEverything ? (
        <>
          <SectionHeader label="Choose a category" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} accessibilityRole="tablist">
            {config.scopes.map((sc) => (
              <Chip
                key={sc.id}
                label={sc.name}
                active={scope === sc.id}
                onPress={() => {
                  setScope(sc.id);
                  setFamily(null);
                }}
              />
            ))}
          </View>
          {scopeInfo ? <Muted>{scopeInfo.summary}</Muted> : null}
          {families.length > 1 ? (
            <View style={{ flexDirection: "row", gap: spacing.sm }} accessibilityRole="tablist">
              {families.map((f) => (
                <Chip key={f} label={TIER_NAME[config.families[f].tier]} active={fam === f} onPress={() => setFamily(f)} />
              ))}
            </View>
          ) : null}
          {famInfo && tierInfo ? (
            <Card>
              <H2>{famInfo.name}</H2>
              <Body>{tierInfo.summary}</Body>
              {tierInfo.points.map((p) => (
                <Muted key={p}>{`• ${p}`}</Muted>
              ))}
              {fam && owned.has(fam) ? <Muted>You have this plan.</Muted> : null}
            </Card>
          ) : (
            <Muted>Nothing to add here with your current plans.</Muted>
          )}
          <SectionHeader label="Choose how long" />
          {list.map((plan) => {
            const price = priceText(plan, storePrice(plan.id));
            const save = savingsPercent(plan, monthly);
            const per = storePrice(plan.id) ? null : perMonthText(plan);
            const unavailable = native ? !canBuyInApp || !storePrice(plan.id) : !config.webCheckout || !plan.web;
            return (
              <Card key={plan.id}>
                {suggestedPeriod === plan.period ? <Muted>Suggested for you, from your study profile</Muted> : null}
                <Body style={{ color: colors.text }}>{price}</Body>
                {per || save ? <Muted>{[per, save ? `saves about ${save}% over monthly` : null].filter(Boolean).join(", ")}</Muted> : null}
                <Button
                  label={unavailable ? "Not available yet" : `Get ${config.families[plan.family]?.name ?? TIER_NAME[plan.tier]}`}
                  accessibilityLabel={`Get ${config.families[plan.family]?.name ?? TIER_NAME[plan.tier]}, ${price}`}
                  disabled={unavailable || owned.has(plan.family)}
                  loading={busy === plan.id}
                  onPress={() => choose(plan)}
                />
              </Card>
            );
          })}
          {discounts.available ? (
            <>
              {plansDiscountLine(discounts, Platform.OS) ? <Muted>{plansDiscountLine(discounts, Platform.OS)}</Muted> : null}
              <Button
                label={discounts.active ? "Your discount" : "Verify for a discount"}
                variant="link"
                onPress={() => router.push("/settings/discount")}
              />
            </>
          ) : null}
          {config.samePriceNote ? <Muted>{config.samePriceNote}</Muted> : null}
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

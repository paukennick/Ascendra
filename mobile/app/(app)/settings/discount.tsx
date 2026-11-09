import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useBilling } from "@/billing/BillingContext";
import { useDiscounts } from "@/billing/useDiscounts";
import { presentOfferCodeSheet } from "@/billing/purchases";
import { Body, Button, Card, Chip, ChoiceSheet, ErrorBanner, H2, Loading, Muted, Screen, SectionHeader } from "@/components/ui";
import { friendlyError } from "@/lib/errorMessage";
import { activeLine, shortDate, verifyResultMessage, type DiscountGroup } from "@/lib/discounts";
import { PERIOD_NAME, TIER_NAME } from "@/lib/billing";
import { colors, spacing } from "@/lib/theme";

// REQ-166: "Verify for a discount". Reachable only from the plans screen and
// Settings, which show the way in only while GET /api/discounts says
// discounts are available (paid plans on, the feature on, a verification
// provider live). Says plainly what is checked and what is kept.
//
// Verifying opens the provider's own sign-in (in an in-app browser on a
// phone, in the same tab on the web). The provider sends the learner back to
// this page with ?verify=<result>; the server has already stored the result.
//
// Applying the discount: on the web the published Stripe coupon is applied
// at checkout; on Google Play the plans screen buys the group's offer; on
// the App Store the learner gets a one-time offer code here and redeems it.

const APP_RETURN = "preplms://settings/discount";

export default function DiscountScreen() {
  const { user } = useAuth();
  const { config } = useBilling();
  const { status, loaded, refresh } = useDiscounts();
  const params = useLocalSearchParams<{ verify?: string }>();
  const [result, setResult] = useState<string | null>(typeof params.verify === "string" ? params.verify : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [code, setCode] = useState<{ code: string; redeemUrl: string | null; expiresAt: string } | null>(null);

  useEffect(() => {
    if (typeof params.verify === "string") setResult(params.verify);
  }, [params.verify]);

  const verify = useCallback(
    async (g: DiscountGroup) => {
      setError(null);
      setResult(null);
      setBusy(g.id);
      try {
        const web = Platform.OS === "web";
        const { url } = await api.post<{ url: string }>("/api/discounts/verify", { group: g.id, client: web ? "web" : "app" });
        if (web && typeof window !== "undefined") {
          window.location.assign(url);
          return;
        }
        const r = await WebBrowser.openAuthSessionAsync(url, APP_RETURN);
        if (r.type === "success" && r.url) {
          const q = r.url.split("?")[1] ?? "";
          setResult(new URLSearchParams(q).get("verify"));
        }
        await refresh();
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const getCode = useCallback(async () => {
    if (!planId) return;
    setError(null);
    setBusy("code");
    try {
      setCode(await api.post<{ code: string; redeemUrl: string | null; expiresAt: string }>("/api/discounts/offer-code", { planId }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, [planId]);

  const redeem = useCallback(async () => {
    if (!code || !user) return;
    setError(null);
    try {
      await Clipboard.setStringAsync(code.code);
      if (await presentOfferCodeSheet(config, user.id)) return;
      if (code.redeemUrl) await Linking.openURL(code.redeemUrl);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [code, config, user]);

  const remove = useCallback(async () => {
    setError(null);
    setBusy("remove");
    try {
      await api.delete("/api/discounts/verifications");
      setCode(null);
      await refresh();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  if (!loaded) return <Loading label="Loading discounts" />;
  if (!status.available) {
    return (
      <Screen>
        <Card>
          <H2>Discounts</H2>
          <Muted>Verified discounts aren't available right now.</Muted>
        </Card>
      </Screen>
    );
  }

  const message = verifyResultMessage(result);
  const active = status.active;
  const live = status.verifications.filter((v) => v.live);

  return (
    <Screen>
      <Card>
        <H2>Verify for a discount</H2>
        <Body>
          If you're in one of these groups, verify once and get the group's published discount on a personal plan. The discount is the
          same for everyone in the group.
        </Body>
      </Card>

      {message ? (
        <Card>
          <View accessible accessibilityLiveRegion="polite">
            <Body style={{ color: message.ok ? colors.text : colors.muted }}>{message.text}</Body>
          </View>
        </Card>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {active ? (
        <Card>
          <Muted>Your discount</Muted>
          <H2>{activeLine(active)}</H2>
          <Muted>One discount at a time: if you're verified for more than one group, you get the largest.</Muted>
          {Platform.OS === "ios" ? (
            <View style={{ gap: spacing.sm }}>
              <Body>In the App Store your discount comes as an offer code for the plan you want. Pick a plan:</Body>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {config.plans.map((p) => (
                  <Chip key={p.id} label={`${TIER_NAME[p.tier]} ${PERIOD_NAME[p.period].toLowerCase()}`} active={planId === p.id} onPress={() => { setPlanId(p.id); setCode(null); }} />
                ))}
              </View>
              {code ? (
                <>
                  <Muted>Your offer code (copied when you tap Redeem), valid until {shortDate(code.expiresAt)}:</Muted>
                  <Text selectable style={{ color: colors.text, fontSize: 20, letterSpacing: 1 }}>{code.code}</Text>
                  <Button label="Redeem in the App Store" icon="external-link" onPress={redeem} />
                </>
              ) : (
                <Button label="Get my offer code" disabled={!planId} loading={busy === "code"} onPress={getCode} />
              )}
            </View>
          ) : (
            <Muted>
              {Platform.OS === "android"
                ? "It's applied when you choose a plan on the Plans screen."
                : active.web
                  ? "It's applied at checkout when you choose a plan."
                  : "It isn't available on the web yet. You can use it in the app."}
            </Muted>
          )}
        </Card>
      ) : null}

      <SectionHeader label="Groups" />
      {status.groups.map((g) => {
        const mine = live.find((v) => v.group === g.id);
        return (
          <Card key={g.id}>
            <H2>{`${g.label}: ${g.percent}% off`}</H2>
            <Muted>{g.who}</Muted>
            {g.note ? <Body>{g.note}</Body> : null}
            {mine ? (
              <Muted>{`Verified until ${shortDate(mine.expiresAt)}.`}</Muted>
            ) : (
              <Button
                label={g.provider ? `Verify with ${g.provider}` : "Verify"}
                loading={busy === g.id}
                disabled={!!busy && busy !== g.id}
                onPress={() => verify(g)}
              />
            )}
          </Card>
        );
      })}

      {status.classContact ? (
        <Button
          label={status.classContact.line}
          variant="link"
          accessibilityLabel={`${status.classContact.line} at ${status.classContact.email}`}
          onPress={() => Linking.openURL(`mailto:${status.classContact!.email}`)}
        />
      ) : null}

      <SectionHeader label="What's checked and what's kept" />
      <Card>
        <Body>{status.whatWeCheck}</Body>
        <Body>{status.whatWeStore}</Body>
      </Card>

      <SectionHeader label="Discount terms" />
      <Card>
        {status.terms.map((t) => (
          <Muted key={t}>{`• ${t}`}</Muted>
        ))}
      </Card>

      {status.verifications.length ? (
        <Button label="Remove my verification" variant="danger" loading={busy === "remove"} onPress={() => setConfirmRemove(true)} />
      ) : null}

      <ChoiceSheet
        visible={confirmRemove}
        title="Remove your verification?"
        message="We'll delete the verification result we keep. A discount already applied to a subscription stays for the time the store or checkout already gave it; new purchases are at the regular price unless you verify again."
        onCancel={() => setConfirmRemove(false)}
        options={[
          { label: "Remove", variant: "danger" as const, onPress: () => remove() },
          { label: "Keep it", onPress: () => {} },
        ]}
      />
    </Screen>
  );
}

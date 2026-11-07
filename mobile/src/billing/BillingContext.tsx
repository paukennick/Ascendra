// REQ-122: the learner's plan, for every signed-in screen.
//
// Reads GET /api/billing/config when the signed-in area opens (and on
// refresh). While config.enabled is false -- the default, and the answer
// whenever the server can't be reached -- this provider does nothing
// visible: no plan rows, no prices, no upgrade sheet, no purchases SDK.
// Turning BILLING_ENABLED on in the backend switches all of this on in an
// installed build with this code, without an app update.
//
// When on, a request the server refuses because of the plan (402) or a
// used-up allowance (429 with `allowance` / `aiPaused`) opens one gentle
// sheet: what happened in the server's own words, when it opens again in the
// phone's time, and "See plans" -- never a wall.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { api, registerBillingHook } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { ChoiceSheet } from "@/components/ui";
import {
  billingSignal,
  DISABLED_CONFIG,
  parseConfig,
  signalCopy,
  type BillingConfig,
  type BillingMe,
  type BillingSignal,
} from "@/lib/billing";
import { signOutPurchases } from "./purchases";

interface BillingState {
  config: BillingConfig;
  me: BillingMe | null;
  refresh: () => Promise<void>;
}

const BillingCtx = createContext<BillingState>({ config: DISABLED_CONFIG, me: null, refresh: async () => {} });

export function useBilling(): BillingState {
  return useContext(BillingCtx);
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<BillingConfig>(DISABLED_CONFIG);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [signal, setSignal] = useState<BillingSignal | null>(null);
  const enabledRef = useRef(false);

  const refresh = useCallback(async () => {
    let next = DISABLED_CONFIG;
    try {
      next = parseConfig(await api.get<unknown>("/api/billing/config"));
    } catch {
      next = DISABLED_CONFIG; // unreachable server: behave as before billing existed
    }
    setConfig(next);
    enabledRef.current = next.enabled;
    if (next.enabled && user) {
      try {
        setMe(await api.get<BillingMe>("/api/billing/me"));
      } catch {
        setMe(null);
      }
    } else {
      setMe(null);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    registerBillingHook((status, data) => {
      if (!enabledRef.current) return;
      const s = billingSignal(status, data);
      if (s) setSignal(s);
    });
    return () => {
      registerBillingHook(null);
      signOutPurchases();
    };
  }, []);

  const value = useMemo(() => ({ config, me, refresh }), [config, me, refresh]);
  const copy = signal ? signalCopy(signal) : null;
  const canUpgrade = me?.tier !== "pro";

  return (
    <BillingCtx.Provider value={value}>
      {children}
      <ChoiceSheet
        visible={!!signal && config.enabled}
        title={copy?.title ?? ""}
        message={copy?.body}
        onCancel={() => setSignal(null)}
        options={[
          ...(copy?.showPlans && canUpgrade ? [{ label: "See plans", variant: "primary" as const, onPress: () => router.push("/plans") }] : []),
          ...(signal?.kind === "upgrade" && signal.feature === "all_courses"
            ? [{ label: "Change my free course", onPress: () => router.push("/settings/free-course") }]
            : []),
          { label: "Not now", onPress: () => {} },
        ]}
      />
    </BillingCtx.Provider>
  );
}

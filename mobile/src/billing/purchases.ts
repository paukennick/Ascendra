// REQ-122: in-app purchases through RevenueCat (react-native-purchases 10.x;
// 11.x asks Expo apps to stay on 10.x for now). Loaded LAZILY: the module is
// imported, and the SDK configured, only when paid plans are on (server
// config) AND this build carries the public SDK key for the platform
// (EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY). With
// the switch off nothing here ever runs, so the native module is present in
// the build but idle.
//
// The app logs in to RevenueCat with the account id, so every webhook event
// carries it as app_user_id and the server knows whose entitlement it is.
// The server, not this file, decides what the learner can use: after a
// purchase or restore the app re-reads /api/billing/me.

import { Platform } from "react-native";
import { shouldInitPurchases, type BillingConfig, type BillingPlan } from "@/lib/billing";

type PurchasesModule = typeof import("react-native-purchases").default;
type PurchasesPackage = import("react-native-purchases").PurchasesPackage;

const KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
};

let mod: PurchasesModule | null = null;
let configured = false;
let currentUser: string | null = null;

export function purchasesAvailable(config: BillingConfig): boolean {
  return shouldInitPurchases(config, Platform.OS, KEYS) !== null;
}

async function ready(config: BillingConfig, userId: string): Promise<PurchasesModule | null> {
  const apiKey = shouldInitPurchases(config, Platform.OS, KEYS);
  if (!apiKey) return null;
  if (!mod) mod = (await import("react-native-purchases")).default;
  if (!configured) {
    mod.configure({ apiKey, appUserID: userId });
    configured = true;
    currentUser = userId;
  } else if (currentUser !== userId) {
    await mod.logIn(userId);
    currentUser = userId;
  }
  return mod;
}

export interface StorePackage {
  planId: string;
  priceString: string;
  pkg: PurchasesPackage;
}

// The store's packages for our plans, with the store's own (regional) price.
export async function loadStorePackages(config: BillingConfig, userId: string, plans: BillingPlan[]): Promise<StorePackage[]> {
  const P = await ready(config, userId);
  if (!P) return [];
  const offerings = await P.getOfferings();
  const offering = offerings.all[config.revenueCat.offering] ?? offerings.current;
  if (!offering) return [];
  const out: StorePackage[] = [];
  for (const plan of plans) {
    const productId = Platform.OS === "ios" ? plan.appStoreProductId : plan.playProductId;
    const pkg =
      offering.availablePackages.find((p) => p.product.identifier === productId) ??
      // A package of each tier is expected in its own offering when the same
      // package type is used twice; matching on product id above covers the
      // single "default" offering documented in docs/billing.md.
      null;
    if (pkg) out.push({ planId: plan.id, priceString: pkg.product.priceString, pkg });
  }
  return out;
}

// Resolves "cancelled" when the learner backs out (not an error).
// `change` (Android only, from googlePlanChange): replace the learner's
// current Play subscription -- at once for an upgrade, at the end of the
// paid period for a downgrade (REQ-124).
export async function buy(
  config: BillingConfig,
  userId: string,
  pkg: PurchasesPackage,
  change?: { oldProductIdentifier: string; mode: "immediate" | "deferred" } | null
): Promise<"purchased" | "cancelled"> {
  const P = await ready(config, userId);
  if (!P) throw new Error("Purchases aren't available in this version of the app.");
  try {
    if (change && Platform.OS === "android") {
      await P.purchasePackage(pkg, null, {
        oldProductIdentifier: change.oldProductIdentifier,
        prorationMode: change.mode === "deferred" ? P.PRORATION_MODE.DEFERRED : P.PRORATION_MODE.IMMEDIATE_WITH_TIME_PRORATION,
      });
    } else {
      await P.purchasePackage(pkg);
    }
    return "purchased";
  } catch (err) {
    if ((err as { userCancelled?: boolean })?.userCancelled) return "cancelled";
    throw err;
  }
}

export async function restore(config: BillingConfig, userId: string): Promise<void> {
  const P = await ready(config, userId);
  if (!P) throw new Error("Restoring purchases isn't available in this version of the app.");
  await P.restorePurchases();
}

// On sign-out: forget the account in the SDK (only if it was ever started).
export async function signOutPurchases(): Promise<void> {
  if (!mod || !configured || currentUser === null) return;
  currentUser = null;
  try {
    await mod.logOut();
  } catch {
    /* already anonymous */
  }
}

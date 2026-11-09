// REQ-166: this learner's verified-discount status, for the plans screen,
// Settings and the discount page. Asks the server only while paid plans are
// on; otherwise (and whenever the server can't be reached) it is "off" and
// nothing about discounts is shown.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useBilling } from "@/billing/BillingContext";
import { DISCOUNTS_OFF, parseDiscountStatus, type DiscountStatus } from "@/lib/discounts";

export function useDiscounts(): { status: DiscountStatus; loaded: boolean; refresh: () => Promise<void> } {
  const { user } = useAuth();
  const { config } = useBilling();
  const [status, setStatus] = useState<DiscountStatus>(DISCOUNTS_OFF);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!config.enabled || !user) {
      setStatus(DISCOUNTS_OFF);
      setLoaded(true);
      return;
    }
    try {
      setStatus(parseDiscountStatus(await api.get<unknown>("/api/discounts")));
    } catch {
      setStatus(DISCOUNTS_OFF);
    } finally {
      setLoaded(true);
    }
  }, [config.enabled, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loaded, refresh };
}

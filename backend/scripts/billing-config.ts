// REQ-124: `npm run billing:config` -- the paid-plans config the app would
// get with BILLING_ENABLED on, whatever the switch says now, and which
// billing settings are present (set / missing, never their values). For
// pre-launch checks: GET /api/billing/config says only { enabled: false }
// while the switch is off (Nick, 2026-11-07, decision 7). No database.
import "../supabase/seed/env-local";
import { operatorConfig } from "../lib/billing-config";

console.log(JSON.stringify(operatorConfig(), null, 2));

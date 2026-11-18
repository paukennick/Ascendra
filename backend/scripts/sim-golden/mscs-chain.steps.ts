// REQ-333: golden paths for the MSCS certificate chain case on the terminal
// (MSCS/mscs-renewed-cert-missing-intermediate.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "MSCS", slug: "mscs-renewed-cert-missing-intermediate" };

type C = Parameters<StepPath["drive"]>[0];
const record = (c: C, cause: string, fix: string) => c.act("document", { cause, fix });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "s_client shows the leaf alone, nginx config, fullchain.pem, reload, verified clean", reasoning: "met", drive: (c) => { run(c, "sclient"); run(c, "conf"); run(c, "stage", { p: "full" }); run(c, "reload"); run(c, "verify"); close(c); record(c, "chain", "fullchain"); } },
      { id: "verifyOff", title: "Reads the partner's error and accepts their offer to switch verification off", reasoning: "missed", drive: (c) => { run(c, "partnerLog"); run(c, "verifyOff"); waitUntil(c, 15); close(c); record(c, "root", "verifyOff"); } },
      { id: "addRoot", title: "Adds the root instead of the intermediate, reloads, verify still fails, closes", reasoning: "missed", drive: (c) => { run(c, "partnerLog"); run(c, "stage", { p: "leafroot" }); run(c, "reload"); run(c, "verify"); close(c); record(c, "root", "fullchain"); } },
      { id: "oldCert", title: "Looks at the chain, then goes back to last year's certificate", reasoning: "partial", drive: (c) => { run(c, "sclient"); run(c, "stage", { p: "old" }); run(c, "reload"); run(c, "verify"); close(c); record(c, "chain", "oldCert"); } },
      { id: "blind", title: "Switches to fullchain.pem without looking, reloads, closes unverified", reasoning: "partial", drive: (c) => { run(c, "stage", { p: "full" }); run(c, "reload"); close(c); record(c, "chain", "fullchain"); } },
      { id: "late", title: "Tries leaf plus root first, then looks, then fullchain after the cutoff, verified", reasoning: "met", drive: (c) => { run(c, "stage", { p: "leafroot" }); run(c, "reload"); waitUntil(c, 45); run(c, "sclient"); run(c, "stage", { p: "full" }); run(c, "reload"); run(c, "verify"); close(c); record(c, "chain", "fullchain"); } },
    ],
  };
}

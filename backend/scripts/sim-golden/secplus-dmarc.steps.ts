// REQ-316: golden paths for the Security+ email-defense case on the security
// console (SECPLUS/spoofed-ceo-wire-dmarc.sim.json). Each task costs analyst
// time through the `work` wait, so the console's shared driver steps apply.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECPLUS", slug: "spoofed-ceo-wire-dmarc" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Headers, hold the wire by phone, gateway rule, purge, reports, align PayrollCo, then p=quarantine; warn staff and suppliers",
        reasoning: "met",
        drive: (c) => {
          task(c, "headers");
          task(c, "holdWire");
          task(c, "gatewayRule");
          task(c, "purge");
          task(c, "reports");
          task(c, "alignPayroll");
          task(c, "setPolicy", { p: "quarantine" });
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "align" });
        },
      },
      {
        id: "rejectFirst",
        title: "Holds the wire and filters, then publishes p=reject without reading the reports",
        reasoning: "partial",
        drive: (c) => {
          task(c, "headers");
          task(c, "holdWire");
          task(c, "gatewayRule");
          task(c, "purge");
          task(c, "setPolicy", { p: "reject" });
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "reject" });
        },
      },
      {
        id: "gatewayOnly",
        title: "Holds the wire, filters and purges, but leaves the domain at p=none",
        reasoning: "partial",
        drive: (c) => {
          task(c, "headers");
          task(c, "holdWire");
          task(c, "gatewayRule");
          task(c, "purge");
          close(c);
          c.act("document", { lesson: "align" });
        },
      },
      {
        id: "wrongFocus",
        title: "Resets the CEO's password and reworks DNS first; the wire leaves at the cutoff",
        reasoning: "partial",
        drive: (c) => {
          task(c, "resetCeo");
          task(c, "reports");
          task(c, "alignPayroll");
          task(c, "setPolicy", { p: "quarantine" });
          task(c, "gatewayRule");
          task(c, "purge");
          for (let i = 0; i < 6; i++) task(c, "watch");
          close(c);
          c.act("document", { lesson: "align" });
        },
      },
      {
        id: "closeNow",
        title: "Holds the wire and closes, blaming training",
        reasoning: "missed",
        drive: (c) => {
          task(c, "holdWire");
          close(c);
          c.act("document", { lesson: "training" });
        },
      },
      {
        id: "lateHold",
        title: "Reads the headers and reports, aligns and enforces, then holds the wire just in time",
        reasoning: "partial",
        drive: (c) => {
          task(c, "headers");
          task(c, "reports");
          task(c, "alignPayroll");
          task(c, "setPolicy", { p: "quarantine" });
          task(c, "purge");
          task(c, "holdWire");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "align" });
        },
      },
    ],
  };
}

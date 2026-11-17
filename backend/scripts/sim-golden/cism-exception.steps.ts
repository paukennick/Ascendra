// REQ-313: golden paths for the CISM exception request on the governance
// board (CISM/cism-risk-appetite-exception.sim.json). The expectations are
// the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "CISM", slug: "cism-risk-appetite-exception" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const DAY = 86400;
const { task, watchUntil, close } = helpers("quarter", "busy", "work", "watch", "closeQuarter");
type C = Parameters<StepPath["drive"]>[0];
const record = (c: C, owner: string, basis: string) => c.act("document", { owner, basis });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Rates the risk, compares it with the appetite, works out controls, meets the VP, recommends 90 days on conditions, steering review, register entry, replacement plan",
      reasoning: "met",
      drive: (c) => {
        task(c, "assess");
        task(c, "compare");
        task(c, "options");
        task(c, "meetVp");
        task(c, "decide", { d: "grant90" });
        task(c, "steering");
        task(c, "register");
        task(c, "plan");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "vp", "appetite");
      },
    },
    {
      id: "noPlan",
      title: "The expert exception without a steering review or a replacement plan: safe, but outside governance at expiry",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assess");
        task(c, "compare");
        task(c, "options");
        task(c, "meetVp");
        task(c, "decide", { d: "grant90" });
        task(c, "register");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "vp", "appetite");
      },
    },
    {
      id: "deny",
      title: "Assesses and compares, then denies outright: no exposure, the launch slips and the VP is lost",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assess");
        task(c, "compare");
        task(c, "decide", { d: "deny" });
        task(c, "steering");
        task(c, "register");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "vp", "appetite");
      },
    },
    {
      id: "asAsked",
      title: "Grants six months as asked with no conditions: the stolen handheld in week 8 is a breach",
      reasoning: "missed",
      drive: (c) => {
        task(c, "meetVp");
        task(c, "decide", { d: "grant180" });
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "security", "request");
      },
    },
    {
      id: "signSelf",
      title: "Does the analysis and the controls, then signs the exception personally",
      reasoning: "missed",
      drive: (c) => {
        task(c, "assess");
        task(c, "compare");
        task(c, "options");
        task(c, "decide", { d: "self" });
        task(c, "steering");
        task(c, "register");
        task(c, "plan");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "security", "appetite");
      },
    },
    {
      id: "buyDevices",
      title: "Decides on conditions but also orders 120 thousand dollars of devices from a 40-thousand budget",
      reasoning: "missed",
      drive: (c) => {
        task(c, "assess");
        task(c, "compare");
        task(c, "options");
        task(c, "meetVp");
        task(c, "decide", { d: "grant90" });
        task(c, "devices");
        task(c, "steering");
        task(c, "register");
        watchUntil(c, 91 * DAY);
        close(c);
        record(c, "vp", "appetite");
      },
    },
  ];
}

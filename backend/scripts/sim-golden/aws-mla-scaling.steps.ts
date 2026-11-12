// REQ-242 (AWS board sims, wave 2): golden paths for
// AWSMLA/endpoint-scaling-latency, a learner-paced board case.
//
//   npm run sim:golden -- steps aws-mla-scaling
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSMLA", slug: "endpoint-scaling-latency" };

function load(c: Ctl, a: "right" | "wrong"): void {
  c.act("loadTest");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: metrics and a load test first, high-resolution concurrency policy, maximum 12, pre-warmed for the ad, 5XX alarm",
        reasoning: "met",
        drive: (c) => {
          c.act("metrics");
          load(c, "right");
          c.act("adPlan");
          c.act("setPolicy", { metric: "conc" });
          c.act("setMax", { cap: "c12" });
          c.act("prewarmAd");
          c.act("errorAlarm");
          week(c);
        },
      },
      {
        id: "invocations",
        title: "InvocationsPerInstance at 600 and maximum 12, no pre-warm: about 10 minutes of failures as it scales",
        reasoning: "met",
        drive: (c) => {
          c.act("metrics");
          load(c, "right");
          c.act("setPolicy", { metric: "inv600" });
          c.act("setMax", { cap: "c12" });
          week(c);
        },
      },
      {
        id: "noHeadroom",
        title: "Picks the right metric but at the 1,200 limit, maximum 40, pre-warmed for the ad: the ad is fine, the everyday target has no headroom",
        reasoning: "partial",
        drive: (c) => {
          c.act("metrics");
          load(c, "right");
          c.act("adPlan");
          c.act("setPolicy", { metric: "inv1200" });
          c.act("setMax", { cap: "c40" });
          c.act("prewarmAd");
          c.act("errorAlarm");
          week(c);
        },
      },
      {
        id: "latencyBlind",
        title: "Switches to a latency target on a hunch before looking, maximum 12: late, jerky scaling through the ad",
        reasoning: "partial",
        drive: (c) => {
          c.act("setPolicy", { metric: "latency" });
          c.act("setMax", { cap: "c12" });
          c.act("metrics");
          load(c, "right");
          c.act("errorAlarm");
          week(c);
        },
      },
      {
        id: "maxFour",
        title: "Failure: the right policy, but the maximum stays at 4; the ad overwhelms the endpoint",
        reasoning: "partial",
        drive: (c) => {
          c.act("metrics");
          load(c, "wrong");
          c.act("setPolicy", { metric: "inv600" });
          week(c);
        },
      },
      {
        id: "gpu",
        title: "Failure: buys GPU instances to fix latency; projected far over budget",
        reasoning: "missed",
        drive: (c) => {
          c.act("metrics");
          c.act("setInstance", { type: "g5" });
          c.act("setPolicy", { metric: "inv600" });
          c.act("setMax", { cap: "c12" });
          week(c);
        },
      },
    ],
  };
}

// REQ-297: golden paths for the AWS SAA login flood and SQL injection case on
// the board screen (AWSSAA/waf-login-flood-sqli.sim.json). Each task costs
// minutes through the `work` wait, so the console's shared driver steps
// apply. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "AWSSAA", slug: "waf-login-flood-sqli" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Metrics and logs, web ACL, SQL database rule group, a 300 rate limit, origin locked to CloudFront",
        reasoning: "met",
        drive: (c) => {
          task(c, "metrics");
          task(c, "logs");
          task(c, "createAcl");
          task(c, "sqliRule");
          task(c, "rateRule", { limit: "right" });
          task(c, "originLock");
          close(c);
          c.act("document", { layer: "l7waf", follow: "param" });
        },
      },
      {
        id: "lowLimit",
        title: "Everything in place, but the rate limit at 10 blocks real customers",
        reasoning: "partial",
        drive: (c) => {
          task(c, "metrics");
          task(c, "logs");
          task(c, "createAcl");
          task(c, "sqliRule");
          task(c, "rateRule", { limit: "low" });
          task(c, "originLock");
          close(c);
          c.act("document", { layer: "l7waf", follow: "param" });
        },
      },
      {
        id: "noOriginLock",
        title: "WAF rules right, the load balancer left open: the botnet goes around CloudFront before the on-sale",
        reasoning: "partial",
        drive: (c) => {
          task(c, "metrics");
          task(c, "logs");
          task(c, "createAcl");
          task(c, "sqliRule");
          task(c, "rateRule", { limit: "right" });
          watchUntil(c, 62);
          close(c);
          c.act("document", { layer: "l7waf", follow: "wafEnough" });
        },
      },
      {
        id: "denyAndScale",
        title: "Security group deny rules and scaling out; the injection is never seen",
        reasoning: "missed",
        drive: (c) => {
          task(c, "metrics");
          task(c, "sgDeny");
          task(c, "scaleOut");
          watchUntil(c, 50);
          close(c);
          c.act("document", { layer: "sg", follow: "wafEnough" });
        },
      },
      {
        id: "offline",
        title: "Reads the logs, then takes the whole site offline",
        reasoning: "missed",
        drive: (c) => {
          task(c, "logs");
          task(c, "offline");
          close(c);
          c.act("document", { layer: "shieldStd", follow: "param" });
        },
      },
      {
        id: "rateOnly",
        title: "Rate rule and origin lock without reading the logs; closes with the injection unblocked",
        reasoning: "missed",
        drive: (c) => {
          task(c, "createAcl");
          task(c, "rateRule", { limit: "right" });
          task(c, "originLock");
          close(c);
          c.act("document", { layer: "shieldStd", follow: "wafEnough" });
        },
      },
    ],
  };
}

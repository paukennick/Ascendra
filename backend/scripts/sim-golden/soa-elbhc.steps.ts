// REQ-316: golden paths for the CloudOps ELB health check case on the board
// (AWSSOA/alb-health-check-login-redirect.sim.json). Each task costs engineer
// time through the `work` wait. No prototype exists, so the expectations are
// the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "AWSSOA", slug: "alb-health-check-login-redirect" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Target health, activity history, /health versus /healthz, fix the path, alarm",
        reasoning: "met",
        drive: (c) => {
          task(c, "targetHealth");
          task(c, "activity");
          task(c, "curl");
          task(c, "fixPath");
          task(c, "alarm");
          watchUntil(c, 30);
          close(c);
          c.act("document", { lesson: "endpoint" });
        },
      },
      {
        id: "widen",
        title: "Reads target health and accepts 200-399 so the redirect passes",
        reasoning: "partial",
        drive: (c) => {
          task(c, "targetHealth");
          task(c, "widenMatcher");
          task(c, "alarm");
          watchUntil(c, 20);
          close(c);
          c.act("document", { lesson: "matcher" });
        },
      },
      {
        id: "rollback",
        title: "Rolls the release back by instance refresh; the campaign pages are lost",
        reasoning: "partial",
        drive: (c) => {
          task(c, "targetHealth");
          task(c, "activity");
          task(c, "rollback");
          watchUntil(c, 40);
          task(c, "alarm");
          close(c);
          c.act("document", { lesson: "endpoint" });
        },
      },
      {
        id: "graceOnly",
        title: "Raises the grace period and closes while the group still churns",
        reasoning: "partial",
        drive: (c) => {
          task(c, "activity");
          task(c, "grace");
          close(c);
          c.act("document", { lesson: "asg" });
        },
      },
      {
        id: "capacity",
        title: "Raises the grace period and the capacity; the campaign hits the churn",
        reasoning: "missed",
        drive: (c) => {
          task(c, "grace");
          task(c, "scaleOut");
          watchUntil(c, 61);
          task(c, "targetHealth");
          task(c, "fixPath");
          watchUntil(c, 70);
          close(c);
          c.act("document", { lesson: "asg" });
        },
      },
      {
        id: "suspendThenFix",
        title: "Suspends replacement first, then fixes the path and resumes; no alarm",
        reasoning: "partial",
        drive: (c) => {
          task(c, "suspend");
          task(c, "targetHealth");
          task(c, "curl");
          task(c, "fixPath");
          watchUntil(c, 20);
          task(c, "resume");
          close(c);
          c.act("document", { lesson: "endpoint" });
        },
      },
    ],
  };
}

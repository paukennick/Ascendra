// REQ-242 (AWS board sims, wave 2): golden paths for
// AWSSOA/ec2-status-check-recovery, a learner-paced board case.
//
//   npm run sim:golden -- steps aws-soa-recover
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSSOA", slug: "ec2-status-check-recovery" };

function config(c: Ctl, a: "right" | "wrong"): void {
  c.act("config");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: history, config and CPU first; recover on the system check (2 of 2), reboot on the instance check (3 of 3), on-call paged, cache moved to EBS",
        reasoning: "met",
        drive: (c) => {
          c.act("history");
          config(c, "right");
          c.act("cpuPattern");
          c.act("setRecover", { metric: "system" });
          c.act("setReboot", { metric: "instance3" });
          c.act("pageOnCall");
          c.act("moveToEbs");
          week(c);
        },
      },
      {
        id: "race",
        title: "The right alarms and the move to EBS, but the reboot alarm uses the same 2 periods as the recover alarm",
        reasoning: "partial",
        drive: (c) => {
          c.act("history");
          config(c, "right");
          c.act("setRecover", { metric: "system" });
          c.act("setReboot", { metric: "instance2" });
          c.act("pageOnCall");
          c.act("moveToEbs");
          week(c);
        },
      },
      {
        id: "simplifiedOnly",
        title: "Moves to EBS and relies on simplified recovery with no recover alarm; tries a recover alarm on the instance check, which is rejected",
        reasoning: "partial",
        drive: (c) => {
          c.act("history");
          config(c, "right");
          c.act("moveToEbs");
          c.act("setRecover", { metric: "instance" });
          c.act("setReboot", { metric: "instance3" });
          c.act("pageOnCall");
          week(c);
        },
      },
      {
        id: "alarmsNoEbs",
        title: "Failure: the right alarms, but the cache stays on the instance store; recovery comes back without it",
        reasoning: "partial",
        drive: (c) => {
          c.act("history");
          config(c, "wrong");
          c.act("setRecover", { metric: "system" });
          c.act("setReboot", { metric: "instance3" });
          c.act("pageOnCall");
          week(c);
        },
      },
      {
        id: "cpuReboot",
        title: "Failure: a CPU reboot alarm set on a hunch reboots the nightly job and misses the OS hang",
        reasoning: "missed",
        drive: (c) => {
          c.act("setReboot", { metric: "cpu" });
          c.act("setRecover", { metric: "system" });
          c.act("history");
          c.act("cpuPattern");
          week(c);
        },
      },
      {
        id: "replace",
        title: "Failure: puts the server in an Auto Scaling group of 1; the replacement voids the license",
        reasoning: "missed",
        drive: (c) => {
          c.act("history");
          c.act("useAsg");
          week(c);
        },
      },
    ],
  };
}

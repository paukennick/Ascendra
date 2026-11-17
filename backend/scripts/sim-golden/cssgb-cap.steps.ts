// REQ-312: golden paths for the CSSGB capability case on the data and code
// console (CSSGB/cssgb-capability-tool-wear.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "CSSGB", slug: "cssgb-capability-tool-wear" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Chart first (tool-wear drift); Cpk 1.36 against Ppk 0.92; insert change every 400 parts; an honest answer before 16:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "chart");
          run(c, "stats");
          run(c, "toollog");
          run(c, "rule");
          run(c, "report", { r: "honest" });
          record(c, { finding: "unstable", action: "tool" });
        },
      },
      {
        id: "cherry",
        title: "Sends the plant manager's 1.87 from subgroups 13-20",
        reasoning: "missed",
        drive: (c) => {
          run(c, "report", { r: "cherry" });
          record(c, { finding: "capable", action: "none" });
        },
      },
      {
        id: "withinOnly",
        title: "Computes the indices, charts afterwards, and sends Cpk 1.36 as capable",
        reasoning: "partial",
        drive: (c) => {
          run(c, "stats");
          run(c, "report", { r: "within" });
          run(c, "chart");
          record(c, { finding: "capable", action: "inspect" });
        },
      },
      {
        id: "honestNoPlan",
        title: "Charts and computes, sends the honest result, but leaves the tool change to the eye",
        reasoning: "partial",
        drive: (c) => {
          run(c, "chart");
          run(c, "stats");
          run(c, "report", { r: "honest" });
          record(c, { finding: "unstable", action: "none" });
        },
      },
      {
        id: "late",
        title: "Does the full study and plan, but waits and answers after 16:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "chart");
          run(c, "stats");
          run(c, "rule");
          for (let i = 0; i < 3; i++) run(c, "wait");
          run(c, "report", { r: "honest" });
          record(c, { finding: "unstable", action: "tool" });
        },
      },
      {
        id: "holdBack",
        title: "Charts and computes, then sends nothing",
        reasoning: "partial",
        drive: (c) => {
          run(c, "chart");
          run(c, "stats");
          record(c, { finding: "unstable", action: "tool" });
        },
      },
    ],
  };
}

// REQ-312: golden paths for the CSSGB control chart case on the data and
// code console (CSSGB/cssgb-fill-weight-chart.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "CSSGB", slug: "cssgb-fill-weight-chart" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "X-bar and R; the run of 8 from 09:00 with a stable range; the sensor refitted at 08:50 is reset; P3 and P4 held",
        reasoning: "met",
        drive: (c) => {
          run(c, "setChart", { kind: "xbar" });
          run(c, "rules");
          run(c, "readR");
          run(c, "ask");
          run(c, "fixSensor");
          run(c, "decide", { d: "since09" });
          record(c, { signal: "run", cause: "sensor" });
        },
      },
      {
        id: "supervisor",
        title: "Takes the p chart at its word and ships all four pallets",
        reasoning: "missed",
        drive: (c) => {
          run(c, "rules");
          run(c, "decide", { d: "shipall" });
          record(c, { signal: "noise", cause: "unknown" });
        },
      },
      {
        id: "tamper",
        title: "Sees the run on the right chart, raises the set point instead of finding the cause, holds everything",
        reasoning: "partial",
        drive: (c) => {
          run(c, "setChart", { kind: "xbar" });
          run(c, "rules");
          run(c, "tamper");
          run(c, "decide", { d: "all" });
          record(c, { signal: "run", cause: "unknown" });
        },
      },
      {
        id: "holdAll",
        title: "Reads the chart and fixes the cause, but holds all four pallets",
        reasoning: "met",
        drive: (c) => {
          run(c, "setChart", { kind: "xbar" });
          run(c, "rules");
          run(c, "ask");
          run(c, "fixSensor");
          run(c, "decide", { d: "all" });
          record(c, { signal: "run", cause: "sensor" });
        },
      },
      {
        id: "late",
        title: "Waits for more subgroups (both fall below the LCL), then finds the cause and decides after the truck",
        reasoning: "partial",
        drive: (c) => {
          run(c, "setChart", { kind: "xbar" });
          run(c, "rules");
          for (let i = 0; i < 4; i++) run(c, "wait");
          run(c, "ask");
          run(c, "fixSensor");
          run(c, "decide", { d: "since09" });
          record(c, { signal: "spread", cause: "sensor" });
        },
      },
      {
        id: "noDecision",
        title: "Finds the shift and the cause and stops without a release decision",
        reasoning: "partial",
        drive: (c) => {
          run(c, "setChart", { kind: "xbar" });
          run(c, "rules");
          run(c, "ask");
          record(c, { signal: "run", cause: "operator" });
        },
      },
    ],
  };
}

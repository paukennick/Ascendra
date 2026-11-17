// REQ-312: golden paths for the PL300 semi-additive measure case on the data
// and code console (PL300/pl300-stock-on-hand-summed.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PL300", slug: "pl300-stock-on-hand-summed" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Table view shows a daily snapshot; LASTNONBLANK; November reconciles with 14 Nov; publish before 15:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "checkGrain");
          run(c, "setMeasure", { m: "lastnb" });
          run(c, "reconcile");
          run(c, "publish");
          record(c, { cause: "summed", check: "snapshot" });
        },
      },
      {
        id: "publishAsIs",
        title: "Assumes a refresh problem and republishes the summed measure",
        reasoning: "missed",
        drive: (c) => {
          run(c, "publish");
          record(c, { cause: "refresh", check: "none" });
        },
      },
      {
        id: "average",
        title: "Sets the column to average, sees it does not match, and publishes anyway",
        reasoning: "partial",
        drive: (c) => {
          run(c, "checkGrain");
          run(c, "summarize");
          run(c, "reconcile");
          run(c, "publish");
          record(c, { cause: "summed", check: "looks" });
        },
      },
      {
        id: "lastdateBlank",
        title: "Looks first, uses LASTDATE, sees November blank, and publishes it",
        reasoning: "partial",
        drive: (c) => {
          run(c, "checkGrain");
          run(c, "setMeasure", { m: "lastdate" });
          run(c, "reconcile");
          run(c, "publish");
          record(c, { cause: "summed", check: "snapshot" });
        },
      },
      {
        id: "lateRight",
        title: "Changes the measure without looking, then checks, waits, and publishes after the cutoff",
        reasoning: "met",
        drive: (c) => {
          run(c, "setMeasure", { m: "lastnb" });
          run(c, "checkGrain");
          run(c, "reconcile");
          for (let i = 0; i < 4; i++) run(c, "wait");
          run(c, "publish");
          record(c, { cause: "summed", check: "snapshot" });
        },
      },
      {
        id: "holdBack",
        title: "Finds the cause and stops without publishing",
        reasoning: "partial",
        drive: (c) => {
          run(c, "checkGrain");
          record(c, { cause: "summed", check: "none" });
        },
      },
    ],
  };
}

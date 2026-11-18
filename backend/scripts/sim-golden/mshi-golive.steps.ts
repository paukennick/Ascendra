// REQ-333: golden paths for the MSHI EHR go-live readiness case on the
// governance board (MSHI/mshi-ehr-go-live-readiness.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-ehr-go-live-readiness" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const DAY = 86400;
const { task, watchUntil, close } = helpers("project", "busy", "work", "watch", "closeProject");
type C = Parameters<StepPath["drive"]>[0];
const record = (c: C, basis: string) => c.act("document", { basis });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Criteria first; prescription fix and retest; conversion validated; training push; command center; go on criteria; 30-day optimization",
      reasoning: "met",
      drive: (c) => {
        task(c, "criteria");
        task(c, "fixRx");
        task(c, "validate");
        task(c, "trainPush");
        task(c, "command");
        task(c, "decide", { g: "criteria" });
        watchUntil(c, 29 * DAY);
        task(c, "sustain");
        close(c);
        record(c, "criteria");
      },
    },
    {
      id: "datePlan",
      title: "Recommends go as planned with only the training push and the command center: live with failing prescriptions and unchecked allergies",
      reasoning: "missed",
      drive: (c) => {
        task(c, "trainPush");
        task(c, "command");
        task(c, "decide", { g: "asPlanned" });
        watchUntil(c, 29 * DAY);
        task(c, "sustain");
        close(c);
        record(c, "date");
      },
    },
    {
      id: "nextQuarter",
      title: "Agrees criteria, then postpones to next quarter: twelve more weeks of two systems",
      reasoning: "partial",
      drive: (c) => {
        task(c, "criteria");
        task(c, "decide", { g: "nextQuarter" });
        task(c, "fixRx");
        task(c, "validate");
        watchUntil(c, 40 * DAY);
        close(c);
        record(c, "criteria");
      },
    },
    {
      id: "slipped",
      title: "Fixes and validates, decides on criteria before agreeing them, trains late: goes live on day 42 without a command center",
      reasoning: "partial",
      drive: (c) => {
        task(c, "fixRx");
        task(c, "decide", { g: "criteria" });
        task(c, "criteria");
        task(c, "validate");
        watchUntil(c, 20 * DAY);
        task(c, "trainPush");
        watchUntil(c, 43 * DAY);
        task(c, "sustain");
        close(c);
        record(c, "criteria");
      },
    },
    {
      id: "noSustain",
      title: "The expert's readiness, but closes at go-live with no plan to sustain the change",
      reasoning: "partial",
      drive: (c) => {
        task(c, "criteria");
        task(c, "fixRx");
        task(c, "validate");
        task(c, "trainPush");
        task(c, "command");
        task(c, "decide", { g: "criteria" });
        watchUntil(c, 29 * DAY);
        close(c);
        record(c, "criteria");
      },
    },
    {
      id: "unvalidated",
      title: "Criteria, fix, training and command center, go on criteria, but the conversion is never validated: the day-42 go-live carries unchecked allergies",
      reasoning: "missed",
      drive: (c) => {
        task(c, "criteria");
        task(c, "fixRx");
        task(c, "trainPush");
        task(c, "command");
        task(c, "decide", { g: "criteria" });
        watchUntil(c, 43 * DAY);
        task(c, "sustain");
        close(c);
        record(c, "vendor");
      },
    },
  ];
}

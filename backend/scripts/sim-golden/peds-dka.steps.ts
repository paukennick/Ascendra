// REQ-233 (bedside wave 1): golden paths for CCRNPEDS/pediatric-dka-cerebral-edema.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps peds-dka
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "pediatric-dka-cerebral-edema" };

const ONSET = 15600;
const BRAIN = { sit: "brain", bg: "full", rec: "osmo" };
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const live = (c: Ctl): boolean => c.run.state.ended === null;

interface Plan {
  insAt: number; // tick to start insulin
  ins: "std" | "low" | "bolus";
  kAt: number | null; // tick to add potassium, or never
  dex: boolean; // add dextrose at glucose <= 300
  stopInsulinAt?: number; // stop insulin when glucose first <= this instead of dextrose
  hourly: boolean; // hourly neuro and glucose checks, labs every 2 h
  osmoAfter: number | null; // seconds after the first sign to give hyperosmolar therapy
  ct?: boolean; // send to CT first
  bicarb?: boolean;
  noLabs?: boolean; // never sends a gas or electrolytes
}

function drive(c: Ctl, p: Plan): void {
  pace(c, 3);
  upTo(c, 10);
  c.act("neuro");
  c.act("glucoseCheck");
  if (!p.noLabs) c.act("labs");
  c.act("fluids");
  teach(c);
  let nextHour = 3600;
  let nextLabs = 7200;
  let kDone = false;
  let insDone = false;
  let dexDone = false;
  let stopped = false;
  let edemaHandled = false;
  while (live(c)) {
    const t = c.run.state.tick;
    if (!kDone && p.kAt !== null && t >= p.kAt) {
      c.act("potassium");
      kDone = true;
    }
    if (!insDone && t >= p.insAt) {
      c.act("insulin", { ins: p.ins });
      insDone = true;
      if (p.bicarb) c.act("bicarb");
    }
    const glu = v(c, "gluLast") as number;
    if (p.dex && !dexDone && glu > 0 && glu <= 300) {
      c.act("dextrose");
      dexDone = true;
    }
    if (p.stopInsulinAt && !stopped && glu > 0 && glu <= p.stopInsulinAt) {
      c.act("insulin", { ins: "stop" });
      stopped = true;
    }
    if (p.hourly && t >= nextHour) {
      c.act("neuro");
      c.act("glucoseCheck");
      teach(c);
      nextHour += 3600;
    }
    if (p.hourly && !p.noLabs && t >= nextLabs && v(c, "labsPending") === false) {
      c.act("labs");
      nextLabs += 7200;
    }
    if (!edemaHandled && p.osmoAfter !== null && t >= ONSET + p.osmoAfter) {
      edemaHandled = true;
      c.act("neuro");
      if (p.ct) {
        c.act("ct");
        until(c, (x) => v(x, "ctAway") === false || x.run.state.ended !== null);
        if (!live(c)) break;
      }
      c.act("call", BRAIN);
      teach(c);
      c.skip("callbackT");
      if (!live(c)) break;
      c.act("osmo", { drug: "mannitol" });
    }
    // next decision point: the next whole minute
    upTo(c, t + 60);
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: fluids and potassium at once, insulin infusion at 1 h with no bolus, hourly checks, dextrose at 300, mannitol 5 minutes after the headache without a CT",
        reasoning: "met",
        drive: (c) => drive(c, { insAt: 1800, ins: "std", kAt: 20, dex: true, hourly: true, osmoAfter: 300 }),
      },
      {
        id: "lateOsmo",
        title: "Good DKA care at 0.05 U/kg/h, but the edema is treated 25 minutes after the first sign",
        reasoning: "partial",
        drive: (c) => drive(c, { insAt: 1800, ins: "low", kAt: 20, dex: true, hourly: true, osmoAfter: 1500 }),
      },
      {
        id: "ctFirst",
        title: "Insulin bolus at handover and a CT before mannitol",
        reasoning: "partial",
        drive: (c) => drive(c, { insAt: 30, ins: "bolus", kAt: 20, dex: true, hourly: true, osmoAfter: 240, ct: true }),
      },
      {
        id: "waitForCt",
        title: "Hourly checks only, so the headache waits for the next check; then a CT before mannitol",
        reasoning: "partial",
        drive: (c) => drive(c, { insAt: 1800, ins: "std", kAt: 20, dex: true, hourly: true, osmoAfter: 1100, ct: true }),
      },
      {
        id: "noPotassium",
        title: "Failure: insulin with no potassium in the fluid",
        reasoning: "partial",
        drive: (c) => drive(c, { insAt: 1800, ins: "std", kAt: null, dex: true, hourly: true, osmoAfter: 300 }),
      },
      {
        id: "missedEdema",
        title: "Failure: no hourly neuro checks, insulin stopped as the glucose fell, bicarbonate, and the headache never acted on",
        reasoning: "missed",
        drive: (c) => drive(c, { insAt: 1800, ins: "std", kAt: 3600, dex: false, stopInsulinAt: 200, hourly: false, osmoAfter: null, bicarb: true, noLabs: true }),
      },
    ],
  };
}

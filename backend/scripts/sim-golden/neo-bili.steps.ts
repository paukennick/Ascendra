// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNNEO/yellow-at-twenty-hours. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps neo-bili
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "yellow-at-twenty-hours" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: reads and plots by hour and risk, phototherapy now, calls, checks DAT and neuro, tells the parents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "tsb");
          test(c, "plot");
          act(c, "photo");
          act(c, "diagnose", { dx: "patho" });
          act(c, "refer", { how: "call" });
          test(c, "labs");
          test(c, "neuro");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Plots and starts phototherapy, but checks everything else before calling 9 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "tsb");
          test(c, "plot");
          act(c, "photo");
          test(c, "labs");
          test(c, "neuro");
          upTo(c, 150);
          act(c, "diagnose", { dx: "patho" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "skinFirst",
        title: "Calls promptly but holds the lights for skin-to-skin and never plots",
        reasoning: "partial",
        drive: (c) => {
          test(c, "tsb");
          act(c, "skin");
          act(c, "diagnose", { dx: "patho" });
          act(c, "refer", { how: "call" });
          act(c, "photo");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "physio",
        title: "Failure: calls it physiologic, gives water and leaves it for the morning",
        reasoning: "missed",
        drive: (c) => {
          test(c, "tsb");
          act(c, "diagnose", { dx: "physio" });
          act(c, "water");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "breast",
        title: "Failure: calls it breast milk jaundice and defers the lights",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "breast" });
          act(c, "skin");
          toEnd(c);
        },
      },
    ],
  };
}

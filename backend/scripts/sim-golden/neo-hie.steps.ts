// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNNEO/floppy-after-cord-prolapse. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps neo-hie
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "floppy-after-cord-prolapse" };

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
        title: "Expert at study pace: Sarnat and criteria, warmer off with a probe, neonatologist at once, glucose and seizure watch, parents told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "sarnat");
          test(c, "criteria");
          act(c, "warmOff");
          act(c, "probe");
          act(c, "diagnose", { dx: "cool" });
          act(c, "refer", { how: "call" });
          test(c, "glucose");
          test(c, "watch");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Examines and stops the warmer, but calls 9 minutes after the exam",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sarnat");
          test(c, "criteria");
          act(c, "warmOff");
          act(c, "probe");
          test(c, "glucose");
          test(c, "watch");
          upTo(c, 140);
          act(c, "diagnose", { dx: "cool" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "warmed",
        title: "Calls promptly but keeps him warm with a hat and blanket and skips the criteria check",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sarnat");
          act(c, "rewarm");
          act(c, "diagnose", { dx: "cool" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "mild",
        title: "Failure: calls it mild, keeps him warm and lists him for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "sarnat");
          act(c, "diagnose", { dx: "mild" });
          act(c, "rewarm");
          act(c, "refer", { how: "rounds" });
          toEnd(c);
        },
      },
      {
        id: "eeg",
        title: "Failure: waits for a morning EEG",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "eeg" });
          act(c, "waitEeg");
          toEnd(c);
        },
      },
    ],
  };
}

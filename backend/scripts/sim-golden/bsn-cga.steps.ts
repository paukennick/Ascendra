// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// BSNRN/eleven-pills-three-falls-sleep-aid. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps bsn-cga
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "BSNRN", slug: "eleven-pills-three-falls-sleep-aid" };

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
        title: "Expert at study pace: medication review, sleep aid held, calls, walker and aids, screens the rest, problem list with her",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "meds");
          act(c, "hold");
          act(c, "diagnose", { dx: "risk" });
          act(c, "refer", { how: "call" });
          act(c, "aids");
          test(c, "cog");
          test(c, "function");
          test(c, "nutrition");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Screens fully and acts, but calls 9 minutes after the medication review",
        reasoning: "partial",
        drive: (c) => {
          test(c, "meds");
          act(c, "hold");
          act(c, "aids");
          test(c, "cog");
          test(c, "function");
          test(c, "nutrition");
          upTo(c, 140);
          act(c, "diagnose", { dx: "risk" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "rails",
        title: "Holds the sleep aid and calls, but puts four rails up instead of individualized safety",
        reasoning: "partial",
        drive: (c) => {
          test(c, "meds");
          act(c, "hold");
          act(c, "railsUp");
          act(c, "diagnose", { dx: "risk" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sleepAid",
        title: "Failure: treats it as insomnia, gives the diphenhydramine and reports nothing",
        reasoning: "missed",
        drive: (c) => {
          test(c, "cog");
          act(c, "diagnose", { dx: "sleep" });
          act(c, "sleepAid");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "hfOnly",
        title: "Failure: sees only the heart failure, gives the sleep aid and puts the rails up",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "hf" });
          act(c, "sleepAid");
          act(c, "railsUp");
          toEnd(c);
        },
      },
    ],
  };
}

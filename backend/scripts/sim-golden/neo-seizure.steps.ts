// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNNEO/lip-smacking-and-a-pause. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps neo-seizure
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "lip-smacking-and-a-pause" };

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
        title: "Expert at study pace: watches, protects the airway, glucose and labs, calls, checks temperature and record, tells the parents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "observe");
          act(c, "airway");
          test(c, "poc");
          act(c, "labs");
          act(c, "diagnose", { dx: "sz" });
          act(c, "refer", { how: "call" });
          test(c, "temp");
          test(c, "record");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Recognizes it and checks glucose, but calls 7 minutes after the seizure",
        reasoning: "partial",
        drive: (c) => {
          test(c, "observe");
          act(c, "airway");
          test(c, "poc");
          act(c, "labs");
          test(c, "temp");
          test(c, "record");
          upTo(c, 130);
          act(c, "diagnose", { dx: "sz" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "fed",
        title: "Calls promptly but bottle-feeds him during the spells and sends no labs",
        reasoning: "partial",
        drive: (c) => {
          test(c, "observe");
          test(c, "poc");
          act(c, "feedNow");
          act(c, "diagnose", { dx: "sz" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "jitter",
        title: "Failure: calls it jitteriness, swaddles him and waits for the next feed",
        reasoning: "missed",
        drive: (c) => {
          test(c, "observe");
          act(c, "diagnose", { dx: "jitter" });
          act(c, "jittery");
          act(c, "refer", { how: "feed" });
          toEnd(c);
        },
      },
      {
        id: "reflux",
        title: "Failure: calls it reflux and feeds him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "reflux" });
          act(c, "feedNow");
          toEnd(c);
        },
      },
    ],
  };
}

// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSOCS/two-buses-and-a-copay-after-tka. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ocs-tka
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSOCS", slug: "two-buses-and-a-copay-after-tka" };

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
        title: "Expert at study pace: calf first, calls, preferences and coverage, knee, plans together, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "calf");
          act(c, "diagnose", { dx: "dvt" });
          act(c, "refer", { how: "surgeon" });
          test(c, "pref");
          test(c, "cover");
          test(c, "rom");
          act(c, "sdm");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Plans together, but finds the calf late and calls late",
        reasoning: "partial",
        drive: (c) => {
          test(c, "pref");
          test(c, "cover");
          test(c, "rom");
          upTo(c, 130);
          test(c, "calf");
          act(c, "sdm");
          upTo(c, 130);
          act(c, "diagnose", { dx: "dvt" });
          act(c, "refer", { how: "surgeon" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "imposed",
        title: "Finds the calf and calls, but books the standard plan",
        reasoning: "partial",
        drive: (c) => {
          test(c, "calf");
          act(c, "diagnose", { dx: "dvt" });
          act(c, "refer", { how: "surgeon" });
          test(c, "rom");
          act(c, "fixed");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "biked",
        title: "Failure: reads it as soreness and starts the bike",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "sore" });
          act(c, "bike");
          act(c, "refer", { how: "next" });
          toEnd(c);
        },
      },
      {
        id: "kneePain",
        title: "Failure: feels the calf, calls it knee pain, exercises her",
        reasoning: "missed",
        drive: (c) => {
          test(c, "calf");
          act(c, "diagnose", { dx: "knee" });
          act(c, "bike");
          toEnd(c);
        },
      },
    ],
  };
}

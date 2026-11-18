// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNNEO/sweaty-feeds-liver-edge-down. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps neo-chf
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "sweaty-feeds-liver-edge-down" };

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
        title: "Expert at study pace: breathing and liver, head up and time-limited feeds, calls, listens, reviews growth, tells her mother",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "resp");
          test(c, "liver");
          act(c, "hob");
          act(c, "gavage");
          act(c, "diagnose", { dx: "chf" });
          act(c, "refer", { how: "call" });
          test(c, "listen");
          test(c, "growth");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it and limits feeds, but calls 9 minutes after the liver",
        reasoning: "partial",
        drive: (c) => {
          test(c, "liver");
          act(c, "hob");
          act(c, "gavage");
          test(c, "resp");
          test(c, "listen");
          test(c, "growth");
          upTo(c, 140);
          act(c, "diagnose", { dx: "chf" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Calls promptly but pushes her through a full bottle and turns the oxygen up to 100%",
        reasoning: "partial",
        drive: (c) => {
          test(c, "liver");
          act(c, "push");
          act(c, "o2high");
          act(c, "diagnose", { dx: "chf" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lazy",
        title: "Failure: calls her a lazy feeder, pushes the feeds and leaves it for next week",
        reasoning: "missed",
        drive: (c) => {
          test(c, "resp");
          act(c, "diagnose", { dx: "lazy" });
          act(c, "push");
          act(c, "refer", { how: "nextweek" });
          toEnd(c);
        },
      },
      {
        id: "reflux",
        title: "Failure: reads it as reflux and gives high oxygen",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "reflux" });
          act(c, "o2high");
          toEnd(c);
        },
      },
    ],
  };
}

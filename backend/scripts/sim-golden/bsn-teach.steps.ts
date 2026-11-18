// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// BSNRN/insulin-pen-teaching-before-noon. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps bsn-teach
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "BSNRN", slug: "insulin-pen-teaching-before-noon" };

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
        title: "Expert at study pace: readiness, pain treated, plan by domain, discharge moved, knowledge and home, return demonstrations with his wife, documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "ready");
          act(c, "analg");
          act(c, "plan");
          act(c, "diagnose", { dx: "notyet" });
          act(c, "refer", { how: "move" });
          test(c, "knows");
          test(c, "home");
          act(c, "demo");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateMove",
        title: "Assesses and plans well, but moves discharge 9 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ready");
          act(c, "analg");
          act(c, "plan");
          test(c, "knows");
          test(c, "home");
          upTo(c, 140);
          act(c, "diagnose", { dx: "notyet" });
          act(c, "refer", { how: "move" });
          act(c, "demo");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lectured",
        title: "Moves discharge but lectures him through his pain and signs it off with the pamphlet",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ready");
          act(c, "lecture");
          act(c, "diagnose", { dx: "notyet" });
          act(c, "refer", { how: "move" });
          act(c, "pamphlet");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pamphlet",
        title: "Failure: reads him as ready, hands over the pamphlet and keeps the noon discharge",
        reasoning: "missed",
        drive: (c) => {
          test(c, "ready");
          act(c, "diagnose", { dx: "ready" });
          act(c, "pamphlet");
          act(c, "refer", { how: "noon" });
          toEnd(c);
        },
      },
      {
        id: "refusal",
        title: "Failure: calls it refusal, gives a quick talk and sends him home at noon",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "refuse" });
          act(c, "lecture");
          act(c, "refer", { how: "noon" });
          toEnd(c);
        },
      },
    ],
  };
}

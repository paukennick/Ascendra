// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/insulin-given-to-wrong-bed. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-mederror
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "insulin-given-to-wrong-bed" };

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
        title: "Expert at study pace: confirms the error; glucose and carbohydrate; names it; provider now; charge nurse and event report; dextrose; documented and disclosed",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "verify");
          test(c, "glucose");
          act(c, "carb");
          act(c, "diagnose", { dx: "error" });
          act(c, "refer", { how: "report" });
          act(c, "charge");
          upTo(c, 80);
          act(c, "iv");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Assesses and treats him first, confirms the error, then waits 6 minutes before calling the provider",
        reasoning: "partial",
        drive: (c) => {
          test(c, "assess");
          test(c, "glucose");
          act(c, "carb");
          test(c, "verify");
          act(c, "diagnose", { dx: "error" });
          upTo(c, 110);
          act(c, "refer", { how: "report" });
          act(c, "charge");
          upTo(c, 165);
          act(c, "iv");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "recordLeft",
        title: "Reports at once and treats him, but leaves the record showing bed 12 got his insulin and skips the charge nurse",
        reasoning: "partial",
        drive: (c) => {
          test(c, "verify");
          test(c, "glucose");
          act(c, "carb");
          act(c, "refer", { how: "report" });
          act(c, "fudge");
          act(c, "diagnose", { dx: "error" });
          upTo(c, 80);
          act(c, "iv");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "hidden",
        title: "Failure: confirms the error, decides there is nothing to report unless harm happens, and says nothing",
        reasoning: "missed",
        drive: (c) => {
          test(c, "verify");
          act(c, "diagnose", { dx: "watch" });
          act(c, "refer", { how: "conceal" });
          toEnd(c);
        },
      },
      {
        id: "minor",
        title: "Failure: checks his glucose, calls it a small dose and does nothing",
        reasoning: "missed",
        drive: (c) => {
          test(c, "glucose");
          act(c, "diagnose", { dx: "minor" });
          toEnd(c);
        },
      },
    ],
  };
}

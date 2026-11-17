// REQ-323 (health breadth): golden paths for
// ABPTSONC/post-mastectomy-strength-start-back-pain. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps onc-mscc
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSONC", slug: "post-mastectomy-strength-start-back-pain" };

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
        title: "Expert at study pace: arm check, back and leg questions, neurologic exam; no loading; emergency department now; a supervised plan for later; surgeon told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "arm");
          test(c, "back");
          test(c, "legs");
          test(c, "neuro");
          act(c, "diagnose", { dx: "mscc" });
          act(c, "refer", { how: "ed" });
          act(c, "planPrt", { which: "supervised" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateDecision",
        title: "A careful screen with no loading, but the emergency department decision more than 10 minutes after the first sign",
        reasoning: "partial",
        drive: (c) => {
          test(c, "arm");
          test(c, "vit");
          test(c, "back");
          test(c, "legs");
          test(c, "neuro");
          upTo(c, 200);
          act(c, "planPrt", { which: "supervised" });
          act(c, "diagnose", { dx: "mscc" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "loadedFirst",
        title: "Starts the resistance circuit before asking about the back, then finds the signs and sends her promptly",
        reasoning: "partial",
        drive: (c) => {
          test(c, "arm");
          act(c, "prt");
          test(c, "back");
          test(c, "legs");
          act(c, "diagnose", { dx: "mscc" });
          act(c, "refer", { how: "ed" });
          act(c, "planPrt", { which: "none" });
          toEnd(c);
        },
      },
      {
        id: "nextWeek",
        title: "Failure: hears the back and leg symptoms, calls it mechanical, home weights and an oncology appointment next week",
        reasoning: "missed",
        drive: (c) => {
          test(c, "back");
          test(c, "legs");
          act(c, "diagnose", { dx: "mech" });
          act(c, "planPrt", { which: "home" });
          act(c, "refer", { how: "onc" });
          toEnd(c);
        },
      },
      {
        id: "carriedOn",
        title: "Failure: takes the front desk's 'sore back' at face value, calls it mechanical and carries on with the circuit",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "mech" });
          act(c, "refer", { how: "continue" });
          act(c, "prt");
          toEnd(c);
        },
      },
    ],
  };
}

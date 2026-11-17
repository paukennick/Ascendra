// REQ-323 (health breadth): golden paths for
// ABPTSOCS/acute-back-pain-mri-request-cauda-equina. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ocs-ces
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSOCS", slug: "acute-back-pain-mri-request-cauda-equina" };

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
        title: "Expert at study pace: history, red flags, the cauda equina questions, a neurologic exam; emergency department now; physician told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "flags");
          test(c, "ces");
          test(c, "neuro");
          act(c, "diagnose", { dx: "ces" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateDecision",
        title: "Reassures and starts exercise, then asks the cauda equina questions and examines, but decides more than 10 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "flags");
          test(c, "slr");
          act(c, "noImaging");
          act(c, "exercise");
          test(c, "ces");
          test(c, "neuro");
          test(c, "saddle");
          upTo(c, 300);
          act(c, "diagnose", { dx: "ces" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "manipulatedFirst",
        title: "Manipulates on the history alone, then asks the cauda equina questions and sends him promptly",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          act(c, "manip");
          test(c, "ces");
          test(c, "neuro");
          act(c, "diagnose", { dx: "ces" });
          act(c, "refer", { how: "ed" });
          toEnd(c);
        },
      },
      {
        id: "outpatientMri",
        title: "Failure: hears the bladder symptoms, records sciatica and asks for an outpatient MRI in two weeks",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "ces");
          act(c, "diagnose", { dx: "sciatica" });
          act(c, "refer", { how: "gp" });
          toEnd(c);
        },
      },
      {
        id: "reassured",
        title: "Failure: no bladder or saddle questions, calls it chronic and sends him home with exercise",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "noImaging");
          act(c, "exercise");
          act(c, "diagnose", { dx: "chronic" });
          act(c, "refer", { how: "home" });
          toEnd(c);
        },
      },
      {
        id: "manipulatedOnly",
        title: "Failure: manipulation and a straight leg raise, no screen, no decision",
        reasoning: "missed",
        drive: (c) => {
          act(c, "manip");
          test(c, "slr");
          toEnd(c);
        },
      },
    ],
  };
}

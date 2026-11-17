// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/fever-stiff-neck-waiting-for-lp. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-meningitis
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "fever-stiff-neck-waiting-for-lp" };

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
        title: "Expert at study pace: neuro check; bacterial meningitis; intensivist cancels the hold; cultures, dexamethasone, antibiotics; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "neuro");
          act(c, "diagnose", { dx: "bm" });
          act(c, "refer", { how: "icu" });
          act(c, "bc");
          act(c, "dex");
          act(c, "abx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "History and perfusion first, then tells the intensivist 6 minutes after the neuro check; antibiotics still inside 15 minutes",
        reasoning: "partial",
        drive: (c) => {
          test(c, "history");
          test(c, "perf");
          test(c, "neuro");
          act(c, "diagnose", { dx: "bm" });
          upTo(c, 110);
          act(c, "refer", { how: "icu" });
          act(c, "bc");
          act(c, "dex");
          act(c, "abx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "abxFirst",
        title: "Calls and gives the antibiotics at once, but draws cultures and gives dexamethasone after them",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neuro");
          act(c, "refer", { how: "icu" });
          act(c, "abx");
          test(c, "perf");
          act(c, "bc");
          act(c, "dex");
          act(c, "diagnose", { dx: "bm" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "heldForLp",
        title: "Failure: assumes viral meningitis and holds the antibiotics for the CT and LP as the note says",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "diagnose", { dx: "viral" });
          act(c, "wait");
          act(c, "refer", { how: "wait" });
          toEnd(c);
        },
      },
      {
        id: "migraine",
        title: "Failure: takes the history, calls it a migraine and waits",
        reasoning: "missed",
        drive: (c) => {
          test(c, "history");
          act(c, "diagnose", { dx: "migraine" });
          toEnd(c);
        },
      },
    ],
  };
}

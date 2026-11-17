// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/fever-ten-days-after-chemo. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-neutro
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "fever-ten-days-after-chemo" };

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
        title: "Expert at study pace: ANC and an oral temperature; cultures; neutropenic fever; intensivist; antibiotic; precautions; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "count");
          test(c, "temp2");
          act(c, "cultures");
          act(c, "diagnose", { dx: "fn" });
          act(c, "refer", { how: "icu" });
          upTo(c, 80);
          act(c, "abx");
          act(c, "prec");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Source and perfusion first, reads the count late, calls 7 minutes after it; no precautions",
        reasoning: "partial",
        drive: (c) => {
          test(c, "source");
          test(c, "perf");
          test(c, "temp2");
          test(c, "count");
          act(c, "cultures");
          act(c, "diagnose", { dx: "fn" });
          upTo(c, 120);
          act(c, "refer", { how: "icu" });
          upTo(c, 175);
          act(c, "abx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "abxFirst",
        title: "Calls at once but gives the antibiotic before drawing cultures",
        reasoning: "partial",
        drive: (c) => {
          test(c, "count");
          act(c, "refer", { how: "icu" });
          act(c, "diagnose", { dx: "fn" });
          upTo(c, 70);
          act(c, "abx");
          test(c, "temp2");
          act(c, "cultures");
          act(c, "prec");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "acetaminophen",
        title: "Failure: grades it mild, gives acetaminophen and waits for the morning",
        reasoning: "missed",
        drive: (c) => {
          test(c, "count");
          act(c, "diagnose", { dx: "mild" });
          act(c, "apap");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "portOnly",
        title: "Failure: finds the red port site, calls it a line infection and never reads the count",
        reasoning: "missed",
        drive: (c) => {
          test(c, "source");
          act(c, "diagnose", { dx: "line" });
          toEnd(c);
        },
      },
    ],
  };
}

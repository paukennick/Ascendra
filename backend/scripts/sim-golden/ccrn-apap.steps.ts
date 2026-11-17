// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/toothache-tablets-level-above-line. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-apap
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "toothache-tablets-level-above-line" };

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
        title: "Expert at study pace: time of ingestion pinned; level plotted; acetylcysteine now; baselines; toxic ingestion; intensivist; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "ingest");
          test(c, "level");
          act(c, "nac");
          act(c, "lft");
          act(c, "diagnose", { dx: "toxic" });
          act(c, "refer", { how: "icu" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateStart",
        title: "Plots the level but starts acetylcysteine 21 minutes later and tells the intensivist late",
        reasoning: "partial",
        drive: (c) => {
          test(c, "symptoms");
          test(c, "level");
          test(c, "ingest");
          act(c, "lft");
          act(c, "diagnose", { dx: "toxic" });
          upTo(c, 290);
          act(c, "nac");
          act(c, "refer", { how: "icu" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noTime",
        title: "Starts acetylcysteine and calls at once, but never pins down the time of ingestion",
        reasoning: "partial",
        drive: (c) => {
          test(c, "level");
          act(c, "nac");
          act(c, "refer", { how: "icu" });
          act(c, "diagnose", { dx: "toxic" });
          act(c, "lft");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "repeatLevel",
        title: "Failure: plots the level, decides a repeat is needed and waits for it past the 8-hour mark",
        reasoning: "missed",
        drive: (c) => {
          test(c, "level");
          act(c, "diagnose", { dx: "unclear" });
          act(c, "repeat");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "looksWell",
        title: "Failure: sees few symptoms, decides the ingestion was not toxic and never finds the level",
        reasoning: "missed",
        drive: (c) => {
          test(c, "symptoms");
          act(c, "diagnose", { dx: "fine" });
          toEnd(c);
        },
      },
    ],
  };
}

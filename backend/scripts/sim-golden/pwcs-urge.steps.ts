// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPWCS/urgency-numb-legs-blurred-eye. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pwcs-urge
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPWCS", slug: "urgency-numb-legs-blurred-eye" };

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
        title: "Expert at study pace: history, neuro screen, calls, bladder diary, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "neuro");
          act(c, "diagnose", { dx: "ms" });
          act(c, "refer", { how: "md" });
          test(c, "diary");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Screens and starts the diary, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "neuro");
          test(c, "diary");
          upTo(c, 130);
          act(c, "diagnose", { dx: "ms" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noHx",
        title: "Screens and calls without the full history or diary",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neuro");
          act(c, "diagnose", { dx: "ms" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "oab",
        title: "Failure: treats idiopathic overactive bladder only",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "oab" });
          act(c, "only");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "stress",
        title: "Failure: calls it stress incontinence and treats the bladder only",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "stress" });
          act(c, "only");
          toEnd(c);
        },
      },
    ],
  };
}

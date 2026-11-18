// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSWMS/braden-eleven-purple-heel. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps wms-braden
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSWMS", slug: "braden-eleven-purple-heel" };

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
        title: "Expert at study pace: Braden, heels, float, tells the team, nutrition, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "braden");
          test(c, "heel");
          act(c, "float");
          act(c, "diagnose", { dx: "dti" });
          act(c, "refer", { how: "rn" });
          test(c, "nutr");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateTell",
        title: "Scores and floats at once but tells the team 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "braden");
          test(c, "heel");
          act(c, "float");
          test(c, "nutr");
          upTo(c, 130);
          act(c, "diagnose", { dx: "dti" });
          act(c, "refer", { how: "rn" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "massaged",
        title: "Massages the heel, then floats and reports, without a Braden score",
        reasoning: "partial",
        drive: (c) => {
          test(c, "heel");
          act(c, "massage");
          act(c, "float");
          act(c, "diagnose", { dx: "dti" });
          act(c, "refer", { how: "rn" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "bruise",
        title: "Failure: calls it a bruise, massages it and notes it for tomorrow",
        reasoning: "missed",
        drive: (c) => {
          test(c, "heel");
          act(c, "diagnose", { dx: "bruise" });
          act(c, "massage");
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "stage1",
        title: "Failure: calls it stage 1 and leaves it loaded",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "stage1" });
          toEnd(c);
        },
      },
    ],
  };
}

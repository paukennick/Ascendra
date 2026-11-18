// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPWCS/postpartum-gap-and-a-hard-bulge. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pwcs-dra
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPWCS", slug: "postpartum-gap-and-a-hard-bulge" };

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
        title: "Expert at study pace: gap, bulge, emergency department, bowel symptoms, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "ira");
          test(c, "bulge");
          act(c, "diagnose", { dx: "hernia" });
          act(c, "refer", { how: "ed" });
          test(c, "gi");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateRef",
        title: "Examines everything but sends her 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ira");
          test(c, "bulge");
          test(c, "gi");
          upTo(c, 130);
          act(c, "diagnose", { dx: "hernia" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Tries to reduce the bulge, then sends her",
        reasoning: "partial",
        drive: (c) => {
          test(c, "bulge");
          act(c, "reduce");
          act(c, "diagnose", { dx: "hernia" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "core",
        title: "Failure: treats diastasis only with curl-ups and a binder",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "dra" });
          act(c, "crunch");
          act(c, "refer", { how: "gp" });
          toEnd(c);
        },
      },
      {
        id: "fat",
        title: "Failure: calls it a fat pad and pushes it in",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "fat" });
          act(c, "reduce");
          toEnd(c);
        },
      },
    ],
  };
}

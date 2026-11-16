// REQ-278 (nursing specialty bedside sims): golden paths for
// FNPANCC/clinic-sulfonylurea-hypoglycemia. The expectations are the
// engine's own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps fnp-hypo
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-sulfonylurea-hypoglycemia" };

const upTo = (c: Ctl, tick: number): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.tick >= tick || x.run.state.ended !== null;
  });
const toEnd = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.ended !== null;
  });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: fingerstick, 15 g glucose, recheck at 15 minutes, a meal, the regimen reviewed and the glipizide stopped, note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 20);
          c.act("check");
          c.act("glucose");
          c.act("history");
          upTo(c, 20 + 900);
          c.act("check");
          if ((c.value("glu") as number) < 70) {
            c.act("glucose");
            upTo(c, c.run.state.tick + 900);
            c.act("check");
          }
          c.act("meal");
          c.act("plan", { choice: "stop" });
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "slowTreat",
        title: "History first, glucose tablets at 7 minutes, recheck at 15 minutes after, meal, glipizide stopped; no note",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("check");
          c.act("history");
          upTo(c, 420);
          c.act("glucose");
          upTo(c, 420 + 900);
          c.act("check");
          if ((c.value("glu") as number) < 70) {
            c.act("glucose");
            upTo(c, c.run.state.tick + 900);
            c.act("check");
          }
          c.act("meal");
          c.act("plan", { choice: "stop" });
          toEnd(c);
        },
      },
      {
        id: "chocolate",
        title: "Chocolate from her bag first, glucose at 8 minutes, a recheck at 40, the glipizide stopped without a review",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("check");
          c.act("chocolate");
          upTo(c, 480);
          c.act("glucose");
          upTo(c, 2400);
          c.act("check");
          if ((c.value("glu") as number) >= 70) c.act("meal");
          c.act("plan", { choice: "stop" });
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "sameDose",
        title: "Treated and rechecked on time, then 'don't skip breakfast' on the same dose",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("check");
          c.act("glucose");
          upTo(c, 920);
          c.act("check");
          if ((c.value("glu") as number) < 70) {
            c.act("glucose");
            upTo(c, c.run.state.tick + 900);
            c.act("check");
          }
          c.act("meal");
          c.act("plan", { choice: "same" });
          toEnd(c);
        },
      },
      {
        id: "glucagonFirst",
        title: "Glucagon although she can swallow, no recheck, insulin tonight",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("check");
          c.act("glucagon");
          c.act("history");
          upTo(c, 1800);
          c.act("plan", { choice: "insulin" });
          toEnd(c);
        },
      },
      {
        id: "planWhileLow",
        title: "Failure: a plan written while she is still low; she leaves",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("history");
          c.act("plan", { choice: "stop" });
          toEnd(c);
        },
      },
      {
        id: "noTreatment",
        title: "Failure: history and a note while she waits; no glucose",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("history");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
    ],
  };
}

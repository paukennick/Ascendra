// REQ-240 (bedside wave 2): golden paths for LPNVN/ltc-insulin-hypoglycemia.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps lpn-hypo
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "LPNVN", slug: "ltc-insulin-hypoglycemia" };

const GOOD = { sit: "low", bg: "full", asmt: "insulin", rec: "review" };
const VAGUE = { sit: "confused", bg: "min", asmt: "fine", rec: "usual" };
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
const treatedAt = (c: Ctl): number => c.run.state.tick; // the tick of the treatment just given (dt is 1 s)

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: look and swallow check, glucose 58, 15 g of juice, SBAR asking for the lunch dose review, dose held, recheck at 15 minutes, snack, objective note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          c.act("look");
          c.act("glucose");
          c.act("carb", { food: "juice" });
          const t0 = treatedAt(c);
          c.act("report", GOOD);
          c.act("holdLunch");
          teach(c);
          until(c, (x) => {
            teach(x);
            return x.run.state.tick >= t0 + 900 || x.run.state.ended !== null;
          });
          c.act("glucose");
          c.act("snack");
          c.act("note", { kind: "obj" });
          until(c, (x) => {
            teach(x);
            return x.run.state.ended !== null;
          });
        },
      },
      {
        id: "noRecheck",
        title: "Quick, correct treatment, but the snack goes in at once, the glucose is never rechecked and the report sounds routine; 12:40 comes with the insulin unreviewed",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("look");
          c.act("glucose");
          c.act("carb", { food: "juice" });
          c.act("report", VAGUE);
          c.act("holdLunch");
          c.act("snack");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "chocolateFirst",
        title: "Chocolate from the station before any glucose check; still low at the recheck, then juice, a snack and a clear report",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("carb", { food: "choc" });
          const t0 = treatedAt(c);
          c.act("look");
          upTo(c, t0 + 900);
          c.act("glucose");
          if ((c.value("gLast") as number) < 70) {
            c.act("carb", { food: "juice" });
            const t1 = treatedAt(c);
            c.act("report", GOOD);
            upTo(c, t1 + 900);
            c.act("glucose");
          } else c.act("report", GOOD);
          c.act("snack");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "lunchGiven",
        title: "Failure: treated and rechecked well, never reported, and the 11:45 lispro given with a lunch she barely eats",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 20);
          c.act("look");
          c.act("glucose");
          c.act("carb", { food: "juice" });
          const t0 = treatedAt(c);
          upTo(c, t0 + 900);
          c.act("glucose");
          upTo(c, 2105);
          c.act("giveLunch");
          toEnd(c);
        },
      },
      {
        id: "lateGlucagon",
        title: "Arrives after she can no longer swallow: glucagon IM on her side, juice and a snack once she wakes, then a clear report",
        reasoning: "partial",
        drive: (c) => {
          until(c, (x) => x.value("canSwallow") === false || x.run.state.ended !== null);
          c.act("look");
          c.act("glucose");
          c.act("glucagon");
          until(c, (x) => (x.value("g") as number) >= 70 || x.run.state.ended !== null);
          c.act("glucose");
          c.act("carb", { food: "juice" });
          const t0 = treatedAt(c);
          c.act("report", GOOD);
          c.act("holdLunch");
          upTo(c, t0 + 900);
          c.act("glucose");
          c.act("snack");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "aspirated",
        title: "Failure: a vague report, no glucose, then juice poured into her mouth after she stops swallowing",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("report", VAGUE);
          until(c, (x) => x.value("canSwallow") === false || x.run.state.ended !== null);
          c.act("carb", { food: "juice" });
          toEnd(c);
        },
      },
    ],
  };
}

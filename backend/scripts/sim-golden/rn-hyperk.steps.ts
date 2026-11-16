// REQ-296 (clinical coverage, wave 2): golden paths for NCLEXRN/hyperkalemia-critical-value.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps rn-hyperk
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "hyperkalemia-critical-value" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
const orders = (c: Ctl): void => until(c, (x) => x.value("ordersIn") === true || x.value("provPending") === false || ended(x));
const insulinAt = (c: Ctl): number => Number(c.value("insulinAt"));

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: KCl stopped, monitor, 12-lead, glucose, a full SBAR; calcium, insulin with dextrose, dextrose 10%, albuterol; meds held; glucose at 30 and 60 min; K recheck",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "assess");
          act(c, "stopKcl");
          act(c, "monitor");
          act(c, "ecg");
          act(c, "glucose");
          act(c, "callProv", { say: "full" });
          act(c, "holdMeds");
          orders(c);
          act(c, "calcium");
          act(c, "insulin");
          act(c, "d10");
          act(c, "albuterol");
          act(c, "note");
          const ins = insulinAt(c);
          upTo(c, ins + 1800);
          act(c, "glucose");
          upTo(c, ins + 2760);
          act(c, "recheckK");
          upTo(c, ins + 3600);
          act(c, "glucose");
          toEnd(c);
        },
      },
      {
        id: "slow",
        title: "Redraws first and calls with the number only; monitor later; insulin before calcium; KCl stopped at 12 min",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          act(c, "assess");
          act(c, "redraw");
          act(c, "callProv", { say: "kOnly" });
          orders(c);
          upTo(c, 720);
          act(c, "stopKcl");
          act(c, "monitor");
          act(c, "glucose");
          act(c, "callProv", { say: "full" });
          orders(c);
          act(c, "insulin");
          act(c, "d10");
          act(c, "calcium");
          act(c, "albuterol");
          act(c, "holdMeds");
          const ins = insulinAt(c);
          upTo(c, ins + 1800);
          act(c, "glucose");
          upTo(c, ins + 3000);
          act(c, "glucose");
          until(c, (x) => x.value("labPending") === false || ended(x));
          act(c, "recheckK");
          toEnd(c);
        },
      },
      {
        id: "noCalcium",
        title: "Fast and careful with glucose but no calcium and no albuterol; meds left alone; no note",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "stopKcl");
          act(c, "monitor");
          act(c, "glucose");
          act(c, "callProv", { say: "full" });
          orders(c);
          act(c, "insulin");
          act(c, "d10");
          const ins = insulinAt(c);
          upTo(c, ins + 1800);
          act(c, "glucose");
          upTo(c, ins + 2760);
          act(c, "recheckK");
          upTo(c, ins + 3600);
          act(c, "glucose");
          toEnd(c);
        },
      },
      {
        id: "lowCaught",
        title: "No dextrose infusion, but glucose checked: a low at 62 min caught and treated with dextrose 50%",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "stopKcl");
          act(c, "monitor");
          act(c, "glucose");
          act(c, "callProv", { say: "full" });
          orders(c);
          act(c, "calcium");
          act(c, "insulin");
          act(c, "albuterol");
          act(c, "holdMeds");
          const ins = insulinAt(c);
          upTo(c, ins + 1800);
          act(c, "glucose");
          upTo(c, ins + 2760);
          act(c, "recheckK");
          upTo(c, ins + 3700);
          act(c, "glucose");
          act(c, "rescue");
          act(c, "note");
          toEnd(c);
        },
      },
      {
        id: "noD10",
        title: "Failure: quick calcium and insulin, but no glucose infusion and no glucose checks",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "stopKcl");
          act(c, "monitor");
          act(c, "callProv", { say: "full" });
          orders(c);
          act(c, "calcium");
          act(c, "insulin");
          act(c, "albuterol");
          act(c, "holdMeds");
          toEnd(c);
        },
      },
      {
        id: "arrest",
        title: "Failure: calls with the number only, gives the 09:00 meds, leaves the KCl running",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          act(c, "assess");
          act(c, "callProv", { say: "kOnly" });
          act(c, "giveMeds");
          toEnd(c);
        },
      },
    ],
  };
}

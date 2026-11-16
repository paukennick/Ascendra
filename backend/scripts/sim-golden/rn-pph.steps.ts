// REQ-296 (clinical coverage): golden paths for NCLEXRN/postpartum-hemorrhage-atony.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps rn-pph
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "postpartum-hemorrhage-atony" };

const TEAM = { who: "team", say: "numbers" };
const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  teach(c);
}
function weigh(c: Ctl): void {
  act(c, "weigh");
  until(c, (x) => x.value("qblPending") === false || ended(x));
}
function cath(c: Ctl): void {
  act(c, "bladder");
  until(c, (x) => x.value("cathPending") === false || ended(x));
}
const teamHere = (c: Ctl): void => until(c, (x) => x.value("teamHere") === true || ended(x));

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: fundus, massage, oxytocin up, catheter, weighed loss, second IV, hemorrhage team with numbers, carboprost and tranexamic acid",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "fundus");
          act(c, "massage");
          act(c, "oxytocin");
          cath(c);
          act(c, "massage");
          weigh(c);
          act(c, "iv");
          act(c, "escalate", TEAM);
          teamHere(c);
          act(c, "carboprost");
          act(c, "txa");
          act(c, "massage");
          toEnd(c);
        },
      },
      {
        id: "pagedSlow",
        title: "Same care, but pages the provider instead of the team; the bladder emptied late",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          act(c, "fundus");
          act(c, "massage");
          act(c, "oxytocin");
          weigh(c);
          act(c, "escalate", { who: "page", say: "numbers" });
          act(c, "iv");
          upTo(c, 600);
          cath(c);
          teamHere(c);
          act(c, "carboprost");
          act(c, "txa");
          act(c, "massage");
          toEnd(c);
        },
      },
      {
        id: "methergine",
        title: "Massage, catheter and oxytocin, a weighed loss, but methylergonovine from the kit before the team comes",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "fundus");
          act(c, "massage");
          act(c, "oxytocin");
          cath(c);
          weigh(c);
          act(c, "methergine");
          act(c, "escalate", TEAM);
          teamHere(c);
          act(c, "txa");
          toEnd(c);
        },
      },
      {
        id: "eyeballed",
        title: "Massage and an estimate by eye; a vague call; the bladder never emptied until the charge nurse sends the team",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          act(c, "massage");
          act(c, "eyeball");
          act(c, "escalate", { who: "page", say: "vague" });
          upTo(c, 900);
          act(c, "massage");
          act(c, "escalate", { who: "charge", say: "numbers" });
          weigh(c);
          act(c, "escalate", TEAM);
          act(c, "oxytocin");
          cath(c);
          teamHere(c);
          act(c, "carboprost");
          act(c, "txa");
          act(c, "massage");
          toEnd(c);
        },
      },
      {
        id: "massageOnly",
        title: "Failure: repeated massage alone and a vague call; she goes into shock",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          act(c, "massage");
          act(c, "escalate", { who: "page", say: "vague" });
          for (let m = 10; m <= 80; m += 10) {
            upTo(c, m * 60);
            act(c, "massage");
          }
          toEnd(c);
        },
      },
      {
        id: "watching",
        title: "Failure: assesses the fundus and estimates by eye, then waits",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          act(c, "fundus");
          act(c, "eyeball");
          toEnd(c);
        },
      },
    ],
  };
}

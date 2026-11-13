// REQ-233 (bedside wave 1): golden paths for CCRNNEO/neonatal-sepsis-hypoglycemia.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps neo-eos
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "neonatal-sepsis-hypoglycemia" };

const GOOD = { sit: "sepsis", bg: "full", rec: "orders" };
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
const has = (c: Ctl, k: string): boolean => c.value(k) !== null && c.value(k) !== false;

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: warmer, glucose and an SBAR at once, gel while the IV goes in, D10 bolus and infusion, 1 mL culture, ampicillin and gentamicin, recheck at 30 minutes",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          c.act("warm");
          c.act("glucoseCheck");
          c.act("look");
          c.act("call", GOOD);
          c.act("ivStart");
          teach(c);
          until(c, (x) => has(x, "lowSeenAt"));
          teach(c);
          c.act("gel");
          c.skip("callbackT");
          until(c, (x) => has(x, "iv"));
          c.act("dexBolus");
          c.act("dexDrip");
          c.act("cultures");
          teach(c);
          c.skip("culturesT");
          c.act("abx", { drug: "ampgent" });
          upTo(c, c.run.state.tick + 1800);
          c.act("glucoseCheck");
          toEnd(c);
        },
      },
      {
        id: "slowSafe",
        title: "Slow: a feed first, the call at 15 minutes, dextrose 25 minutes after the low result, antibiotics at 75 minutes, warmed at 20 minutes",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          c.act("glucoseCheck");
          c.act("feed");
          upTo(c, 900);
          c.act("gel");
          c.act("call", GOOD);
          c.act("ivStart");
          upTo(c, 1200);
          c.act("warm");
          until(c, (x) => has(x, "iv"));
          upTo(c, 1560);
          c.act("dexBolus");
          c.act("dexDrip");
          c.act("cultures");
          upTo(c, 4500);
          c.act("abx", { drug: "ampgent" });
          c.act("glucoseCheck");
          toEnd(c);
        },
      },
      {
        id: "wrongDrug",
        title: "Glucose and warmth well handled, but ceftriaxone alone given before any culture",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("warm");
          c.act("glucoseCheck");
          c.act("call", GOOD);
          c.act("ivStart");
          until(c, (x) => has(x, "lowSeenAt"));
          c.act("gel");
          until(c, (x) => has(x, "iv"));
          c.act("dexBolus");
          c.act("dexDrip");
          c.act("abx", { drug: "ceftri" });
          c.act("cultures");
          upTo(c, c.run.state.tick + 1800);
          c.act("glucoseCheck");
          toEnd(c);
        },
      },
      {
        id: "feedOnly",
        title: "Failure: feeds offered for poor feeding, the glucose never checked",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("feed");
          c.act("call", { sit: "feeding", bg: "min", rec: "feed" });
          upTo(c, 900);
          c.act("feed");
          toEnd(c);
        },
      },
      {
        id: "neverWarmed",
        title: "Glucose and antibiotics on time, but never warmed: still cold at three hours",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("glucoseCheck");
          c.act("call", GOOD);
          c.act("ivStart");
          until(c, (x) => has(x, "lowSeenAt"));
          c.act("gel");
          until(c, (x) => has(x, "iv"));
          c.act("dexBolus");
          c.act("dexDrip");
          c.act("cultures");
          c.skip("culturesT");
          c.act("abx", { drug: "ampgent" });
          upTo(c, c.run.state.tick + 1800);
          c.act("glucoseCheck");
          toEnd(c);
        },
      },
      {
        id: "noAntibiotics",
        title: "Failure: glucose and warmth handled, but no culture and no antibiotics",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("warm");
          c.act("glucoseCheck");
          c.act("call", GOOD);
          c.act("ivStart");
          until(c, (x) => has(x, "lowSeenAt"));
          c.act("gel");
          until(c, (x) => has(x, "iv"));
          c.act("dexBolus");
          c.act("dexDrip");
          upTo(c, 3000);
          c.act("look");
          c.act("bolus");
          toEnd(c);
        },
      },
    ],
  };
}

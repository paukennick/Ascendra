// REQ-292: golden paths for the Python data case on the terminal screen
// with a Python prompt (PYDATA/board-orders-by-region.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec, Ctl } from "./steps.ts";
import { run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "PYDATA", slug: "board-orders-by-region" };

function finish(c: Ctl): void {
  if (c.run.state.phase === "incident") c.act("finish");
  c.answer();
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "shape and the draft's sum disagree; isna on region and discount; size() with dropna=False; assert the total; send",
        reasoning: "met",
        drive: (c) => {
          run(c, "shape");
          run(c, "draftSum");
          run(c, "naRegion");
          run(c, "naDiscount");
          run(c, "sizeAll");
          run(c, "check");
          run(c, "send");
          finish(c);
          c.act("document", { meaning: "orders", gap: "web" });
        },
      },
      {
        id: "sendDraft",
        title: "Sends the colleague's draft as it is",
        reasoning: "missed",
        drive: (c) => {
          run(c, "send");
          finish(c);
          c.act("document", { meaning: "orders", gap: "nothing" });
        },
      },
      {
        id: "sizeDropsWeb",
        title: "Spots count() versus size() but keeps groupby's default, losing the web orders; the check fails and it is sent anyway",
        reasoning: "partial",
        drive: (c) => {
          run(c, "draftSum");
          run(c, "naDiscount");
          run(c, "sizeDrop");
          run(c, "check");
          run(c, "send");
          finish(c);
          c.act("document", { meaning: "regional", gap: "nothing" });
        },
      },
      {
        id: "dropna",
        title: "Tidies the data with dropna() and sends the smaller table",
        reasoning: "missed",
        drive: (c) => {
          run(c, "shape");
          run(c, "dropna");
          run(c, "sizeAll");
          run(c, "send");
          finish(c);
          c.act("document", { meaning: "orders", gap: "dropped" });
        },
      },
      {
        id: "lateUnchecked",
        title: "Builds the right table, waits, and sends it after the pack closed without checking the total",
        reasoning: "partial",
        drive: (c) => {
          run(c, "draftSum");
          run(c, "sizeAll");
          waitUntil(c, 46);
          run(c, "send");
          finish(c);
          c.act("document", { meaning: "orders", gap: "web" });
        },
      },
      {
        id: "holdBack",
        title: "Finds the totals disagree and sends nothing",
        reasoning: "partial",
        drive: (c) => {
          run(c, "draftSum");
          run(c, "naRegion");
          finish(c);
          c.act("document", { meaning: "discounted", gap: "web" });
        },
      },
    ],
  };
}

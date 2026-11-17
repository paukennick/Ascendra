// REQ-315: golden paths for CNA/sundowning-at-the-exit-door. No prototype
// exists, so the expectations are the engine's own results, re-checked by
// every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps cna-sundown
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CNA", slug: "sundowning-at-the-exit-door" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: calm approach, validate, redirect to towels in the quiet lounge, bathroom and pain check, pulse, report observations",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "approach");
          act(c, "validate");
          act(c, "redirect");
          act(c, "environment");
          upTo(c, 360);
          act(c, "needs");
          act(c, "pulse");
          act(c, "report");
          toEnd(c);
        },
      },
      {
        id: "argueFirst",
        title: "Corrects her first, then approaches, validates and redirects; needs checked late; reports a label",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "reorient");
          act(c, "approach");
          act(c, "validate");
          act(c, "redirect");
          upTo(c, 1080);
          act(c, "needs");
          act(c, "report");
          toEnd(c);
        },
      },
      {
        id: "sedative",
        title: "Calm and validating, needs checked, but asks the nurse for a sedative before dinner and never redirects",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "approach");
          act(c, "validate");
          act(c, "needs");
          act(c, "askSedative");
          upTo(c, 600);
          act(c, "validate");
          toEnd(c);
        },
      },
      {
        id: "trayTable",
        title: "Locks her in a recliner with the tray table, then validates and redirects; no needs check, no report",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 10);
          act(c, "chair");
          upTo(c, 120);
          act(c, "approach");
          act(c, "validate");
          act(c, "redirect");
          toEnd(c);
        },
      },
      {
        id: "heldBack",
        title: "Failure: tells her the facts, then holds her wrists at the door; she pulls free and falls",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 10);
          act(c, "reorient");
          act(c, "hold");
          toEnd(c);
        },
      },
    ],
  };
}

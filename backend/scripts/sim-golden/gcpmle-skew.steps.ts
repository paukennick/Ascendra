// REQ-335: golden paths for GCPMLE/eta-model-skew-miles-not-km on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPMLE", slug: "eta-model-skew-miles-not-km" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Distance by version, release, error, attribution; convert; contract; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "dist");
          run(c, "release");
          run(c, "perf");
          run(c, "attrib");
          run(c, "convert");
          run(c, "contract");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "units" });
        },
      },
      {
        id: "harm",
        title: "Retrains on the last week",
        reasoning: "missed",
        drive: (c) => {
          run(c, "dist");
          run(c, "retrain");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "units" });
        },
      },
      {
        id: "noop",
        title: "Raises the alert threshold",
        reasoning: "partial",
        drive: (c) => {
          run(c, "dist");
          run(c, "threshold");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "units" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads distance and release, converts, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "dist");
          run(c, "release");
          run(c, "convert");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "units" });
        },
      },
      {
        id: "late",
        title: "Waits, converts after 17:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "dist");
          waitUntil(c, 50);
          run(c, "convert");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "units" });
        },
      },
      {
        id: "blind",
        title: "Converts without looking and blames concept drift",
        reasoning: "missed",
        drive: (c) => {
          run(c, "convert");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "concept" });
        },
      },
    ],
  };
}

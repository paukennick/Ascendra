// REQ-335: golden paths for AWSDEA/athena-todays-partition-missing on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDEA", slug: "athena-todays-partition-missing" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Partitions, files, function log, count; add partition; restore permission; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "showparts");
          run(c, "files");
          run(c, "lamlog");
          run(c, "count");
          run(c, "addPart");
          run(c, "perm");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "catalog" });
        },
      },
      {
        id: "harm",
        title: "Re-runs today's loads",
        reasoning: "missed",
        drive: (c) => {
          run(c, "showparts");
          run(c, "rerun");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "catalog" });
        },
      },
      {
        id: "noop",
        title: "Runs MSCK REPAIR TABLE",
        reasoning: "partial",
        drive: (c) => {
          run(c, "showparts");
          run(c, "msck");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "catalog" });
        },
      },
      {
        id: "fixOnly",
        title: "Compares partitions and files, adds the partition, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "showparts");
          run(c, "files");
          run(c, "addPart");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "catalog" });
        },
      },
      {
        id: "late",
        title: "Waits, adds the partition after 10:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "showparts");
          waitUntil(c, 40);
          run(c, "addPart");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "catalog" });
        },
      },
      {
        id: "blind",
        title: "Adds the partition without looking and blames missing data",
        reasoning: "missed",
        drive: (c) => {
          run(c, "addPart");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
    ],
  };
}

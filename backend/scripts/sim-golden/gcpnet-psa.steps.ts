// REQ-335: golden paths for GCPNET/psa-range-full-before-launch on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "psa-range-full-before-launch" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Error, ranges, on-premises routes, IPAM; add psa-2; record and advertise; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "err");
          run(c, "ranges");
          run(c, "onprem");
          run(c, "ipam");
          run(c, "alloc");
          run(c, "record");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "full" });
        },
      },
      {
        id: "harm",
        title: "Allocates an overlapping /16",
        reasoning: "missed",
        drive: (c) => {
          run(c, "err");
          run(c, "overlap");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "full" });
        },
      },
      {
        id: "noop",
        title: "Retries the pipeline",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          run(c, "retry");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "full" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads error and ranges, adds psa-2, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          run(c, "ranges");
          run(c, "alloc");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "full" });
        },
      },
      {
        id: "late",
        title: "Waits, adds after 15:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          waitUntil(c, 110);
          run(c, "alloc");
          run(c, "verify");
          waitUntil(c, 118);
          close(c);
          c.act("document", { cause: "full" });
        },
      },
      {
        id: "blind",
        title: "Adds a range without looking and blames quota",
        reasoning: "missed",
        drive: (c) => {
          run(c, "alloc");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
    ],
  };
}

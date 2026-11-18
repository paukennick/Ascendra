// REQ-333: golden paths for the MSCS byte order case on the data console
// (MSCS/mscs-freezer-bytes-little-endian.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "MSCS", slug: "mscs-freezer-bytes-little-endian" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Raw bytes, frame notes, '<h', re-run, handheld check (F3 really warm), send",
        reasoning: "met",
        drive: (c) => {
          run(c, "xxd");
          run(c, "notes");
          run(c, "decoder", { f: "leS" });
          run(c, "rerun");
          run(c, "handheld");
          run(c, "send");
          record(c, { cause: "order", check: "handheld" });
        },
      },
      {
        id: "filterFaults",
        title: "Calls the sensors faulty, drops readings above 100 °C and sends: F3 is hidden",
        reasoning: "missed",
        drive: (c) => {
          run(c, "filter");
          run(c, "rerun");
          run(c, "send");
          record(c, { cause: "sensor", check: "none" });
        },
      },
      {
        id: "swapOnly",
        title: "Looks at the bytes, swaps the byte order but keeps unsigned, sees 636 °C and holds the answer",
        reasoning: "partial",
        drive: (c) => {
          run(c, "xxd");
          run(c, "decoder", { f: "leU" });
          run(c, "rerun");
          run(c, "handheld");
          record(c, { cause: "order", check: "none" });
        },
      },
      {
        id: "overwrite",
        title: "Rewrites the stored readings by a guess, then finds the right format and sends",
        reasoning: "missed",
        drive: (c) => {
          run(c, "overwrite");
          run(c, "notes");
          run(c, "decoder", { f: "leS" });
          run(c, "handheld");
          run(c, "send");
          record(c, { cause: "order", check: "handheld" });
        },
      },
      {
        id: "unchecked",
        title: "Reads the notes, '<h', sends without the handheld check",
        reasoning: "partial",
        drive: (c) => {
          run(c, "notes");
          run(c, "xxd");
          run(c, "decoder", { f: "leS" });
          run(c, "send");
          record(c, { cause: "order", check: "plausible" });
        },
      },
      {
        id: "lateChecked",
        title: "Tries signed big-endian first, then '<h', checks, waits, and sends after 10:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "decoder", { f: "beS" });
          run(c, "xxd");
          run(c, "notes");
          run(c, "decoder", { f: "leS" });
          run(c, "handheld");
          for (let i = 0; i < 4; i++) run(c, "wait");
          run(c, "send");
          record(c, { cause: "order", check: "handheld" });
        },
      },
    ],
  };
}

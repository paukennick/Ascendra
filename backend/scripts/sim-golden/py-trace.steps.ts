// REQ-312: golden paths for the PYTHON traceback case on the data and code
// console (PYTHON/py-import-crash-traceback.sim.json). The PCAP and PCEP
// bands reuse these paths.
import type { StepPath, StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PYTHON", slug: "py-import-crash-traceback" };

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Read the traceback; pdb at the frame and a count of separators; strip the separator with a test; the dry run matches; post",
      reasoning: "met",
      drive: (c) => {
        run(c, "trace");
        run(c, "pdb");
        run(c, "count");
        run(c, "fixSep");
        run(c, "test");
        run(c, "dry");
        run(c, "post");
        record(c, { cause: "sep", check: "control" });
      },
    },
    {
      id: "bareExcept",
      title: "Follows the channel: a bare except, rerun, post",
      reasoning: "missed",
      drive: (c) => {
        run(c, "fixBare");
        run(c, "test");
        run(c, "post");
        record(c, { cause: "file", check: "noerror" });
      },
    },
    {
      id: "zeroIgnored",
      title: "Reads the traceback, uses 0 for bad amounts, sees the dry run short, and posts anyway",
      reasoning: "partial",
      drive: (c) => {
        run(c, "trace");
        run(c, "fixZero");
        run(c, "dry");
        run(c, "post");
        record(c, { cause: "sep", check: "noerror" });
      },
    },
    {
      id: "rejects",
      title: "Reads the traceback, sends bad rows to a rejects file, reconciles the shortfall, and posts the rest",
      reasoning: "partial",
      drive: (c) => {
        run(c, "trace");
        run(c, "pdb");
        run(c, "fixRejects");
        run(c, "dry");
        run(c, "post");
        record(c, { cause: "sep", check: "control" });
      },
    },
    {
      id: "lateRight",
      title: "Fixes the separator first, then reads the traceback and reconciles, and posts after 08:00",
      reasoning: "met",
      drive: (c) => {
        run(c, "fixSep");
        run(c, "trace");
        run(c, "dry");
        for (let i = 0; i < 6; i++) run(c, "wait");
        run(c, "post");
        record(c, { cause: "sep", check: "control" });
      },
    },
    {
      id: "holdBack",
      title: "Reads the traceback and the row, and stops without posting",
      reasoning: "partial",
      drive: (c) => {
        run(c, "trace");
        run(c, "pdb");
        record(c, { cause: "sep", check: "none" });
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

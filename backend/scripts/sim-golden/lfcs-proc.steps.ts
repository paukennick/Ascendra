// REQ-292: golden paths for the LFCS report-workers case on the terminal
// screen (LFCS/report-workers-starve-api.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LFCS", slug: "report-workers-starve-api" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "uptime, top and pgrep find the report's eight workers at nice 0; renice all nine to 19; curl proves the API",
        reasoning: "met",
        drive: (c) => {
          run(c, "uptime");
          run(c, "top");
          run(c, "pgrep");
          run(c, "reniceAll");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "workers", fix: "renice" });
        },
      },
      {
        id: "parentOnly",
        title: "Reads top, renices only the parent, restarts the API and closes while it is still slow",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          run(c, "reniceParent");
          run(c, "restartApi");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "workers", fix: "renice" });
        },
      },
      {
        id: "killReport",
        title: "Finds the report with pgrep and stops it with TERM; the API is fast, finance loses the run",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pgrep");
          run(c, "killTerm");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "workers", fix: "killed" });
        },
      },
      {
        id: "killDb",
        title: "Sees postgres busy in top and kills it with SIGKILL",
        reasoning: "missed",
        drive: (c) => {
          run(c, "top");
          run(c, "killDb");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "db", fix: "killed" });
        },
      },
      {
        id: "lateRenice",
        title: "Restarts the API, waits past the breach, then finds and renices the workers",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restartApi");
          waitUntil(c, 31);
          run(c, "top");
          run(c, "reniceAll");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "workers", fix: "renice" });
        },
      },
      {
        id: "givesUp",
        title: "Restarts the API once and closes blaming the service",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restartApi");
          close(c);
          c.act("document", { cause: "api", fix: "restarted" });
        },
      },
    ],
  };
}

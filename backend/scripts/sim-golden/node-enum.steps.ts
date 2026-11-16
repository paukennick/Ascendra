// REQ-269: golden paths for the TypeScript & Node.js type-stripping outage
// on the terminal screen (TSNODE/node-type-stripping-enum-crash.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "TSNODE", slug: "node-type-stripping-enum-crash" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Journal names ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX, the file has an enum; roll back, health check 200; erasableSyntaxOnly makes tsc report it; ship 2.4.1 with an as const object",
        reasoning: "met",
        drive: (c) => {
          run(c, "journal");
          run(c, "catFile");
          run(c, "rollback");
          run(c, "curl");
          run(c, "guard");
          run(c, "tsc");
          run(c, "releaseConst");
          close(c);
          c.act("document", { cause: "enum", prevent: "erasable" });
        },
      },
      {
        id: "fixForwardNoGuard",
        title: "Restarts blind, reads the journal and git log, ships 2.4.1 directly; no tsconfig guard",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          run(c, "journal");
          run(c, "gitLog");
          run(c, "catFile");
          run(c, "releaseConst");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "enum", prevent: "tscOnly" });
        },
      },
      {
        id: "tsxSwap",
        title: "Reads the journal, runs tsc (no errors) and swaps production to npx tsx to get it up",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "journal");
          run(c, "tsc");
          run(c, "runTsx");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "typeError", prevent: "tscOnly" });
        },
      },
      {
        id: "restartsOnly",
        title: "Restarts three times and closes with the API still exiting at startup",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          run(c, "restart");
          run(c, "restart");
          close(c);
          c.act("document", { cause: "nodeVersion", prevent: "nothing" });
        },
      },
      {
        id: "partnerMissed",
        title: "Investigates thoroughly but waits: the 14:35 partner pull fails before the rollback",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "journal");
          run(c, "gitLog");
          run(c, "catFile");
          run(c, "tsc");
          waitUntil(c, 26);
          run(c, "rollback");
          run(c, "guard");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "enum", prevent: "erasable" });
        },
      },
    ],
  };
}

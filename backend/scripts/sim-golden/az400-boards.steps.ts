// REQ-335: golden paths for AZ400/release-gate-unlinked-prs-new-repo on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ400", slug: "release-gate-unlinked-prs-new-repo" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Connection, PR, work item, orgs; connect; checklist and audit; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "conn");
          run(c, "pr");
          run(c, "wi");
          run(c, "orgs");
          run(c, "connect");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "conn" });
        },
      },
      {
        id: "harm",
        title: "Turns off the traceability gate",
        reasoning: "missed",
        drive: (c) => {
          run(c, "conn");
          run(c, "skipgate");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "conn" });
        },
      },
      {
        id: "noop",
        title: "Puts AB# in PR titles",
        reasoning: "partial",
        drive: (c) => {
          run(c, "conn");
          run(c, "title");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "conn" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads connection and PR, connects, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "conn");
          run(c, "pr");
          run(c, "connect");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "conn" });
        },
      },
      {
        id: "late",
        title: "Waits, connects after 17:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "conn");
          waitUntil(c, 100);
          run(c, "connect");
          run(c, "verify");
          waitUntil(c, 108);
          close(c);
          c.act("document", { cause: "conn" });
        },
      },
      {
        id: "blind",
        title: "Connects without looking and blames the syntax",
        reasoning: "missed",
        drive: (c) => {
          run(c, "connect");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "syntax" });
        },
      },
    ],
  };
}

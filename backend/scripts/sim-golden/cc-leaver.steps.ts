// REQ-274: golden paths for the ISC2 CC leaver-account incident on the
// security console (ISC2CC/cc-leaver-account-still-active.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "ISC2CC", slug: "cc-leaver-account-still-active" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const report = (c: Parameters<StepPath["drive"]>[0], who: string, cause: string, follow: string) => {
  c.act("notify", { who });
  c.act("document", { cause, follow });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "HR check and session review, then disable and revoke together by 12 min, key search, logs, handler, leaver process fixed, then the mover's rights",
      reasoning: "met",
      drive: (c) => {
        task(c, "checkHr");
        task(c, "reviewSignins");
        task(c, "disable");
        task(c, "revoke");
        task(c, "searchKeys");
        task(c, "preserve");
        task(c, "escalate");
        task(c, "fixProcess");
        task(c, "fixMover");
        close(c);
        report(c, "handler", "leaver", "process");
      },
    },
    {
      id: "blockOnly",
      title: "Blocks the address and watches: the account reconnects from another address and the files leave at 50 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "blockIp");
        watchUntil(c, 70);
        close(c);
        report(c, "nobody", "phish", "nothing");
      },
    },
    {
      id: "deleteFirst",
      title: "Confirms with HR, then deletes the account and folder before exporting anything",
      reasoning: "partial",
      drive: (c) => {
        task(c, "checkHr");
        task(c, "delete");
        task(c, "searchKeys");
        task(c, "escalate");
        task(c, "fixProcess");
        close(c);
        report(c, "handler", "leaver", "purge");
      },
    },
    {
      id: "sharedFirst",
      title: "Spends 20 minutes on the shared account first; cuts the account at 32 min after a key was made, never searches for it",
      reasoning: "partial",
      drive: (c) => {
        task(c, "checkHr");
        task(c, "fixShared");
        task(c, "reviewSignins");
        task(c, "disable");
        task(c, "revoke");
        task(c, "preserve");
        task(c, "escalate");
        task(c, "fixProcess");
        task(c, "fixMover");
        close(c);
        report(c, "handler", "leaver", "process");
      },
    },
    {
      id: "lateButClean",
      title: "Shared account first, then disables, revokes and finds the key: everything closed at 36 min, after an upload",
      reasoning: "partial",
      drive: (c) => {
        task(c, "checkHr");
        task(c, "fixShared");
        task(c, "reviewSignins");
        task(c, "disable");
        task(c, "revoke");
        task(c, "searchKeys");
        task(c, "preserve");
        task(c, "escalate");
        task(c, "fixProcess");
        close(c);
        report(c, "handler", "leaver", "process");
      },
    },
    {
      id: "disableOnly",
      title: "Disables the account without checking HR or revoking sessions, exports the logs and closes",
      reasoning: "missed",
      drive: (c) => {
        task(c, "disable");
        task(c, "preserve");
        close(c);
        report(c, "everyone", "leaver", "nothing");
      },
    },
  ];
}

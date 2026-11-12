// REQ-238: golden paths for the PenTest+ prior-compromise engagement on the
// security console (PENTESTPLUS/pentest-third-party-webshell.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "PENTESTPLUS", slug: "pentest-third-party-webshell" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Team log, pause the portal, phone the emergency contact by 9 min, tell the engagement lead, one header request, hashed logs, then the office range; note to the named contacts",
      reasoning: "met",
      drive: (c) => {
        task(c, "checkTeamLog");
        task(c, "pauseTesting");
        task(c, "callContact");
        task(c, "escalate");
        task(c, "fetchHeaders");
        task(c, "preserveLogs");
        task(c, "testOther");
        close(c);
        c.act("notify", { who: "contact" });
        c.act("document", { kind: "prior", touch: "handsOff" });
      },
    },
    {
      id: "emailOnly",
      title: "Checks and pauses, then emails the project manager instead of phoning: the export finishes at 45 min before the client acts",
      reasoning: "partial",
      drive: (c) => {
        task(c, "checkTeamLog");
        task(c, "pauseTesting");
        task(c, "emailPm");
        task(c, "preserveLogs");
        task(c, "testOther");
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "contact" });
        c.act("document", { kind: "prior", touch: "handsOff" });
      },
    },
    {
      id: "deleteShell",
      title: "Confirms it is not the team's, deletes the shell to protect the client, then phones and hands over logs",
      reasoning: "partial",
      drive: (c) => {
        task(c, "checkTeamLog");
        task(c, "deleteShell");
        task(c, "callContact");
        task(c, "pauseTesting");
        task(c, "preserveLogs");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "contact" });
        c.act("document", { kind: "prior", touch: "removed" });
      },
    },
    {
      id: "saveForReport",
      title: "Treats it as a finding for the report: carries on testing the range and ends the day without telling anyone",
      reasoning: "missed",
      drive: (c) => {
        task(c, "testOther");
        task(c, "testOther");
        close(c);
        c.act("notify", { who: "nobody" });
        c.act("document", { kind: "finding", touch: "handsOff" });
      },
    },
    {
      id: "lateCall",
      title: "Finishes a block of range tests first, phones at 23 min: two export files are written before the client acts; pauses only when asked",
      reasoning: "partial",
      drive: (c) => {
        task(c, "testOther");
        task(c, "checkTeamLog");
        task(c, "callContact");
        task(c, "escalate");
        task(c, "fetchHeaders");
        watchUntil(c, 34);
        task(c, "pauseTesting");
        task(c, "preserveLogs");
        close(c);
        c.act("notify", { who: "contact" });
        c.act("document", { kind: "prior", touch: "handsOff" });
      },
    },
    {
      id: "useShell",
      title: "Explores the shell's reach, reports the attacker's address to its host, then phones; the note goes to the whole IT list",
      reasoning: "missed",
      drive: (c) => {
        task(c, "fetchHeaders");
        task(c, "useShell");
        task(c, "reportAbuse");
        task(c, "callContact");
        task(c, "pauseTesting");
        close(c);
        c.act("notify", { who: "broad" });
        c.act("document", { kind: "finding", touch: "used" });
      },
    },
  ];
}

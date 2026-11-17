// REQ-316: golden paths for the Security+ digital forensics case on the
// security console (SECPLUS/departing-engineer-usb-evidence.sim.json). Each
// task costs analyst time through the `work` wait. No prototype exists, so the
// expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECPLUS", slug: "departing-engineer-usb-evidence" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "DLP, legal hold, custody form, memory, USB and disk images with hashes, brief legal and HR",
        reasoning: "met",
        drive: (c) => {
          task(c, "dlp");
          task(c, "legalHold");
          task(c, "custody");
          task(c, "memory");
          task(c, "usb");
          task(c, "image");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "volatility" });
        },
      },
      {
        id: "shutdownFirst",
        title: "Holds and opens custody, then shuts the laptop down before imaging",
        reasoning: "partial",
        drive: (c) => {
          task(c, "dlp");
          task(c, "legalHold");
          task(c, "custody");
          task(c, "shutdown");
          task(c, "usb");
          task(c, "image");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "shutdown" });
        },
      },
      {
        id: "browse",
        title: "Holds, then browses and copies files on the laptop to see what was taken",
        reasoning: "partial",
        drive: (c) => {
          task(c, "legalHold");
          task(c, "browse");
          task(c, "usb");
          task(c, "image");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "volatility" });
        },
      },
      {
        id: "noHold",
        title: "Collects well but forgets the hold; the job deletes the mailbox at 11:00",
        reasoning: "partial",
        drive: (c) => {
          task(c, "dlp");
          task(c, "custody");
          task(c, "memory");
          task(c, "usb");
          task(c, "image");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "volatility" });
        },
      },
      {
        id: "interviewFirst",
        title: "Confronts the engineer, then waits past 11:00",
        reasoning: "missed",
        drive: (c) => {
          task(c, "confront");
          watchUntil(c, 61);
          close(c);
          c.act("document", { lesson: "interview" });
        },
      },
      {
        id: "lateCustody",
        title: "Holds and takes memory, opens the custody form afterward, tips off the engineer",
        reasoning: "partial",
        drive: (c) => {
          task(c, "dlp");
          task(c, "legalHold");
          task(c, "memory");
          task(c, "custody");
          task(c, "usb");
          task(c, "confront");
          close(c);
          c.act("document", { lesson: "volatility" });
        },
      },
    ],
  };
}

// REQ-333: golden paths for the MSHI breach notification case on the
// governance board (MSHI/mshi-misdirected-email-breach-notice.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-misdirected-email-breach-notice" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const DAY = 86400;
const { task, watchUntil, close } = helpers("incident", "busy", "work", "watch", "closeCase");
type C = Parameters<StepPath["drive"]>[0];
const record = (c: C, basis: string, laptop: string) => c.act("document", { basis, laptop });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Checks the laptop's device record and documents it; four factors and an attestation; notifies patients, media in-state and HHS; briefs the COO; closes autocomplete",
      reasoning: "met",
      drive: (c) => {
        task(c, "verify");
        task(c, "laptop", { l: "noNotice" });
        task(c, "assess");
        task(c, "attest");
        task(c, "decide", { e: "notify" });
        task(c, "brief");
        task(c, "letters");
        task(c, "media");
        task(c, "hhs");
        task(c, "dlp");
        close(c);
        record(c, "fourFactor", "encrypted");
      },
    },
    {
      id: "annualLog",
      title: "Assesses, then follows the COO: letters only, HHS on the year-end log, no media",
      reasoning: "missed",
      drive: (c) => {
        task(c, "assess");
        task(c, "decide", { e: "annual" });
        task(c, "letters");
        task(c, "verify");
        task(c, "laptop", { l: "noNotice" });
        task(c, "dlp");
        watchUntil(c, 61 * DAY);
        close(c);
        record(c, "perState", "encrypted");
      },
    },
    {
      id: "deleted",
      title: "Gets the attestation and calls it no breach because the file was deleted; closes the laptop without checking",
      reasoning: "missed",
      drive: (c) => {
        task(c, "attest");
        task(c, "decide", { e: "none" });
        task(c, "laptop", { l: "noNotice" });
        watchUntil(c, 61 * DAY);
        close(c);
        record(c, "deleted", "unchecked");
      },
    },
    {
      id: "waitForensics",
      title: "Documents the laptop, holds the email for the forensic review, then notifies on day 76",
      reasoning: "partial",
      drive: (c) => {
        task(c, "verify");
        task(c, "laptop", { l: "noNotice" });
        task(c, "assess");
        task(c, "decide", { e: "wait" });
        watchUntil(c, 76 * DAY);
        task(c, "decide", { e: "notify" });
        task(c, "letters");
        task(c, "media");
        task(c, "hhs");
        close(c);
        record(c, "fourFactor", "encrypted");
      },
    },
    {
      id: "overNotify",
      title: "Assesses and notifies the email breach on time, but sends letters to all 2,100 laptop patients without checking the device",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assess");
        task(c, "attest");
        task(c, "decide", { e: "notify" });
        task(c, "letters");
        task(c, "media");
        task(c, "hhs");
        task(c, "laptop", { l: "notifyAll" });
        task(c, "brief");
        task(c, "dlp");
        close(c);
        record(c, "fourFactor", "notified");
      },
    },
    {
      id: "noFollowThrough",
      title: "Decides notify first, assesses after, notifies on time, documents the laptop, but never briefs the COO or treats the cause",
      reasoning: "partial",
      drive: (c) => {
        task(c, "decide", { e: "notify" });
        task(c, "assess");
        task(c, "letters");
        task(c, "media");
        task(c, "hhs");
        task(c, "verify");
        task(c, "laptop", { l: "noNotice" });
        close(c);
        record(c, "fourFactor", "encrypted");
      },
    },
  ];
}

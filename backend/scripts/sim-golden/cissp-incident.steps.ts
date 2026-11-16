// REQ-274: golden paths for the CISSP incident-management case on the
// security console (CISSP/cissp-web-tier-data-theft.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CISSP", slug: "cissp-web-tier-data-theft" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, cause: string, lessons: string) => {
  c.act("notify", { who });
  c.act("document", { cause, lessons });
};
const firstMoves = (c: C) => {
  task(c, "triageSiem");
  task(c, "activate");
  task(c, "isolateWeb2");
  task(c, "blockEgress");
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Reads the correlation, convenes the team, isolates WEB02 at 8 min and cuts egress, images, briefs counsel, scopes, patches, rebuilds, then restores banking",
      reasoning: "met",
      drive: (c) => {
        firstMoves(c);
        task(c, "image");
        task(c, "counsel");
        task(c, "scope");
        task(c, "patch");
        task(c, "rebuild");
        task(c, "restore");
        task(c, "watch");
        close(c);
        report(c, "decide", "upload", "review");
      },
    },
    {
      id: "rebuildFast",
      title: "Contains fast, then rebuilds WEB02 without capturing memory or disk",
      reasoning: "partial",
      drive: (c) => {
        firstMoves(c);
        task(c, "counsel");
        task(c, "patch");
        task(c, "rebuild");
        task(c, "restore");
        close(c);
        report(c, "decide", "upload", "review");
      },
    },
    {
      id: "restoreUnpatched",
      title: "Contains, images and briefs counsel, but restores banking on the rebuilt server before fixing the upload flaw",
      reasoning: "partial",
      drive: (c) => {
        firstMoves(c);
        task(c, "image");
        task(c, "counsel");
        task(c, "rebuild");
        task(c, "restore");
        watchUntil(c, 120);
        close(c);
        report(c, "decide", "upload", "none");
      },
    },
    {
      id: "imageFirst",
      title: "Reads the correlation and images the live server, then watches: the whole member table leaves at 40 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "triageSiem");
        task(c, "image");
        task(c, "notice");
        watchUntil(c, 60);
        close(c);
        report(c, "nobody", "insider", "blame");
      },
    },
    {
      id: "noScope",
      title: "Images before isolating (the shell reaches WEB03 at 10 min), then contains WEB02 only and never scopes the tier",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triageSiem");
        task(c, "image");
        task(c, "activate");
        task(c, "isolateWeb2");
        task(c, "blockEgress");
        task(c, "counsel");
        task(c, "patch");
        task(c, "rebuild");
        task(c, "restore");
        close(c);
        report(c, "decide", "upload", "review");
      },
    },
    {
      id: "lateHeavy",
      title: "Convenes and briefs counsel before isolating: the shell reaches WEB03 at 10 min; contains both by 25 min, powers off DB01 on the way, then recovers clean",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triageSiem");
        task(c, "activate");
        task(c, "counsel");
        task(c, "isolateWeb2");
        task(c, "dbOff");
        task(c, "scope");
        task(c, "isolateWeb3");
        task(c, "image");
        task(c, "patch");
        task(c, "rebuild");
        task(c, "restore");
        close(c);
        report(c, "decide", "upload", "review");
      },
    },
  ];
}

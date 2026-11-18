// REQ-333: golden paths for the MSHI home blood pressure app review on the
// governance board (MSHI/mshi-home-bp-app-vetting.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-home-bp-app-vetting" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const DAY = 86400;
const { task, watchUntil, close } = helpers("review", "busy", "work", "watch", "closeReview");
type C = Parameters<StepPath["drive"]>[0];
const record = (c: C, basis: string) => c.act("document", { basis });

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Policy and traffic test, device listing, BAA and clean build, listed cuffs, alert workflow, usability and hubs, launch on conditions", reasoning: "met", drive: (c) => { task(c, "policy"); task(c, "vdl"); task(c, "baa"); task(c, "cuffs"); task(c, "alerts"); task(c, "usability"); task(c, "decide", { g: "conditions" }); watchUntil(c, 51 * DAY); close(c); record(c, "judged"); } },
    { id: "readyNoConditions", title: "Judges the app and puts all four safeguards in place, but recommends launch as offered rather than on conditions", reasoning: "partial", drive: (c) => { task(c, "policy"); task(c, "vdl"); task(c, "baa"); task(c, "cuffs"); task(c, "alerts"); task(c, "usability"); task(c, "decide", { g: "asOffered" }); watchUntil(c, 51 * DAY); close(c); record(c, "judged"); } },
    { id: "asOffered", title: "Launches as offered on day 30", reasoning: "missed", drive: (c) => { task(c, "decide", { g: "asOffered" }); watchUntil(c, 51 * DAY); close(c); record(c, "popular"); } },
    { id: "privacyOnly", title: "Judges the app and fixes privacy and cuffs, but launches as offered without the alert workflow", reasoning: "partial", drive: (c) => { task(c, "policy"); task(c, "vdl"); task(c, "baa"); task(c, "cuffs"); task(c, "decide", { g: "asOffered" }); watchUntil(c, 51 * DAY); close(c); record(c, "judged"); } },
    { id: "decline", title: "Reads the policy and declines home monitoring", reasoning: "partial", drive: (c) => { task(c, "policy"); task(c, "vdl"); task(c, "decide", { g: "decline" }); watchUntil(c, 40 * DAY); close(c); record(c, "judged"); } },
    { id: "noAccess", title: "Decides on conditions first, then meets three of them; never tests with patients, so it never launches", reasoning: "partial", drive: (c) => { task(c, "decide", { g: "conditions" }); task(c, "policy"); task(c, "vdl"); task(c, "baa"); task(c, "cuffs"); task(c, "alerts"); watchUntil(c, 40 * DAY); close(c); record(c, "vendor"); } },
    { id: "unjudged", title: "Fixes alerts and access, launches on conditions without reading the policy or checking the cuffs: the launch waits for conditions never met", reasoning: "missed", drive: (c) => { task(c, "alerts"); task(c, "usability"); task(c, "decide", { g: "conditions" }); watchUntil(c, 40 * DAY); close(c); record(c, "vendor"); } },
  ];
}

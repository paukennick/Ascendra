// REQ-190: golden paths for the SAP band of the TicketBurst launch day
// (AWSSAP/ticketburst-launch-day-sap.band.json). No prototype exists for
// the band, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "AWSSAP", slug: "ticketburst-launch-day-sap" };

type Slot = [string, string];

function place(c: Ctl, items: Slot[]): void {
  for (const [id, slot] of items) c.act("place", { place: id, "place.slot": slot });
}

function asg(c: Ctl, azs: string, mn: string, mx: string, size = "m6i.large"): void {
  c.act("configure", { azs, mn, mx, size });
}

const KEEP = { sched: "keep", rightsize: "keep", httpapi: "keep", sp: "keep", ri: "keep", s3life: "keep", cfttl: "keep", natunused: "keep", nat1: "keep", dbsingle: "keep", dynprov: "keep", nowaf: "keep", nobackup: "keep", dmsoff: "keep" };

function runDay(c: Ctl, cuts: string[]): void {
  c.act("start");
  c.answer();
  while (c.run.state.phase === "run") c.skip();
  const fin: Record<string, string> = { ...KEEP };
  for (const k of cuts) fin[k] = "cut";
  c.act("review", fin);
}

const CORE: Slot[] = [["route53", "edge"], ["cloudfront", "edge"], ["waf", "edge"], ["alb", "pub-a"], ["nat", "pub-a"], ["nat", "pub-b"], ["asg", "app-a"]];
const GOOD_CUTS = ["sched", "sp", "ri", "s3life", "cfttl", "dmsoff"];

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "sapExpert",
        title: "Warm standby, Aurora Global Database, guardrails and a locked vault, DMS with CDC",
        seed: 1,
        reasoning: "met",
        drive: (c) => {
          place(c, CORE);
          asg(c, "ab", "4", "16");
          place(c, [["auroraGlobal", "data-a"], ["sqs", "regional"], ["s3", "regional"], ["warmStandby", "region2"], ["orgGuard", "org"], ["vaultLock", "org"], ["dms", "regional"]]);
          c.act("toggleBackup");
          runDay(c, GOOD_CUTS);
        },
      },
      {
        id: "sapDynamoOtherAz",
        title: "Serverless with DynamoDB global tables and a warm standby; the other AZ fails",
        seed: 4,
        reasoning: "met",
        drive: (c) => {
          place(c, [["route53", "edge"], ["cloudfront", "edge"], ["waf", "edge"], ["lambda", "regional"], ["dynamoGlobal", "regional"], ["sqs", "regional"], ["s3", "regional"], ["warmStandby", "region2"], ["orgGuard", "org"], ["vaultLock", "org"], ["dms", "regional"]]);
          c.act("toggleBackup");
          runDay(c, ["httpapi", "sp", "s3life", "cfttl", "dmsoff"]);
        },
      },
      {
        id: "sapPilotLight",
        title: "The expert design with a pilot light instead of a warm standby",
        seed: 1,
        reasoning: "partial",
        drive: (c) => {
          place(c, CORE);
          asg(c, "ab", "4", "16");
          place(c, [["auroraGlobal", "data-a"], ["sqs", "regional"], ["s3", "regional"], ["pilotLight", "region2"], ["orgGuard", "org"], ["vaultLock", "org"], ["dms", "regional"]]);
          c.act("toggleBackup");
          runDay(c, GOOD_CUTS);
        },
      },
      {
        id: "sapNoReplication",
        title: "Expert design, but the order history is reloaded from a dump instead of DMS",
        seed: 1,
        reasoning: "partial",
        drive: (c) => {
          place(c, CORE);
          asg(c, "ab", "4", "16");
          place(c, [["auroraGlobal", "data-a"], ["sqs", "regional"], ["s3", "regional"], ["warmStandby", "region2"], ["orgGuard", "org"], ["vaultLock", "org"]]);
          c.act("toggleBackup");
          runDay(c, GOOD_CUTS);
        },
      },
      {
        id: "sapAssociateDesign",
        title: "The SAA reference design brought to the SAP day: one Region, one account",
        seed: 1,
        reasoning: "partial",
        drive: (c) => {
          place(c, CORE);
          asg(c, "ab", "4", "16");
          place(c, [["rdsMulti", "data-a"], ["redis", "data-b"], ["sqs", "regional"], ["s3", "regional"]]);
          c.act("toggleBackup");
          runDay(c, GOOD_CUTS);
        },
      },
      {
        id: "sapOverBudget",
        title: "The expert design plus a cache and a bigger fleet: every event held, over the $2,400 budget",
        seed: 9,
        reasoning: "met",
        notes: "Seed 9 draws AZ b for the power loss.",
        drive: (c) => {
          place(c, CORE);
          asg(c, "ab", "6", "20");
          place(c, [["auroraGlobal", "data-b"], ["redis", "data-a"], ["sqs", "regional"], ["s3", "regional"], ["warmStandby", "region2"], ["orgGuard", "org"], ["vaultLock", "org"], ["dms", "regional"]]);
          c.act("toggleBackup");
          runDay(c, ["sp", "s3life", "cfttl", "dmsoff"]);
        },
      },
      {
        id: "sapLuckyAzB",
        title: "Everything in AZ b, and the hidden draw takes out AZ a: survived by luck",
        seed: 1,
        reasoning: "partial",
        drive: (c) => {
          place(c, [["route53", "edge"], ["cloudfront", "edge"], ["waf", "edge"], ["alb", "pub-b"], ["nat", "pub-b"], ["asg", "app-b"]]);
          asg(c, "b", "4", "16");
          place(c, [["auroraGlobal", "data-b"], ["sqs", "regional"], ["s3", "regional"], ["warmStandby", "region2"], ["orgGuard", "org"], ["vaultLock", "org"], ["dms", "regional"]]);
          c.act("toggleBackup");
          runDay(c, GOOD_CUTS);
        },
      },
      {
        id: "sapLuckyNoGuards",
        title: "Single-AZ everything, no guardrails, no WAF: the leaked key deletes the backups",
        seed: 2,
        reasoning: "missed",
        drive: (c) => {
          place(c, [["cloudfront", "edge"], ["alb", "pub-a"], ["nat", "pub-a"], ["asg", "app-a"]]);
          asg(c, "a", "2", "8");
          place(c, [["rdsSingle", "data-a"], ["s3", "regional"]]);
          c.act("toggleBackup");
          runDay(c, ["nobackup", "nat1"]);
        },
      },
    ],
  };
}

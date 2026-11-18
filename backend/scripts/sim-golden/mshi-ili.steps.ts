// REQ-333: golden paths for the MSHI syndromic surveillance feed case on the
// data console (MSHI/mshi-syndromic-feed-ili-drop.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-syndromic-feed-ili-drop" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Completeness and field checks, share over complete feeds, five-week check, facilities contacted, send", reasoning: "met", drive: (c) => { run(c, "completeness"); run(c, "fields"); run(c, "restrict"); run(c, "check"); run(c, "raise"); run(c, "send"); record(c, { cause: "feeds", check: "consistent" }); } },
      { id: "sendDrop", title: "Reports 3.4% and falling", reasoning: "missed", drive: (c) => { run(c, "send"); record(c, { cause: "flu", check: "none" }); } },
      { id: "impute", title: "Finds the missing feed, copies last week's counts in and sends 6.2%", reasoning: "missed", drive: (c) => { run(c, "completeness"); run(c, "impute"); run(c, "check"); run(c, "send"); record(c, { cause: "feeds", check: "lower" }); } },
      { id: "hold", title: "Finds both feed problems, contacts the facilities and holds the report", reasoning: "partial", drive: (c) => { run(c, "completeness"); run(c, "fields"); run(c, "raise"); record(c, { cause: "feeds", check: "none" }); } },
      { id: "unchecked", title: "Checks completeness only, restricts and sends without the trend check", reasoning: "partial", drive: (c) => { run(c, "completeness"); run(c, "restrict"); run(c, "send"); record(c, { cause: "feeds", check: "lower" }); } },
      { id: "late", title: "Restricts first, then checks everything, waits for the facilities, sends after 12:00", reasoning: "met", drive: (c) => { run(c, "restrict"); run(c, "completeness"); run(c, "fields"); run(c, "check"); run(c, "raise"); for (let i = 0; i < 4; i++) run(c, "wait"); run(c, "send"); record(c, { cause: "feeds", check: "consistent" }); } },
    ],
  };
}

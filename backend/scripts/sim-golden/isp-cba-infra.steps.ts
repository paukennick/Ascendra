// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CBA/backstage-production-catalog-wiped
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CBA", slug: "backstage-production-catalog-wiped" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Database and secrets read; PostgreSQL; the token rotated into a Secret; replicas with probes behind TLS; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["dbcfg", "secrets"] }, answers: { dbPrompt: "pg", secretPrompt: "rotateEnv", haPrompt: "replicas" }, close: { how: "honest" } }) },
      { id: "partialDb", title: "Partly right on the database, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["dbcfg"] }, answers: { dbPrompt: "sqliteFile", secretPrompt: "rotateEnv", haPrompt: "replicas" }, close: { how: "honest" } }) },
      { id: "partialHa", title: "Partly right on the deployment, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dbPrompt: "pg", secretPrompt: "rotateEnv", haPrompt: "probesOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dbPrompt: "sqliteFile", secretPrompt: "moveOnly", haPrompt: "probesOnly" }, close: { how: "honest" } }) },
      { id: "badDb", title: "The catalog kept in memory; wiped again on the next deploy", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dbcfg", "secrets"] }, answers: { dbPrompt: "reimport", secretPrompt: "rotateEnv", haPrompt: "replicas" }, close: { how: "honest" } }) },
      { id: "badSecret", title: "The committed token left in place; it is misused", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dbcfg", "secrets"] }, answers: { dbPrompt: "pg", secretPrompt: "leave", haPrompt: "replicas" }, close: { how: "honest" } }) },
      { id: "badHa", title: "The backend exposed on a plain-HTTP NodePort", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dbcfg", "secrets"] }, answers: { dbPrompt: "pg", secretPrompt: "rotateEnv", haPrompt: "nodePort" }, close: { how: "honest" } }) },
    ],
  };
}

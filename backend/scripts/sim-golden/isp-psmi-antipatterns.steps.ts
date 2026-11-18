// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PSMI/scrum-master-task-assigner-status-daily
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PSMI", slug: "scrum-master-task-assigner-status-daily" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Daily Scrum observed and Retrospectives read; plan handed back; Daily Scrum restored; DoD strengthened; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["observe", "retros"] }, answers: { tasksPrompt: "selfManage", dailyPrompt: "purpose", stabPrompt: "dod" }, close: { how: "honest" } }) },
      { id: "partialTasks", title: "Partly right on task assignment, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["observe"] }, answers: { tasksPrompt: "hybrid", dailyPrompt: "purpose", stabPrompt: "dod" }, close: { how: "honest" } }) },
      { id: "partialStab", title: "Partly right on the stabilization Sprint, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { tasksPrompt: "selfManage", dailyPrompt: "purpose", stabPrompt: "bugBudget" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { tasksPrompt: "hybrid", dailyPrompt: "shorter", stabPrompt: "bugBudget" }, close: { how: "honest" } }) },
      { id: "badTasks", title: "The Scrum Master keeps assigning tasks", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["observe", "retros"] }, answers: { tasksPrompt: "assign", dailyPrompt: "purpose", stabPrompt: "dod" }, close: { how: "honest" } }) },
      { id: "badDaily", title: "The manager runs the Daily Scrum", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["observe", "retros"] }, answers: { tasksPrompt: "selfManage", dailyPrompt: "manager", stabPrompt: "dod" }, close: { how: "honest" } }) },
      { id: "badStab", title: "A stabilization Sprint scheduled", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["observe", "retros"] }, answers: { tasksPrompt: "selfManage", dailyPrompt: "purpose", stabPrompt: "schedule" }, close: { how: "honest" } }) },
    ],
  };
}

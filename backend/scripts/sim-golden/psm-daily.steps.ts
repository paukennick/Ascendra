// REQ-311: golden paths for the PSM I Sprint on the project dashboard
// (PSMI/sprint-status-meeting-daily-scrum.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "PSMI", slug: "sprint-status-meeting-daily-scrum" };

// Do one Scrum Master action and let the work it takes finish.
function act(c: Ctl, action: string, params?: Record<string, string>): void {
  c.act(action, params);
  if (c.run.state.phase === "sprint" && !c.run.state.ended) c.skip("work");
}

// Move the week on to the next morning's Daily Scrum, answering Tuesday's.
function nextMorning(c: Ctl, tuesday = "planning"): void {
  c.skip("morning");
  if (c.run.state.openPrompt) c.choose(tuesday);
}

function toReview(c: Ctl): void {
  while (c.run.state.phase === "sprint" && !c.run.state.ended) {
    if (c.run.state.openPrompt) c.choose("planning");
    const w = c.run.state.phase === "sprint" ? (c.value("day") === 5 ? "review" : "morning") : null;
    if (w) c.skip(w);
  }
}

function close(c: Ctl, what: string, pick: string): void {
  c.answer();
  c.act("present", { what });
  c.act("retro", { pick });
  c.act("close");
}

export function spec(): StepsSpec {
  return {
    slug: "sprint-status-meeting-daily-scrum",
    paths: [
      {
        id: "expert",
        title: "Tuesday's Daily Scrum handed back to the Developers, the keys raised with security the same morning, Rob shown the board, only Done work at the Review",
        reasoning: "met",
        drive: (c) => {
          nextMorning(c, "planning");
          act(c, "raise");
          act(c, "robChat");
          toReview(c);
          close(c, "done", "dependency");
        },
      },
      {
        id: "lateRaise",
        title: "Status reports to Rob on Tuesday, the impediment found and raised on Wednesday, the Daily Scrum fixed, the Goal missed and said so",
        reasoning: "partial",
        drive: (c) => {
          nextMorning(c, "status");
          nextMorning(c);
          act(c, "inspect");
          act(c, "raise");
          act(c, "fixDaily");
          act(c, "coach");
          act(c, "robChat");
          toReview(c);
          close(c, "done", "purpose");
        },
      },
      {
        id: "mockShown",
        title: "Round-robin to the Scrum Master, the provider mocked to keep moving, everything demonstrated as finished",
        reasoning: "missed",
        drive: (c) => {
          nextMorning(c, "round");
          act(c, "mock");
          act(c, "coach");
          act(c, "robChat");
          toReview(c);
          close(c, "all", "purpose");
        },
      },
      {
        id: "taskmaster",
        title: "Status reports, then the Scrum Master assigns everyone's tasks and skips the Retrospective",
        reasoning: "missed",
        drive: (c) => {
          nextMorning(c, "status");
          act(c, "inspect");
          act(c, "raise");
          act(c, "assign");
          toReview(c);
          close(c, "done", "skip");
        },
      },
      {
        id: "noRob",
        title: "A good Sprint for the Developers, but Rob is left with nothing after being asked to stay quiet",
        reasoning: "partial",
        drive: (c) => {
          act(c, "inspect");
          act(c, "raise");
          nextMorning(c, "planning");
          toReview(c);
          close(c, "done", "purpose");
        },
      },
      {
        id: "skipped",
        title: "The Daily Scrum skipped, the impediment never found, an honest but empty Review",
        reasoning: "missed",
        drive: (c) => {
          nextMorning(c, "skip");
          toReview(c);
          close(c, "done", "skip");
        },
      },
    ],
  };
}

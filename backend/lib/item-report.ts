import { queryOne } from "@/lib/db";
import { lessonCheckFor } from "@/lib/grading-service";
import { requireAcknowledgementForObjective, requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { isUuid, visibleObjective, visibleTrack } from "@/lib/visibility";
import { visibleLab } from "@/lib/labs";
import { textField } from "@/lib/text-input";
import { FLAG_REASONS, flagItem, lessonItemId, type FlagReason, type ItemRef, type RecheckResult } from "@/lib/item-quality";
import type { FactChecker } from "@/lib/fact-check";

// REQ-114 (Audit 3 H2): "Report a problem with this question". The app says
// WHICH question it means the way it already addresses it -- a lesson check
// by objective and stage, a review or exam item by session and position, a
// Quiz-me question by turn, a comparison question by its id -- and the item
// is resolved here, on the server, from rows this learner owns or can see.
// The app never sends an item id or question text that is trusted.

export class ReportError extends Error {
  constructor(
    readonly status: 400 | 404,
    message: string
  ) {
    super(message);
    this.name = "ReportError";
  }
}

export const REPORT_NOTE_MAX = 500;

export interface ReportInput {
  ref: ItemRef;
  reason: FlagReason;
  note: string | null;
}

export async function resolveReport(userId: string, body: Record<string, unknown> | null): Promise<ReportInput> {
  const b = body ?? {};
  const reason = b.reason ?? "wrong_answer";
  if (typeof reason !== "string" || !(FLAG_REASONS as readonly string[]).includes(reason)) {
    throw new ReportError(400, `reason must be one of ${FLAG_REASONS.join(", ")}`);
  }
  const n = textField(b.note ?? "", "note", REPORT_NOTE_MAX);
  if (!n.ok) throw new ReportError(400, n.error);
  const note = n.value.trim() || null;
  const notFound = () => new ReportError(404, "Question not found");
  let ref: ItemRef;
  switch (b.kind) {
    case "lesson": {
      if (typeof b.objectiveId !== "string" || (b.stage !== "fade" && b.stage !== "solo")) {
        throw new ReportError(400, "objectiveId and stage ('fade' or 'solo') are required");
      }
      const o = await visibleObjective(b.objectiveId, userId);
      if (!o) throw notFound();
      await requireAcknowledgementForObjective(o.id, userId);
      const found = await lessonCheckFor(userId, o.id, b.stage);
      if (found.status !== "ok") throw notFound();
      ref = { kind: "lesson", itemId: lessonItemId(o.id, b.stage, found.check.question), objectiveId: o.id, question: found.check.question };
      break;
    }
    case "review": {
      if (!isUuid(b.sessionId) || !Number.isInteger(b.position)) throw new ReportError(400, "sessionId and position are required");
      const r = await queryOne<{ id: string; question: string; objective_id: string }>(
        `select ri.id, ri.question, si.objective_id
           from review_session_items si
           join review_sessions s on s.id = si.session_id
           join review_items ri on ri.id = si.review_item_id
          where s.id = $1 and s.user_id = $2 and si.position = $3`,
        [b.sessionId, userId, b.position]
      );
      if (!r) throw notFound();
      ref = { kind: "review", itemId: r.id, objectiveId: r.objective_id, question: r.question };
      break;
    }
    case "exam": {
      if (!isUuid(b.sessionId) || !Number.isInteger(b.position)) throw new ReportError(400, "sessionId and position are required");
      const r = await queryOne<{ id: string; stem: string; objective_id: string }>(
        `select i.id, i.stem, si.objective_id
           from exam_session_items si
           join exam_sessions s on s.id = si.session_id
           join exam_items i on i.id = si.item_id
          where s.id = $1 and s.user_id = $2 and si.position = $3`,
        [b.sessionId, userId, b.position]
      );
      if (!r) throw notFound();
      ref = { kind: "exam", itemId: r.id, objectiveId: r.objective_id, question: r.stem };
      break;
    }
    case "quiz": {
      if (!isUuid(b.turnId)) throw new ReportError(400, "turnId is required");
      const r = await queryOne<{ id: string; question: string; objective_id: string }>(
        `select i.id, i.question, i.objective_id
           from coach_quiz_turns t join coach_quiz_items i on i.id = t.item_id
          where t.id = $1 and t.user_id = $2`,
        [b.turnId, userId]
      );
      if (!r) throw notFound();
      ref = { kind: "quiz", itemId: r.id, objectiveId: r.objective_id, question: r.question };
      break;
    }
    case "comparison": {
      if (!isUuid(b.itemId)) throw new ReportError(400, "itemId is required");
      const r = await queryOne<{ id: string; scenario: string; track_id: string; objective_id: string | null }>(
        `select d.id, d.scenario, s.track_id,
                (select m.objective_id from concept_set_members m
                  where m.set_id = d.set_id and m.position = d.answer_position) as objective_id
           from discrimination_items d join concept_sets s on s.id = d.set_id
          where d.id = $1`,
        [b.itemId]
      );
      if (!r || !(await visibleTrack(r.track_id, userId))) throw notFound();
      await requireAcknowledgementForTrack(r.track_id, userId);
      ref = { kind: "comparison", itemId: r.id, objectiveId: r.objective_id, question: r.scenario };
      break;
    }
    case "lab": {
      // REQ-123: a verifiable lab, by its id, if this learner can open it.
      if (!isUuid(b.labId)) throw new ReportError(400, "labId is required");
      const lab = await visibleLab(b.labId, userId);
      if (!lab) throw notFound();
      await requireAcknowledgementForObjective(lab.objective_id, userId);
      ref = { kind: "lab", itemId: lab.id, objectiveId: lab.objective_id, question: lab.title };
      break;
    }
    default:
      throw new ReportError(400, "kind must be one of lesson, review, exam, quiz, comparison, lab");
  }
  return { ref, reason: reason as FlagReason, note };
}

export interface ReportOutcome {
  recorded: boolean;
  quarantined: boolean;
  recheck: Promise<RecheckResult> | null;
}

export async function reportItem(userId: string, input: ReportInput, checker?: FactChecker): Promise<ReportOutcome> {
  const r = await flagItem(input.ref, { userId, source: "learner", reason: input.reason, note: input.note }, checker);
  return { recorded: r.recorded, quarantined: r.quarantined, recheck: r.recheck };
}

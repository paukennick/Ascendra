import { queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import type { LabSafetyFamily } from "@/lib/lab-grading";
import type { ReviewStatus } from "@/lib/lab-content";

// REQ-125 (Nick, 2026-11-07): "For now we can make the labs available but all
// labs should have a disclaimer to protect us."
//
// The ONE place the lab disclaimer's wording lives. It is sent with every lab
// payload (GET /api/labs/:id, POST runs, the self-reported lab card), so it
// can be corrected without an app update. The app renders these lines as
// given and never keeps its own copy.
//
// Bump LAB_DISCLAIMER_VERSION when the MEANING changes, not for a typo: every
// learner who accepted the clinical/fitness acknowledgement at an older
// version is asked again before their next clinical or fitness lab (the same
// rule as the course disclaimers, mobile/src/content/disclaimers.ts).
export const LAB_DISCLAIMER_VERSION = 1;

// Every lab, every subject. The "not affiliated" sentence is the generic
// form of the app's vendor line (mobile/src/lib/vendor.ts vendorDisclaimer),
// the only shared wording there is for it.
export const LAB_DISCLAIMER_GENERAL =
  "This lab is a practice exercise for exam preparation. It may contain errors and is not professional advice. " +
  "Ascendra is not affiliated with or endorsed by the body that runs this exam. " +
  "If something looks wrong, tap Report a problem.";

// Labs no subject-matter expert has approved yet (review_status other than
// 'approved'); shown beside the "Awaiting expert review" badge.
export const LAB_DISCLAIMER_UNREVIEWED = "This lab hasn't been reviewed by a subject-matter expert yet.";

// Clinical (nursing, NCLEX, CCRN, physical therapy) and fitness labs: the
// stronger version, and the text the one-time acknowledgement accepts.
export const LAB_DISCLAIMER_SAFETY =
  "The people and cases in this lab are fictional, for exam practice only. " +
  "It is not medical, nursing, physical-therapy or fitness advice. " +
  "Never use it to make decisions about real patients or clients. " +
  "Follow your program, facility policy, licensed supervisors and current guidelines. " +
  "In an emergency, call your local emergency services.";

// One short line under a lab's result.
export const LAB_RESULTS_NOTE: Record<LabSafetyFamily, string> = {
  general: "Practice only: this result may contain errors and is not professional advice.",
  clinical: "Fictional practice only: never use this for decisions about real patients.",
  fitness: "Fictional practice only: never use this for decisions about real clients.",
};

export const LAB_ACK_LABEL = "I understand -- these labs are practice only";
export const LAB_ACK_REQUIRED_MESSAGE =
  "Before your first lab in this subject, read the practice-lab disclaimer and tap \"I understand\".";
export const LAB_ACK_STALE_MESSAGE = "The lab disclaimer has been updated. Reload the lab and read it again.";

export type AckFamily = Exclude<LabSafetyFamily, "general">;
export function needsAcknowledgement(family: LabSafetyFamily): family is AckFamily {
  return family === "clinical" || family === "fitness";
}

export interface LabDisclaimer {
  version: number;
  family: LabSafetyFamily;
  title: string;
  // In display order: the safety version first where it applies, then the
  // unreviewed line, then the general one.
  lines: string[];
  resultsNote: string;
  acknowledgement: {
    required: boolean;
    acknowledged: boolean;
    acknowledgedAt: string | null;
    label: string;
  };
}

// Pure: the disclaimer for a lab of this family and review status, given
// when (if ever) the learner accepted the current version for the family.
export function labDisclaimer(
  family: LabSafetyFamily,
  reviewStatus: ReviewStatus | null,
  acknowledgedAt: string | null = null
): LabDisclaimer {
  const lines: string[] = [];
  if (needsAcknowledgement(family)) lines.push(LAB_DISCLAIMER_SAFETY);
  if (reviewStatus !== null && reviewStatus !== "approved") lines.push(LAB_DISCLAIMER_UNREVIEWED);
  lines.push(LAB_DISCLAIMER_GENERAL);
  const required = needsAcknowledgement(family);
  return {
    version: LAB_DISCLAIMER_VERSION,
    family,
    title: "Practice lab: please read",
    lines,
    resultsNote: LAB_RESULTS_NOTE[family],
    acknowledgement: {
      required,
      acknowledged: !required || acknowledgedAt !== null,
      acknowledgedAt: required ? acknowledgedAt : null,
      label: LAB_ACK_LABEL,
    },
  };
}

// When this learner accepted the CURRENT version for the family, or null.
export async function labAcknowledgedAt(userId: string, family: LabSafetyFamily): Promise<string | null> {
  if (!needsAcknowledgement(family)) return null;
  const row = await queryOne<{ acknowledged_at: string }>(
    `select acknowledged_at from lab_disclaimer_acknowledgements where user_id = $1 and family = $2 and version = $3`,
    [userId, family, LAB_DISCLAIMER_VERSION]
  );
  return row?.acknowledged_at ?? null;
}

export async function labDisclaimerFor(userId: string, family: LabSafetyFamily, reviewStatus: ReviewStatus | null): Promise<LabDisclaimer> {
  return labDisclaimer(family, reviewStatus, await labAcknowledgedAt(userId, family));
}

// Server-side gate: starting, resuming or grading a clinical or fitness lab
// needs the current acknowledgement for its family. 403 with a message the
// app shows as is, plus what it needs to show the disclaimer again.
export async function requireLabAcknowledgement(userId: string, family: LabSafetyFamily): Promise<void> {
  if (!needsAcknowledgement(family)) return;
  if (await labAcknowledgedAt(userId, family)) return;
  throw new UserFacingError(LAB_ACK_REQUIRED_MESSAGE, 403, {
    code: "lab_disclaimer_required",
    family,
    disclaimerVersion: LAB_DISCLAIMER_VERSION,
  });
}

// Records the acknowledgement. `shownVersion` is the version the app showed;
// a stale one is refused, so agreeing to superseded wording is never stored
// as agreement to the new one. Idempotent: the first time stays the record.
export async function acknowledgeLabDisclaimer(userId: string, family: LabSafetyFamily, shownVersion: unknown): Promise<string> {
  if (!needsAcknowledgement(family)) throw new UserFacingError("This lab doesn't need an acknowledgement.", 400);
  if (typeof shownVersion !== "number") throw new UserFacingError("version is required", 400);
  if (shownVersion !== LAB_DISCLAIMER_VERSION) throw new UserFacingError(LAB_ACK_STALE_MESSAGE, 400);
  const row = await queryOne<{ acknowledged_at: string }>(
    `insert into lab_disclaimer_acknowledgements (user_id, family, version) values ($1, $2, $3)
     on conflict (user_id, family, version) do update set acknowledged_at = lab_disclaimer_acknowledgements.acknowledged_at
     returning acknowledged_at`,
    [userId, family, LAB_DISCLAIMER_VERSION]
  );
  return row!.acknowledged_at;
}

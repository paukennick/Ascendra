// REQ-197: the exam outline changes Ascendra tells enrolled learners about,
// once each, by email (lib/service-emails.ts, kind exam_change).
//
// Every entry restates what the course's seed already records -- the dates
// (credential.effectiveDate, supersedes.lastExamDate, a unit's retiredAt, or
// contentReviewDueAt for an outline the seed has not rewritten yet) and the
// "HOW THE SWITCH IS MODELLED" / REQ-142 comment next to it. Nothing here is
// a prediction. lib/exam-changes.test.ts checks every date against the seed,
// so a seed change that moves a date fails the test until this is updated.
//
// `courseDid` must stay true to the seed: when the course has NOT been
// rewritten for the new outline, it says so.

export interface ExamChange {
  // subject_tracks.code of the course whose learners are told
  trackCode: string;
  // the day the change takes effect (YYYY-MM-DD)
  date: string;
  // short, for the subject line
  exam: string;
  whatChanges: string;
  courseDid: string;
  sourceUrl: string;
}

// Learners are told from 30 days before the date until 7 days after it.
export const NOTICE_LEAD_DAYS = 30;
export const NOTICE_LATE_DAYS = 7;

export const EXAM_CHANGES: readonly ExamChange[] = [
  {
    trackCode: "AWSSAP",
    date: "2026-11-17",
    exam: "AWS Solutions Architect - Professional",
    whatChanges:
      "SAP-C03 replaces SAP-C02. The last day to take SAP-C02 is November 16, 2026. SAP-C03 has five restructured domains, and its minimum passing score is 720 (SAP-C02's was 750).",
    courseDid:
      "The course added the five SAP-C03 domains as new units. The SAP-C02 units stay listed until November 17 so anyone sitting SAP-C02 before then can finish them; after that they are hidden, and your answers on them are kept. Progress is not copied from SAP-C02 objectives to SAP-C03 ones, because the domains were reorganized and there is no one-to-one match.",
    sourceUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/sap-03-comparison.html",
  },
  {
    trackCode: "AWSDVA",
    date: "2026-12-01",
    exam: "AWS Developer - Associate",
    whatChanges:
      "DVA-C03 replaces DVA-C02. The last day to take DVA-C02 is November 30, 2026. DVA-C03 merges and moves skills, and AI topics that were unscored in DVA-C02 are now scored, including a new AI security task.",
    courseDid:
      "The course added the four DVA-C03 domains as new units. The DVA-C02 units stay listed until December 1 so anyone sitting DVA-C02 before then can finish them; after that they are hidden, and your answers on them are kept. Progress is not copied across, because C03 merged and moved skills.",
    sourceUrl: "https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/dva-03-comparison.html",
  },
  {
    trackCode: "SECPLUS",
    date: "2026-11-17",
    exam: "CompTIA Security+",
    whatChanges:
      "CompTIA Security+ V8 (SY0-801) launches on November 17, 2026. SY0-701, which this course teaches, can still be booked in English until June 11, 2027 (Japanese, Portuguese, Spanish and Thai until August 13, 2027).",
    courseDid:
      "This course stays on SY0-701 and is unchanged. If you plan to sit SY0-801, there is a separate course for it: Prep for CompTIA Security+ (V8).",
    sourceUrl: "https://www.comptia.org/en-us/certifications/security/v8/",
  },
  {
    trackCode: "CYSAPLUS",
    date: "2026-12-22",
    exam: "CompTIA CySA+",
    whatChanges:
      "CySA+ V3 (CS0-003) retires in English on December 22, 2026. CySA+ V4 (CS0-004) is already available.",
    courseDid:
      "The course added the four CS0-004 domains as new units. The CS0-003 units stay listed until December 23 so anyone sitting CS0-003 before then can finish them; after that they are hidden, and your answers on them are kept. Progress is not copied across, because V4 regroups the content.",
    sourceUrl: "https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v3/",
  },
  {
    trackCode: "GCPDEVOPS",
    date: "2026-11-23",
    exam: "Google Cloud Professional Cloud DevOps Engineer",
    whatChanges:
      "Google publishes a new exam guide that is live from November 23, 2026. It renames section 1 (to include organizational governance), adds maintaining and ML workloads to section 2, and changes the section weights from 20/25/18/25/12 to 18/30/18/22/12.",
    courseDid:
      "The course added the five sections of the new guide as new units. The units for the guide before November 23 stay listed until November 23 so anyone sitting the exam before then can finish them; after that they are hidden, and your answers on them are kept. Progress is not copied across, because the sections were renamed, reweighted and given new topics.",
    sourceUrl: "https://cloud.google.com/learn/certification/guides/cloud-devops-engineer",
  },
];

export function examChangePeriodKey(c: ExamChange): string {
  return `${c.trackCode}:${c.date}`;
}

// The changes whose notice window contains `today`.
export function changesInWindow(today: string, all: readonly ExamChange[] = EXAM_CHANGES): ExamChange[] {
  const t = Date.parse(`${today}T00:00:00Z`);
  return all.filter((c) => {
    const d = Date.parse(`${c.date}T00:00:00Z`);
    return t >= d - NOTICE_LEAD_DAYS * 86_400_000 && t <= d + NOTICE_LATE_DAYS * 86_400_000;
  });
}

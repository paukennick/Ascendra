// REQ-165: the body of a coach-reply report (src/components/ReportCoachReply.tsx),
// kept pure so it is tested. The support route caps a body at 5000
// characters; the learner's note comes first and the quoted reply is cut to
// fit after it.
export const COACH_REPORT_REASONS = [
  "Wrong or misleading",
  "Offensive or inappropriate",
  "Unsafe advice",
  "Something else",
] as const;

export type CoachReportReason = (typeof COACH_REPORT_REASONS)[number];

export const SUPPORT_BODY_MAX = 5000;

export function coachReportBody(note: string, reply: string): string {
  const head = `${note.trim() || "(no details given)"}\n\nReported coach reply:\n`;
  const room = SUPPORT_BODY_MAX - head.length;
  const quoted = reply.length > room ? `${reply.slice(0, Math.max(0, room - 1))}…` : reply;
  return head + quoted;
}

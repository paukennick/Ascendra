import { createHmac, timingSafeEqual } from "node:crypto";
import type { ExamChange } from "@/lib/exam-changes";

// REQ-197: the words of the three service emails, the signed unsubscribe
// link they carry, and the checks that keep them plain. Pure: no database,
// no sending (lib/service-emails.ts does both).
//
// Service messages, not marketing: no offers, no upgrade prompts, no
// streaks, no guilt. service-email-copy.test.ts runs every template through
// GUILT_PATTERNS and MARKETING_PATTERNS below.

export type ServiceEmailKind = "exam_change" | "exam_countdown" | "weekly_digest";
export const SERVICE_EMAIL_KINDS: readonly ServiceEmailKind[] = ["exam_change", "exam_countdown", "weekly_digest"];

// Settings > Email switch for each kind (email_preferences columns).
export const PREF_COLUMN: Record<ServiceEmailKind, "exam_changes" | "exam_countdown" | "weekly_digest"> = {
  exam_change: "exam_changes",
  exam_countdown: "exam_countdown",
  weekly_digest: "weekly_digest",
};

// ---------------------------------------------------------------------------
// Copy rules
// ---------------------------------------------------------------------------

// Pressure or shame. Same spirit as the app's reminder list
// (mobile/src/lib/reminders.ts GUILT_PATTERNS), plus phrases emails reach for.
export const GUILT_PATTERNS: readonly RegExp[] = [
  /streak/i,
  /\bmiss(ed|ing)? (you|out|a day|your)\b/i,
  /don'?t forget/i,
  /\bdon'?t lose\b/i,
  /\blos(e|ing)\b/i,
  /fall(ing)? behind/i,
  /\bfail(ed|ing|ure)?\b/i,
  /\bmust\b/i,
  /last chance/i,
  /hurry/i,
  /disappoint/i,
  /lazy/i,
  /you haven'?t/i,
  /come back/i,
  /only \d+ days?/i,
  /running out/i,
  /!/,
];

export const MARKETING_PATTERNS: readonly RegExp[] = [
  /upgrade/i,
  /\bplus\b/i,
  /\bpro\b/i,
  /discount/i,
  /\boffer/i,
  /\bsale\b/i,
  /\bdeal\b/i,
  /% off/i,
  /free trial/i,
  /limited time/i,
  /\bbuy\b/i,
  /special/i,
];

export function copyProblems(text: string): string[] {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/https?:\/\/\S+/g, " ");
  return [...GUILT_PATTERNS, ...MARKETING_PATTERNS].filter((p) => p.test(plain)).map(String);
}

// ---------------------------------------------------------------------------
// Signed unsubscribe link
// ---------------------------------------------------------------------------

const KIND_CODE: Record<ServiceEmailKind, string> = { exam_change: "c", exam_countdown: "d", weekly_digest: "w" };
const CODE_KIND: Record<string, ServiceEmailKind> = { c: "exam_change", d: "exam_countdown", w: "weekly_digest" };
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const TOKEN_RE = new RegExp(`^(${UUID})\\.([cdw])\\.([A-Za-z0-9_-]{43})$`);

function signingKey(env: Record<string, string | undefined>): string {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not set");
  return secret;
}

function mac(payload: string, env: Record<string, string | undefined>): string {
  // Domain-separated from the JWTs signed with the same secret.
  return createHmac("sha256", signingKey(env)).update(`ascendra-unsubscribe-v1|${payload}`).digest("base64url");
}

// Does not expire: an unsubscribe link has to keep working in an old email.
// It can do one thing only -- turn one kind of email off for one account.
export function unsubscribeToken(userId: string, kind: ServiceEmailKind, env: Record<string, string | undefined> = process.env): string {
  const payload = `${userId.toLowerCase()}.${KIND_CODE[kind]}`;
  return `${payload}.${mac(payload, env)}`;
}

export function readUnsubscribeToken(
  token: unknown,
  env: Record<string, string | undefined> = process.env
): { userId: string; kind: ServiceEmailKind } | null {
  if (typeof token !== "string") return null;
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const expected = Buffer.from(mac(`${m[1]}.${m[2]}`, env));
  const given = Buffer.from(m[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { userId: m[1], kind: CODE_KIND[m[2]] };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

export interface FooterInput {
  unsubscribeUrl: string;
  postalAddress?: string | null;
}

export const KIND_LABEL: Record<ServiceEmailKind, string> = {
  exam_change: "exam change notices",
  exam_countdown: "exam countdown emails",
  weekly_digest: "the weekly progress digest",
};

const REASON: Record<ServiceEmailKind, string> = {
  exam_change: "you are studying this course on Ascendra and exam change notices are on",
  exam_countdown: "you set an exam date in Ascendra and exam countdown emails are on",
  weekly_digest: "you turned on the weekly progress digest in Ascendra",
};

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// "2026-11-17" -> "November 17, 2026" (UTC, so no time zone moves the day).
export function longDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function footer(kind: ServiceEmailKind, f: FooterInput): { html: string; text: string } {
  const address = f.postalAddress?.trim();
  const html =
    `<hr><p style="color:#666;font-size:12px">You're getting this because ${REASON[kind]}. ` +
    `<a href="${escapeHtml(f.unsubscribeUrl)}">Turn off ${KIND_LABEL[kind]}</a>, or change your email choices in Ascendra under Settings &gt; Email.</p>` +
    (address ? `<p style="color:#666;font-size:12px">${escapeHtml(address)}</p>` : "");
  const text =
    `\n--\nYou're getting this because ${REASON[kind]}. Turn off ${KIND_LABEL[kind]}: ${f.unsubscribeUrl}\n` +
    `Or change your email choices in Ascendra under Settings > Email.` +
    (address ? `\n${address}` : "");
  return { html, text };
}

const p = (s: string) => `<p>${escapeHtml(s)}</p>`;

export function examChangeEmail(input: { change: ExamChange; courseTitle: string } & FooterInput): Rendered {
  const { change } = input;
  const when = longDate(change.date);
  const lines = [
    `You're studying ${input.courseTitle} on Ascendra. This is a one-time notice about a change to the exam it prepares you for.`,
  ];
  const f = footer("exam_change", input);
  const html =
    p(lines[0]) +
    `<p><strong>What changes</strong><br>${escapeHtml(change.whatChanges)}</p>` +
    `<p><strong>When</strong><br>${escapeHtml(when)}</p>` +
    `<p><strong>What the course did</strong><br>${escapeHtml(change.courseDid)}</p>` +
    `<p>Source: <a href="${escapeHtml(change.sourceUrl)}">${escapeHtml(change.sourceUrl)}</a></p>` +
    f.html;
  const text =
    `${lines[0]}\n\nWhat changes\n${change.whatChanges}\n\nWhen\n${when}\n\nWhat the course did\n${change.courseDid}\n\nSource: ${change.sourceUrl}\n` +
    f.text;
  return { subject: `Exam change: ${change.exam}, ${when}`, html, text };
}

export interface ReadinessLine {
  // null = unconfirmed: too little evidence, or the score is not part of the
  // learner's plan. Never shown as a number then.
  percent: number | null;
  ready: boolean;
}

export function readinessSentence(r: ReadinessLine): string {
  if (r.percent == null) {
    return "Readiness: unconfirmed. There isn't enough confirmed evidence yet to give you a number.";
  }
  return r.ready
    ? `Readiness: ${r.percent}%, which meets Ascendra's ready mark for this course.`
    : `Readiness: ${r.percent}%, still building.`;
}

export function countdownEmail(
  input: {
    courseTitle: string;
    shortName: string;
    examDate: string;
    daysLeft: number;
    readiness: ReadinessLine;
    weakest: string[]; // up to 3 objective titles, weakest first
  } & FooterInput
): Rendered {
  const when = longDate(input.examDate);
  const dayWord = input.daysLeft === 1 ? "1 day" : `${input.daysLeft} days`;
  const intro = `Your ${input.courseTitle} exam date is ${when}, ${dayWord} from today.`;
  const weakLead = input.weakest.length
    ? `Your ${input.weakest.length === 1 ? "weakest objective" : `${input.weakest.length} weakest objectives`} right now:`
    : "No objectives in this course have practice yet, so there are no weak spots to name.";
  const closing = "Today's review in the app starts with what's due. Your exam date can be changed in the course's study plan.";
  const f = footer("exam_countdown", input);
  const html =
    p(intro) +
    p(readinessSentence(input.readiness)) +
    p(weakLead) +
    (input.weakest.length ? `<ol>${input.weakest.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ol>` : "") +
    p(closing) +
    f.html;
  const text =
    `${intro}\n\n${readinessSentence(input.readiness)}\n\n${weakLead}\n` +
    input.weakest.map((w, i) => `${i + 1}. ${w}\n`).join("") +
    `\n${closing}\n` +
    f.text;
  return { subject: `${input.shortName} exam in ${dayWord}`, html, text };
}

export interface DigestCourse {
  courseTitle: string;
  answered: number;
  correct: number;
  dueNextWeek: number;
  readiness: ReadinessLine;
}

export function digestEmail(input: { weekLabel: string; courses: DigestCourse[] } & FooterInput): Rendered {
  const intro = `Here is your week on Ascendra (${input.weekLabel}).`;
  const blocks = input.courses.map((c) => {
    const lines = [
      `${c.answered} question${c.answered === 1 ? "" : "s"} answered, ${c.correct} correct.`,
      c.dueNextWeek
        ? `${c.dueNextWeek} objective${c.dueNextWeek === 1 ? "" : "s"} due for review in the next 7 days.`
        : "Nothing due for review in the next 7 days.",
      readinessSentence(c.readiness),
    ];
    return { title: c.courseTitle, lines };
  });
  const f = footer("weekly_digest", input);
  const html =
    p(intro) +
    blocks.map((b) => `<p><strong>${escapeHtml(b.title)}</strong><br>${b.lines.map(escapeHtml).join("<br>")}</p>`).join("") +
    f.html;
  const text = `${intro}\n\n` + blocks.map((b) => `${b.title}\n${b.lines.join("\n")}\n`).join("\n") + f.text;
  return { subject: `Your week on Ascendra, ${input.weekLabel}`, html, text };
}

// ISO week, e.g. "2026-W46", for the digest's period key and label.
export function isoWeek(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Monday-to-Sunday label of the 7 days ending the day before `today`.
export function weekLabel(today: string): string {
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  return `${fmt(start)} to ${fmt(end)}`;
}

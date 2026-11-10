import { createHash } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { shufflePractice } from "@/lib/content-validator";
import { teachFromCards, type LessonIntroContent, type LessonPracticeContent, type TeachCards } from "@/lib/prompts";
import type { CurriculumSource } from "../supabase/seed/data";

// REQ-187 (audit 2026-11-09 R1): degree-advising objectives get AUTHORED
// lessons, never generated ones.
//
// The CMPCBS degree plan's advising blocks (gen-ed electives, the Christianity
// core, free electives, graduation requirements -- about 20 objectives) are
// facts about one school's plan, not a subject. Given only a title such as
// "Cultural Studies elective -- choose 3 credits from ... GICE 290 ...", the
// writer invented course titles (GICE 290 is Cultural Anthropology, not what
// the lesson said; GICE 220 and COMS 101 were renamed too) and taught "no
// double counting" against the plan's own shared credit (CSIS 110,
// MATH 131), and the answer keys depended on the invented facts.
//
// An advising lesson is built here from the seed and catalog data only: the
// requirement line, its block, the block's credits and the plan author's
// advising note (course_units.gate_description), the other blocks'
// requirement lines (for the checks' options), and the plan's own name,
// version, URL and checked date (SeedTrack.curriculum). No course title or
// rule that the plan line does not state is ever added. Both checks ask
// where a requirement sits in the plan, which the plan answers exactly.
// It is stored and graded like any lesson (model "authored:degree-plan"),
// with no model call, and a regenerate returns the same lesson.

export const AUTHORED_ADVISING_MODEL = "authored:degree-plan";

// Track code -> the unit titles that are advising blocks. Matched exactly.
export const ADVISING_UNITS: Readonly<Record<string, readonly string[]>> = {
  CMPCBS: [
    "Communication & Information Literacy",
    "Technological Solutions & Quantitative Reasoning",
    "Critical Thinking",
    "Civic & Global Engagement",
    "Social & Scientific Inquiry",
    "Christianity & Contexts",
    "Free Electives",
    "Graduation Requirements",
  ],
};

export function isAdvisingUnit(trackCode: string | null | undefined, unitTitle: string): boolean {
  return !!trackCode && (ADVISING_UNITS[trackCode.toUpperCase()] ?? []).includes(unitTitle);
}

export interface AdvisingLine {
  unitTitle: string;
  objectiveTitle: string;
}

export interface AdvisingContext {
  trackCode: string;
  objectiveTitle: string;
  unitTitle: string;
  rangeLabel: string | null;
  advisingNote: string | null;
  // every requirement line in the track's advising blocks, in plan order
  lines: AdvisingLine[];
  curriculum: Pick<CurriculumSource, "name" | "version" | "url" | "checkedAt"> | null;
}

// A seeded generator, so one objective's authored lesson is the same every
// time it is built (a regenerate, a re-run of the fix script).
function seededRandom(seed: string): () => number {
  let h = createHash("sha256").update(seed, "utf8").digest();
  let i = 0;
  return () => {
    if (i + 4 > h.length) {
      h = createHash("sha256").update(h).digest();
      i = 0;
    }
    const v = h.readUInt32BE(i);
    i += 4;
    return v / 2 ** 32;
  };
}

function pickOthers<T>(items: T[], n: number, rand: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export function sourceLine(c: AdvisingContext["curriculum"]): string {
  if (!c) return "Source: the school's published degree completion plan. Confirm with your academic advisor.";
  return `Source: ${c.name}, ${c.version} (${c.url}), last checked ${c.checkedAt}. Requirements and course titles change between catalog years, so confirm with the current catalog and your academic advisor before enrolling.`;
}

// Pure: the authored lesson for one advising requirement. Throws if the plan
// has too few other blocks or lines to build four distinct options.
export function authoredAdvisingLesson(ctx: AdvisingContext): LessonIntroContent & LessonPracticeContent {
  const rand = seededRandom(`${ctx.trackCode}|${ctx.unitTitle}|${ctx.objectiveTitle}`);
  const block = `${ctx.unitTitle}${ctx.rangeLabel ? ` (${ctx.rangeLabel})` : ""}`;
  const otherUnits = [...new Set(ctx.lines.map((l) => l.unitTitle))].filter((u) => u !== ctx.unitTitle);
  const otherLines = ctx.lines.filter((l) => l.unitTitle !== ctx.unitTitle).map((l) => l.objectiveTitle);
  if (otherUnits.length < 3 || otherLines.length < 3) throw new Error(`not enough advising blocks to author a lesson for "${ctx.objectiveTitle}"`);

  const cards: TeachCards = {
    cards: [
      {
        kind: "definition",
        title: "What it is",
        body: `The degree plan lists this requirement as: "${ctx.objectiveTitle}". It is part of the ${block} block. ${sourceLine(ctx.curriculum)}`,
      },
      {
        kind: "why",
        title: "Why it matters",
        body: ctx.advisingNote
          ? `The plan's advising note for this block: ${ctx.advisingNote}`
          : "Each block of the plan has to be complete before the degree can be conferred, whatever your total credits.",
      },
      {
        kind: "example",
        title: "Worked example",
        body: "Checking this requirement against your own record before you register.",
        steps: [
          `Open the official degree completion plan and find the ${ctx.unitTitle} block.`,
          `Read the requirement exactly as the plan states it: "${ctx.objectiveTitle}".`,
          "Compare it with your transcript and any transfer credit, and note whether it is already met.",
          "Confirm your reading with your academic advisor before you register for a course to meet it.",
        ],
      },
      {
        kind: "mistake",
        title: "Common mistake",
        body: "Planning from remembered course titles or descriptions. Course numbers, titles and approved lists change between catalog years; use the plan's own wording and the current catalog, not a summary.",
      },
    ],
    selfExplain: {
      step: 3,
      question: "Why compare the requirement with your record before you register?",
      modelExplanation:
        "A requirement already met by transfer credit, or by a course the plan counts in more than one place, needs no new course, so checking first avoids spending credits you do not need.",
    },
  };

  const [d1, d2, d3] = pickOthers(otherUnits, 3, rand);
  const unitWhy = (u: string) =>
    u === ctx.unitTitle
      ? `The plan lists this requirement under ${ctx.unitTitle}.`
      : `${u} is a different block of the plan, and this requirement is not listed there.`;
  const fadeChoices = [ctx.unitTitle, d1, d2, d3];
  const [l1, l2, l3] = pickOthers(otherLines, 3, rand);
  const soloChoices = [ctx.objectiveTitle, l1, l2, l3];
  const lineUnit = (t: string) => ctx.lines.find((l) => l.objectiveTitle === t)?.unitTitle ?? "another block";
  const practice: LessonPracticeContent = shufflePractice(
    {
      fadeProblem: `Your degree plan includes this requirement: "${ctx.objectiveTitle}". In which block of the plan is it listed?`,
      fadeChoices,
      fadeCorrectIndex: 0,
      fadeWhy: `The plan lists it under ${ctx.unitTitle}.`,
      fadeOptionReasons: fadeChoices.map(unitWhy),
      soloCheck: `Which of these requirements does the plan list under ${ctx.unitTitle}?`,
      soloChoices,
      soloCorrectIndex: 0,
      soloWhy: `That requirement is in the ${ctx.unitTitle} block; the others belong to other blocks of the plan.`,
      soloOptionReasons: soloChoices.map((t) =>
        t === ctx.objectiveTitle ? `The plan lists this under ${ctx.unitTitle}.` : `The plan lists this under ${lineUnit(t)}, not ${ctx.unitTitle}.`
      ),
      soloVerification: null,
    },
    rand
  );

  return {
    guessPrompt: `Before reading on: which part of your degree plan do you think this requirement belongs to, and what would you check before registering for it? "${ctx.objectiveTitle}"`,
    teach: teachFromCards(cards),
    teachCards: cards,
    ...practice,
  };
}

// The advising context for an objective, or null when it is not in an
// advising block. One query for the objective, one for its track's lines.
export async function advisingContextFor(objectiveId: string): Promise<AdvisingContext | null> {
  const row = await queryOne<{ title: string; unit_title: string; range_label: string | null; gate_description: string | null; track_id: string; code: string; user_id: string | null }>(
    `select o.title, cu.title as unit_title, cu.range_label, cu.gate_description, st.id as track_id, st.code, st.user_id
       from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where o.id = $1`,
    [objectiveId]
  );
  if (!row || row.user_id || !isAdvisingUnit(row.code, row.unit_title)) return null;
  const units = ADVISING_UNITS[row.code.toUpperCase()];
  const lines = await query<{ unit_title: string; title: string }>(
    `select cu.title as unit_title, o.title
       from objectives o join course_units cu on cu.id = o.unit_id
      where cu.track_id = $1 and cu.title = any($2::text[]) and (cu.retired_at is null or cu.retired_at > now()) and (o.retired_at is null or o.retired_at > now())
      order by cu.sort_order, o.sort_order`,
    [row.track_id, units]
  );
  return {
    trackCode: row.code.toUpperCase(),
    objectiveTitle: row.title,
    unitTitle: row.unit_title,
    rangeLabel: row.range_label,
    advisingNote: row.gate_description,
    lines: lines.map((l) => ({ unitTitle: l.unit_title, objectiveTitle: l.title })),
    curriculum: await curriculumFor(row.code),
  };
}

async function curriculumFor(code: string): Promise<AdvisingContext["curriculum"]> {
  try {
    const { CATALOG_TRACKS } = await import("../supabase/seed/catalog");
    const t = CATALOG_TRACKS.find((x) => x.code.toUpperCase() === code.toUpperCase());
    const c = t?.curriculum;
    return c ? { name: c.name, version: c.version, url: c.url, checkedAt: c.checkedAt } : null;
  } catch {
    return null;
  }
}

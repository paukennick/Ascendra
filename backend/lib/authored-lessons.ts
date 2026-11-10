import { createHash } from "node:crypto";
import { queryOne } from "@/lib/db";
import { shufflePractice } from "@/lib/content-validator";
import { teachFromCards, type LessonIntroContent, type LessonPracticeContent, type TeachCards } from "@/lib/prompts";

// REQ-195 (replaces REQ-187's lib/degree-advising.ts): lessons a person
// wrote, with the sources each claim rests on, served instead of a generated
// lesson for the objectives listed here.
//
// REQ-187 gave the CMPCBS degree-plan advising objectives (gen-ed elective
// lines, the Christianity core, free electives, the graduation checklist)
// lessons built from the plan, because the writer invented course titles and
// rules when given only a plan line. REQ-195 (Nick, 2026-11-09) removed the
// degree-plan content: the advising lines are retired, and the three that are
// a real general course type -- college composition and two neutral religion
// surveys -- are reframed in place. Those three get the authored lessons
// below; a retired objective gets none (it is not served at all).
//
// An authored lesson is stored and graded like any lesson (model
// AUTHORED_LESSON_MODEL), with no model call, and a regenerate returns the
// same lesson. Its last teaching card ends with a dated sources line.

export const AUTHORED_LESSON_MODEL = "authored:course-lesson";

export interface AuthoredSource {
  title: string;
  url: string;
  checkedAt: string; // YYYY-MM-DD
}

type Practice = Pick<
  LessonPracticeContent,
  "fadeProblem" | "fadeChoices" | "fadeCorrectIndex" | "fadeWhy" | "soloCheck" | "soloChoices" | "soloCorrectIndex" | "soloWhy"
> & { fadeOptionReasons: string[]; soloOptionReasons: string[] };

export interface AuthoredLesson {
  guessPrompt: string;
  cards: TeachCards;
  practice: Practice;
  sources: AuthoredSource[];
}

// Track code -> objective title (exactly as seeded) -> lesson.
// REQ-195 (Nick, 2026-11-09, later): the three reframed non-CS courses
// (college composition and the two religion surveys) were removed from the
// track, so CMPCBS has no authored lessons. The mechanism stays for future
// authored content.
export const AUTHORED_LESSONS: Readonly<Record<string, Readonly<Record<string, AuthoredLesson>>>> = {};

export function authoredSourcesLine(sources: AuthoredSource[]): string {
  return `Sources (checked): ${sources.map((s) => `${s.title}, ${s.url} (${s.checkedAt})`).join("; ")}.`;
}

export interface AuthoredRef {
  trackCode: string;
  objectiveTitle: string;
}

export function hasAuthoredLesson(trackCode: string | null | undefined, objectiveTitle: string): boolean {
  return !!trackCode && !!AUTHORED_LESSONS[trackCode.toUpperCase()]?.[objectiveTitle];
}

// A seeded generator, so one objective's lesson has the same stored answer
// order every time it is built (a regenerate, a re-run of the fix script).
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

// Pure: the lesson as the store and the client see it, or null when none is
// authored for this objective.
export function authoredLesson(ref: AuthoredRef): (LessonIntroContent & LessonPracticeContent) | null {
  const a = AUTHORED_LESSONS[ref.trackCode.toUpperCase()]?.[ref.objectiveTitle];
  if (!a) return null;
  const last = a.cards.cards.length - 1;
  const cards: TeachCards = {
    ...a.cards,
    cards: a.cards.cards.map((c, i) => (i === last ? { ...c, body: `${c.body} ${authoredSourcesLine(a.sources)}` } : c)),
  };
  const practice = shufflePractice({ ...a.practice, soloVerification: null }, seededRandom(`${ref.trackCode.toUpperCase()}|${ref.objectiveTitle}`));
  return { guessPrompt: a.guessPrompt, teach: teachFromCards(cards), teachCards: cards, ...practice };
}

// The authored reference for a catalog objective, or null. One query.
export async function authoredRefFor(objectiveId: string): Promise<AuthoredRef | null> {
  const row = await queryOne<{ title: string; code: string; user_id: string | null }>(
    `select o.title, st.code, st.user_id
       from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where o.id = $1`,
    [objectiveId]
  );
  if (!row || row.user_id || !hasAuthoredLesson(row.code, row.title)) return null;
  return { trackCode: row.code.toUpperCase(), objectiveTitle: row.title };
}

import { query, queryOne } from "@/lib/db";
import { callClaudeStructured, getModel } from "@/lib/anthropic";
import {
  lessonIntroPrompt,
  lessonPracticePrompt,
  lessonIntroSchema,
  lessonPracticeSchema,
  type LessonAvoid,
  type LessonIntroContent,
  type LessonPracticeContent,
} from "@/lib/prompts";

// Shared by both the lesson route (app/api/objectives/[id]/lesson/route.ts)
// and the prefetch route (.../lesson/prefetch-next/route.ts) -- extracted
// here rather than duplicated so both import the *same* `pendingGeneration`
// map instance below. Two separate copies of that map (one per route file)
// would silently defeat the in-flight de-dup: a prefetch started here and a
// GET landing moments later for the same objective would each think nothing
// was in flight and generate independently.

export interface LessonRow {
  guess_prompt: string;
  teach: string;
  fade_problem: string;
  fade_choices: string[];
  fade_correct_index: number;
  fade_why: string;
  solo_check: string;
  solo_choices: string[];
  solo_correct_index: number;
  solo_why: string;
  model: string;
  generated_at: string;
}

export interface ObjectiveRow {
  title: string;
  unit_title: string;
  track_title: string;
}

export function rowToLesson(row: LessonRow) {
  return {
    guessPrompt: row.guess_prompt,
    teach: row.teach,
    fadeProblem: row.fade_problem,
    fadeChoices: row.fade_choices,
    fadeCorrectIndex: row.fade_correct_index,
    fadeWhy: row.fade_why,
    soloCheck: row.solo_check,
    soloChoices: row.solo_choices,
    soloCorrectIndex: row.solo_correct_index,
    soloWhy: row.solo_why,
    model: row.model,
    generatedAt: row.generated_at,
  };
}

export function rowToAvoid(row: LessonRow): LessonAvoid {
  return { teach: row.teach, fadeProblem: row.fade_problem, soloCheck: row.solo_check };
}

export async function loadObjective(objectiveId: string): Promise<ObjectiveRow | null> {
  return queryOne<ObjectiveRow>(
    `select o.title, cu.title as unit_title, st.title as track_title
     from objectives o
     join course_units cu on cu.id = o.unit_id
     join subject_tracks st on st.id = cu.track_id
     where o.id = $1`,
    [objectiveId]
  );
}

export interface GenerationHandle {
  introPromise: Promise<LessonIntroContent>;
  fullPromise: Promise<LessonRow>;
}

// A full generation (intro, then practice+save) already in flight for an
// objective, keyed so ANY second caller -- a real GET/POST for the same
// objective, a second prefetch call, a double-tapped regenerate -- awaits
// the same generation instead of starting a redundant, and possibly
// inconsistent, second one. Claimed synchronously in `ensureGeneration`
// below, before any await, so this covers the intro phase too, not just the
// practice phase.
//
// An earlier version of this only tracked the practice half (set once intro
// had already resolved), which left the entire intro-generation window --
// often 10+ seconds -- where two callers could each run their own
// independent intro generation for the same objective, produce two
// different guessPrompt/teach texts, and have whichever's practice phase
// happened to call generatePracticeAndSave first silently determine what
// actually got cached, while the other caller's own response showed content
// that was never persisted. Caught live in testing (a prefetch call
// immediately followed by a real GET for the same objective, both landing
// while the first was still generating its intro) -- not a rare corner
// case, closer to the common case for prefetch's whole reason to exist.
//
// Per-process only: under multiple concurrent serverless instances a
// duplicate generation is still possible, but never a correctness problem
// -- worst case is one wasted Anthropic call. Revisit if that shows up.
export const pendingGeneration = new Map<string, GenerationHandle>();

async function generateIntro(
  objRow: ObjectiveRow,
  avoid?: LessonAvoid
): Promise<LessonIntroContent> {
  const { system, user } = lessonIntroPrompt({
    trackTitle: objRow.track_title,
    unitTitle: objRow.unit_title,
    objectiveTitle: objRow.title,
    avoid,
  });
  return callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: lessonIntroSchema,
    maxTokens: 4000,
    temperature: 1,
    // See lib/anthropic.ts: Sonnet 5 runs adaptive thinking by default even
    // when never asked for, and its budget counts against max_tokens
    // unpredictably -- caused a real 500 on a verbose real objective (no
    // text block at all, stop_reason max_tokens, blocks=[thinking]) during
    // testing. This is deterministic content generation, not a reasoning
    // task, so thinking buys nothing here and only eats the token budget.
    disableThinking: true,
  });
}

async function generatePracticeAndSave(
  objectiveId: string,
  objRow: ObjectiveRow,
  intro: LessonIntroContent,
  avoid?: LessonAvoid
): Promise<LessonRow> {
  const { system, user } = lessonPracticePrompt({
    trackTitle: objRow.track_title,
    unitTitle: objRow.unit_title,
    objectiveTitle: objRow.title,
    avoid,
  });
  const practice = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: lessonPracticeSchema,
    maxTokens: 6000,
    temperature: 1,
    disableThinking: true,
  });
  const content = { ...intro, ...practice };
  const model = getModel();
  const rows = await query<LessonRow>(
    `insert into lesson_content
      (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, model)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (objective_id) do update set
       guess_prompt = excluded.guess_prompt,
       teach = excluded.teach,
       fade_problem = excluded.fade_problem,
       fade_choices = excluded.fade_choices,
       fade_correct_index = excluded.fade_correct_index,
       fade_why = excluded.fade_why,
       solo_check = excluded.solo_check,
       solo_choices = excluded.solo_choices,
       solo_correct_index = excluded.solo_correct_index,
       solo_why = excluded.solo_why,
       model = excluded.model,
       generated_at = now()
     returning *`,
    [
      objectiveId,
      content.guessPrompt,
      content.teach,
      content.fadeProblem,
      JSON.stringify(content.fadeChoices),
      content.fadeCorrectIndex,
      content.fadeWhy,
      content.soloCheck,
      JSON.stringify(content.soloChoices),
      content.soloCorrectIndex,
      content.soloWhy,
      model,
    ]
  );
  return rows[0];
}

// Starts a full generation for an objective if nothing is already in
// flight, or returns the existing handle. The map slot is claimed
// synchronously -- before either promise is awaited anywhere -- so a second
// caller checking `pendingGeneration` at any point after this function
// returns (including on the very next microtask) sees the claim and reuses
// the same handle, rather than racing to generate its own competing intro.
export function ensureGeneration(
  objectiveId: string,
  objRow: ObjectiveRow,
  avoid?: LessonAvoid
): GenerationHandle {
  const existing = pendingGeneration.get(objectiveId);
  if (existing) return existing;

  const introPromise = generateIntro(objRow, avoid);
  const fullPromise = introPromise.then((intro) =>
    generatePracticeAndSave(objectiveId, objRow, intro, avoid)
  );
  const handle: GenerationHandle = { introPromise, fullPromise };
  pendingGeneration.set(objectiveId, handle);

  // Attaching a handler here (rather than leaving cleanup to whatever the
  // caller does with the handle) is also what keeps fullPromise from ever
  // being a fully-unhandled rejection: this runs regardless of what the
  // caller awaits or ignores.
  fullPromise.finally(() => {
    if (pendingGeneration.get(objectiveId) === handle) pendingGeneration.delete(objectiveId);
  });

  return handle;
}

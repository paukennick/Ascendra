import { after } from "next/server";
import { query, queryOne } from "@/lib/db";
import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { callClaudeJSON, getModel } from "@/lib/anthropic";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import {
  lessonIntroPrompt,
  lessonPracticePrompt,
  type LessonAvoid,
  type LessonIntroContent,
  type LessonPracticeContent,
} from "@/lib/prompts";

export const dynamic = "force-dynamic";

interface LessonRow {
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

interface ObjectiveRow {
  title: string;
  unit_title: string;
  track_title: string;
}

function rowToLesson(row: LessonRow) {
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

function rowToAvoid(row: LessonRow): LessonAvoid {
  return { teach: row.teach, fadeProblem: row.fade_problem, soloCheck: row.solo_check };
}

async function loadObjective(objectiveId: string): Promise<ObjectiveRow | null> {
  return queryOne<ObjectiveRow>(
    `select o.title, cu.title as unit_title, st.title as track_title
     from objectives o
     join course_units cu on cu.id = o.unit_id
     join subject_tracks st on st.id = cu.track_id
     where o.id = $1`,
    [objectiveId]
  );
}

// Practice-half (fade + solo) generation already in flight for an objective,
// keyed so a second request -- the learner reaching the fade step before the
// background generation finishes, or a double-tapped regenerate -- awaits the
// same call instead of starting a redundant, and possibly inconsistent,
// second one. Per-process only: under multiple concurrent serverless
// instances a duplicate generation is possible, but never a correctness
// problem -- worst case is one wasted Anthropic call. Revisit if that
// actually shows up in cost/logs.
const pendingPractice = new Map<string, Promise<LessonRow>>();

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
  const practice = await callClaudeJSON<LessonPracticeContent>({
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 6000,
    temperature: 1,
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

function startPractice(
  objectiveId: string,
  objRow: ObjectiveRow,
  intro: LessonIntroContent,
  avoid?: LessonAvoid
): Promise<LessonRow> {
  const inFlight = pendingPractice.get(objectiveId);
  if (inFlight) return inFlight;
  const promise = generatePracticeAndSave(objectiveId, objRow, intro, avoid).finally(() => {
    // Only clear if this is still the tracked promise -- guards against a
    // newer regenerate's promise being dropped by an older one settling later.
    if (pendingPractice.get(objectiveId) === promise) pendingPractice.delete(objectiveId);
  });
  pendingPractice.set(objectiveId, promise);
  return promise;
}

// GET /api/objectives/:id/lesson -- returns cached lesson content. On a cache
// miss, generates and returns the guess+teach half as soon as it's ready
// (`practicePending: true`) instead of blocking on the full generation --
// measured around 20s combined, vs. ~13s for guess+teach alone. The learner
// spends real time on those two steps before reaching fade/solo, so the
// practice half generates invisibly in the background (`after()` keeps it
// running past this response) rather than as an up-front wait. A second GET
// once they reach fade either gets the now-complete cached row, or awaits the
// same in-flight generation if it's still running.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Was previously unauthenticated: any objective id would return its
    // lesson, and a cache miss would spend an Anthropic call doing it.
    const user = await requireUser(req);
    await requireAcknowledgementForObjective(id, user.id);

    const inFlight = pendingPractice.get(id);
    if (inFlight) {
      const generated = await inFlight;
      return ok({ lesson: rowToLesson(generated), cached: false });
    }

    const existing = await queryOne<LessonRow>(
      `select * from lesson_content where objective_id = $1`,
      [id]
    );
    if (existing) return ok({ lesson: rowToLesson(existing), cached: true });

    const objRow = await loadObjective(id);
    if (!objRow) return notFound("Objective not found");

    const { system, user: userPrompt } = lessonIntroPrompt({
      trackTitle: objRow.track_title,
      unitTitle: objRow.unit_title,
      objectiveTitle: objRow.title,
    });
    const intro = await callClaudeJSON<LessonIntroContent>({
      system,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 4000,
      temperature: 1,
    });

    const practicePromise = startPractice(id, objRow, intro);
    after(() => practicePromise.catch(() => {}));

    return ok({
      lesson: { guessPrompt: intro.guessPrompt, teach: intro.teach },
      cached: false,
      practicePending: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/objectives/:id/lesson -- force-regenerate lesson content
// (overwrites the cache). Same progressive shape as GET: a freshly generated
// guess+teach comes back immediately, fade/solo regenerate in the background
// and overwrite the row once both halves are done. `avoid` steers both halves
// away from the objective's current cached content so a regenerate actually
// comes back with different material instead of Claude converging back onto
// the same answer for the same prompt.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Regeneration always spends an Anthropic call and overwrites the
    // cache, so this needs auth at least as much as the GET does.
    const user = await requireUser(req);
    await requireAcknowledgementForObjective(id, user.id);

    const inFlight = pendingPractice.get(id);
    if (inFlight) {
      const generated = await inFlight;
      return ok({ lesson: rowToLesson(generated), cached: false });
    }

    const objRow = await loadObjective(id);
    if (!objRow) return notFound("Objective not found");

    const existing = await queryOne<LessonRow>(
      `select * from lesson_content where objective_id = $1`,
      [id]
    );
    const avoid = existing ? rowToAvoid(existing) : undefined;

    const { system, user: userPrompt } = lessonIntroPrompt({
      trackTitle: objRow.track_title,
      unitTitle: objRow.unit_title,
      objectiveTitle: objRow.title,
      avoid,
    });
    const intro = await callClaudeJSON<LessonIntroContent>({
      system,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 4000,
      temperature: 1,
    });

    const practicePromise = startPractice(id, objRow, intro, avoid);
    after(() => practicePromise.catch(() => {}));

    return ok({
      lesson: { guessPrompt: intro.guessPrompt, teach: intro.teach },
      cached: false,
      practicePending: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

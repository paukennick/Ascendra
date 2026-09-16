import { query, queryOne } from "@/lib/db";
import { ok, notFound, serverError } from "@/lib/http";
import { callClaudeJSON, getModel } from "@/lib/anthropic";
import { lessonGenerationPrompt, type LessonContent } from "@/lib/prompts";

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

async function generateAndCache(objectiveId: string) {
  const objRow = await queryOne<{
    title: string;
    unit_title: string;
    track_title: string;
  }>(
    `select o.title, cu.title as unit_title, st.title as track_title
     from objectives o
     join course_units cu on cu.id = o.unit_id
     join subject_tracks st on st.id = cu.track_id
     where o.id = $1`,
    [objectiveId]
  );
  if (!objRow) return null;

  const { system, user } = lessonGenerationPrompt({
    trackTitle: objRow.track_title,
    unitTitle: objRow.unit_title,
    objectiveTitle: objRow.title,
  });

  const content = await callClaudeJSON<LessonContent>({
    system,
    messages: [{ role: "user", content: user }],
    // Cached once per objective, not per user, so a generous budget is cheap
    // in aggregate — Sonnet 5 was hitting this ceiling mid-JSON on the full
    // teach/fadeProblem/soloCheck structure and getting truncated.
    maxTokens: 6000,
  });

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

// GET /api/objectives/:id/lesson — returns cached lesson content, generating (and
// caching) it on first visit. Never re-spends an Anthropic call on repeat visits.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await queryOne<LessonRow>(
      `select * from lesson_content where objective_id = $1`,
      [id]
    );
    if (existing) return ok({ lesson: rowToLesson(existing), cached: true });

    const generated = await generateAndCache(id);
    if (!generated) return notFound("Objective not found");
    return ok({ lesson: rowToLesson(generated as LessonRow), cached: false });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/objectives/:id/lesson — force-regenerate lesson content (overwrites cache).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const generated = await generateAndCache(id);
    if (!generated) return notFound("Objective not found");
    return ok({ lesson: rowToLesson(generated as LessonRow), cached: false });
  } catch (err) {
    return serverError(err);
  }
}

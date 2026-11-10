# Study paths (REQ-198)

A study path is a short, ordered list of catalog courses meant to be taken
one after another. Each step says when to take the course and why. The
first path is for someone starting PT school:

| Step | Course | When |
|---|---|---|
| 1 | PT School Prerequisites Refresher (`PTPREREQ`) | Before the program starts, or in its first weeks |
| 2 | Doctor of Physical Therapy (DPT) course (`DPT`) | During the program |
| 3 | NPTE-PT exam prep (`NPTEPT`) | In the final year, about 6 to 9 months before graduating |

## Where the path lives

Paths are seed data in `backend/supabase/seed/paths.ts` (`STUDY_PATHS`),
keyed by track code. Nothing is copied into the database and there is no
migration. Track codes are already unique for catalog courses (migration
023), and the seed creates and updates courses by code. The definition
therefore names courses exactly the way the seed does, and a course's
title can change without touching the path. For example, REQ-194 retitles
the course "Prep for the NPTE-PT Exam".

A path is catalog data that changes only when the catalog does. A table
would add a migration and an admin screen for a list that ships with the
seed anyway. Revisit this if a path ever needs per-learner state, such as
"I'm on this path" or progress across a path.

To add a path, append an entry with a `slug`, `title`, `audience` and
`steps` (each with `trackCode`, `when` and `why`).
`lib/study-paths.test.ts` checks that every code is a catalog course, that
a path has at least two steps and no repeats, and that every step says
when and why.

## What the learner sees

On the course page, under the study plan panel, each path the course sits
on shows as a card (`mobile/src/components/StudyPathPanel.tsx`):

- the path's title and who it is for, and "Step n of m";
- **Recommended before**: the previous course on the path, with when to take it;
- **Recommended after**: the next course, with when to take it;
- the whole path in order, with this course marked.

Each before and after row is one button (at least 48 dp, one spoken label)
that opens that course. The DPT and NPTE-PT course pages show the path, and
so does the refresher's. A course on no path shows nothing, and if the
request fails the card is hidden: the course works without it.

## API

`GET /api/courses/:id/path` (`lib/study-paths.ts`) returns:

```json
{ "paths": [{ "slug": "dpt-student", "title": "...", "audience": "Starting PT school",
  "steps": [{ "trackId": "...", "code": "PTPREREQ", "title": "...", "when": "...", "why": "...", "position": 1, "current": false }],
  "before": { "...": "a step" }, "after": null }] }
```

- Auth, then a visibility check (`visibleTrack`): a course the caller
  can't see gets 404, like every course route.
- Only shared catalog courses are placed on a path. A learner's own course
  that reuses a catalog code gets `[]`.
- One query resolves every code on every path. A step whose course isn't
  in the database is left out, and the neighbours close up around it. A
  path is shown only while this course and at least one other remain.
- Read-only, no AI call, no learner data.

## Why not the intake form or objective prerequisites

- **Intake form (#73, REQ-169).** Its goals (`pass_exam`, `new_skill`,
  ...) are fixed by a check constraint in migration 060. Adding "Starting PT
  school" there needs a schema change, and the course page would still
  need before/after. The path works without the intake form. Once #73 is
  merged, the form could suggest a path's first course for a matching goal,
  read from `STUDY_PATHS`.
- **`/api/courses/:id/prerequisites` and `prereq_map` (REQ-111).** These
  are links between objectives inside one course, generated per course.
  They cannot express an order between courses.

## Follow-ups

- REQ-194 (`hidden_at`, migration 065) is not on this branch's base. Once
  it merges, `coursePaths` should also skip a step whose course is hidden.
  None of the three PT courses is hidden.
- The refresher's labs are written-answer only. When interactive answer
  types (REQ-189) merge, the torque, physics and statistics labs are the
  first candidates for numeric and order parts.

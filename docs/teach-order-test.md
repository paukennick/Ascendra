# Explain first / Example first: how to read the test (REQ-262)

Built 2026-11-13 (levels phase 2). Nick, 2026-11-13: there are no learners
yet, so the test is on from day one rather than delayed.

## What the learner sees

Teach is a few short cards. **Explain first** is today's order: what it is,
why it matters, the worked example, the common mistake. **Example first**
moves the worked example to the front; the other cards follow in the same
order. Same content, same solo check, same mastery rules, so progress is
comparable. It costs nothing to generate: the app reorders cards it already
has. A lesson cached before cards (one block of text) is the same in both
orders and records no order.

It is a comfort setting, not a learning style (research finds no benefit from
matching teaching to a stated style; design section 6). In **Settings, under
Study, "Lesson order"** the learner picks either order, and the sheet says
plainly that Ascendra is also trying both to learn which helps more.

## How learners are assigned

- A learner who has not chosen is given one order **at random, once**, the
  first time a lesson asks (`GET /api/account/teach-order`). It is stored
  (`learner_teach_order.assigned_order`, migration 082) and never redrawn, so
  it is the same on every device and in every course.
- Choosing in Settings stores the choice (`teach_order`, `chosen_at`). The
  assignment is kept beside it. Picking the order you were assigned still
  counts as a choice.
- Every lesson event (`guess_shown`, `lesson_step_reached`, `teach_card_viewed`
  and the rest of `lib/learner-level-rules.ts` LESSON_EVENTS) carries
  `detail.order` and `detail.order_source` (`assigned` or `chosen`) when the
  lesson has cards. Events also carry `level` and `flow`, so results can be
  split by level and by whether the course has the level-aware flow on
  (`subject_tracks.level_flow`). The test runs in every course; the level flow
  decides nothing about the order, and Example first does not change what the
  level flow does before Guided.
- `TEACH_ORDER_TEST=off` (backend setting) stops handing out new random arms
  and shows Explain first to learners who have not chosen. It never changes a
  learner's own choice. While it is off, a lesson for a learner who has not
  chosen records no order, so those lessons fall out of the results; note the
  day it was switched in your analysis.

## Reading the results

Read-only; no answer text. From `backend/`:

```
npm run metrics -- --days 30
```

prints it at the end ("Explain first / Example first"). By hand, the same
query (a test keeps the two identical), with `$1` the number of days:

<!-- teach-order-sql -->
```sql
with lessons as (
  select distinct on (e.user_id, e.objective_id)
         e.user_id, e.objective_id, e.created_at as started_at,
         e.detail->>'order' as arm,
         coalesce(e.detail->>'order_source', 'unknown') as source
    from learner_events e
   where e.detail->>'order' is not null
     and e.objective_id is not null
     and e.created_at >= now() - make_interval(days => $1)
   order by e.user_id, e.objective_id, e.created_at asc, e.id asc
),
per_lesson as (
  select l.user_id, l.arm, l.source, l.started_at,
         t.assigned_order,
         g.verdict as guided_verdict,
         s.verdict as solo_verdict,
         coalesce(s.assisted, false) as solo_assisted,
         m.status::text as status,
         extract(epoch from (nxt.next_at - te.taught_at)) as teach_seconds
    from lessons l
    left join learner_teach_order t on t.user_id = l.user_id
    left join lateral (
      select a.verdict::text as verdict
        from attempts a
       where a.user_id = l.user_id and a.objective_id = l.objective_id
         and a.kind = 'lesson' and a.stage = 'fade' and a.voided_at is null
       order by a.created_at asc, a.id asc limit 1) g on true
    left join lateral (
      select a.verdict::text as verdict, a.assisted
        from attempts a
       where a.user_id = l.user_id and a.objective_id = l.objective_id
         and a.kind = 'lesson' and a.stage = 'solo' and a.voided_at is null
       order by a.created_at asc, a.id asc limit 1) s on true
    left join mastery m on m.user_id = l.user_id and m.objective_id = l.objective_id
    left join lateral (
      select min(x.created_at) as taught_at
        from learner_events x
       where x.user_id = l.user_id and x.objective_id = l.objective_id
         and x.event = 'lesson_step_reached' and x.detail->>'step' = 'teach') te on true
    left join lateral (
      select min(x.created_at) as next_at
        from learner_events x
       where x.user_id = l.user_id and x.objective_id = l.objective_id
         and x.event = 'lesson_step_reached' and x.detail->>'step' in ('fade', 'solo', 'lab', 'done')
         and x.created_at > te.taught_at) nxt on true
)
select p.arm, p.source, p.assigned_order,
       count(*)::int as lessons,
       count(distinct p.user_id)::int as learners,
       count(*) filter (where p.guided_verdict is not null)::int as guided_answered,
       count(*) filter (where p.guided_verdict = 'correct')::int as guided_first_try_correct,
       count(*) filter (where p.solo_verdict is not null)::int as solo_answered,
       count(*) filter (where p.solo_verdict = 'correct')::int as solo_first_try_correct,
       count(*) filter (where p.solo_verdict = 'correct' and not p.solo_assisted)::int as solo_unassisted_correct,
       count(*) filter (where p.started_at < now() - interval '24 hours')::int as settled_24h,
       count(*) filter (where p.started_at < now() - interval '24 hours'
                          and p.status in ('Independent', 'Transfer-ready'))::int as independent_after_24h,
       round((percentile_cont(0.5) within group (order by p.teach_seconds)
              filter (where p.teach_seconds between 0 and 1800))::numeric)::int as median_teach_seconds
  from per_lesson p
 group by p.arm, p.source, p.assigned_order
 order by p.arm, p.source, p.assigned_order nulls last
```

One row per (order shown, source, assigned order). Columns:

| Column | Meaning |
| --- | --- |
| `arm` | the order the lesson showed |
| `source` | `assigned` (never chosen), `chosen` (picked in Settings), `unknown` |
| `assigned_order` | the arm the learner was randomly given |
| `lessons`, `learners` | (learner, objective) lessons, and distinct learners |
| `guided_answered`, `guided_first_try_correct` | first lesson answer on Guided: answered, right first time |
| `solo_answered`, `solo_first_try_correct` | the same for Solo |
| `solo_unassisted_correct` | Solo right the first time with no hint |
| `settled_24h`, `independent_after_24h` | lessons started over 24 hours ago, and those now Independent or Transfer-ready |
| `median_teach_seconds` | median time from reaching Teach to the next step; gaps over 30 minutes are ignored |

The four measures Nick asked for: **first-try accuracy** (`guided_first_try_correct
/ guided_answered`), **solo accuracy** (`solo_first_try_correct / solo_answered`,
and the no-hint version), **Independent mastery after 24h**
(`independent_after_24h / settled_24h`; the status today, not at the 24th hour,
so read it only for lessons well over a day old) and **time in Teach**
(`median_teach_seconds`).

### Which comparison to trust

1. **Randomized comparison:** rows with `source = 'assigned'`. Those learners
   never chose, so shown order equals assigned order and the two groups differ
   only by the coin flip. Add up the rows per `arm` and compare the rates.
2. **Intent to treat:** add up all rows per `assigned_order`, whatever the
   learner was shown. It stays fair even if people who chose differ from people
   who did not, and it answers "what does assigning this order do".
3. **Do not compare `source = 'chosen'` rows with the others.** People who
   choose an order are a self-selected group. They are there to show how many
   learners switch and which way, not to say which order teaches better.

### Cautions

- Usage is test traffic until there are real learners; the design asks for at
  least a few hundred lessons per side before reading a difference. A rate is
  never read without its counts, and accuracy differences of a few points are
  noise at small sizes.
- Per learner, not per lesson: one learner's many lessons are not independent.
  Count `learners` beside `lessons`, and when comparing, prefer a rate computed
  per learner and then averaged.
- Time in Teach is when the screen was open, not attention. A shorter time with
  the same accuracy is better; a shorter time with lower accuracy is not.
- Mastery uses the one mastery rule at every level and in both orders; nothing
  here changes it.
- Split by `level` (in the event detail) before reading a result: Example first
  may help New learners and not Experienced ones.

## Where it is built

`backend/lib/teach-order.ts` (assignment and choice), `teach-order-rules.ts`
(pure rules), `app/api/account/teach-order/route.ts`,
`teach-order-results.ts` (the query above), migration 082. App:
`mobile/src/lib/teachOrder.ts`, the lesson screen, and Settings.

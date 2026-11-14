// REQ-262: write the beginner version of a course's lessons (levels phase 2).
// SWITCHED OFF and never run by anything in the repository. Read
// docs/beginner-variants.md before running it.
//
//   npm run variants:generate -- --course PYTHON
//       DRY RUN (the default): which objectives would be written, and the
//       worst-case cost. Calls no model and writes nothing. Works on a course
//       whose switch is still off, so the cost can be seen first.
//   npm run variants:generate -- --course PYTHON --confirm --max-usd 5
//       Writes them (live calls, ~10 per objective in the worst case), at most
//       --max-usd in worst-case terms. Stops at the ceiling.
//
// It refuses, before any model call: a clinical course (enforced in
// lib/lesson-variant.ts, whatever the switch says), a learner's own course,
// and writing for a course whose switch (subject_tracks.beginner_variants) is off. It does
// NOT turn the switch on: that is a separate, deliberate step (the doc).
// Nothing it writes is served until the switch is on.

import "../supabase/seed/env-local";
import { query, queryOne, closePool } from "../lib/db";
import { isActive } from "../lib/progress-sql";
import { getModel } from "../lib/anthropic";
import { factCheckModel, modelFactChecker } from "../lib/fact-check";
import { FactCheckUnavailableError, HeldForAccuracyError } from "../lib/generation-gate";
import { InvalidContentError } from "../lib/content-validator";
import { assertBeginnerAllowed, BeginnerVariantRefused } from "../lib/lesson-variant";
import { generateBeginnerVariant, modelConsistencyChecker, modelVariantWriter, variantUpperBoundUsd } from "../lib/beginner-variants";
import { affordableCount, parseVariantArgs } from "./beginner-variants-lib";

async function main() {
  const args = parseVariantArgs(process.argv.slice(2));
  if (args.errors.length) {
    for (const e of args.errors) console.error(e);
    process.exit(2);
  }
  const track = await queryOne<{ id: string; title: string; switch_on: boolean; user_id: string | null; cat: string | null; sub: string | null }>(
    `select st.id, st.title, st.beginner_variants as switch_on, st.user_id, ec.slug as cat, es.slug as sub
       from subject_tracks st
       left join education_subcategories es on es.id = st.subcategory_id left join education_categories ec on ec.id = es.category_id
      where st.code = $1 and st.user_id is null`,
    [args.course]
  );
  if (!track) {
    console.error(`No catalog course with code ${args.course}.`);
    process.exit(2);
  }
  try {
    assertBeginnerAllowed({ ownedByLearner: track.user_id !== null, categorySlug: track.cat, subcategorySlug: track.sub });
  } catch (e) {
    if (e instanceof BeginnerVariantRefused) {
      console.error(`Refused: ${track.title} cannot have beginner versions (${e.message}).`);
      process.exit(2);
    }
    throw e;
  }
  if (!track.switch_on && args.confirm) {
    console.error(`Refused: the beginner-versions switch for ${track.title} is off. Turn it on first (docs/beginner-variants.md); this script never does.`);
    process.exit(2);
  }
  if (!track.switch_on) console.log(`Note: the switch for ${track.title} is OFF. A dry run still works; writing (--confirm) is refused until it is on.`);

  const model = getModel();
  const perObjective = variantUpperBoundUsd(model);
  // Objectives with a servable standard lesson and no variant written from it yet.
  const rows = await query<{ id: string; title: string }>(
    `select o.id, o.title
       from objectives o join course_units cu on cu.id = o.unit_id
       join lesson_content lc on lc.objective_id = o.id
       left join lesson_content_variants v on v.objective_id = o.id and v.level = 'new'
      where cu.track_id = $1 and ${isActive("cu")} and ${isActive("o")} and v.objective_id is null
      order by cu.sort_order, o.sort_order`,
    [track.id]
  );
  let todo = args.limit ? rows.slice(0, args.limit) : rows;
  if (args.maxUsd !== null) todo = todo.slice(0, affordableCount(args.maxUsd, perObjective));
  console.log(`${track.title}: ${rows.length} objective(s) have a standard lesson and no beginner version.`);
  console.log(`Worst case per objective: $${perObjective.toFixed(3)} (2 writer, 2 fact-check, 2 consistency calls). This run: ${todo.length} objective(s), at most $${(todo.length * perObjective).toFixed(2)}.`);
  if (!args.confirm) {
    console.log("DRY RUN: nothing was called or written. Add --confirm --max-usd <dollars> to write them.");
    return;
  }

  const deps = {
    write: modelVariantWriter({ userId: null }),
    checkConsistency: modelConsistencyChecker({ userId: null }),
    factCheck: modelFactChecker,
    model,
    userId: null,
    log: (m: string) => console.log(m),
  };
  console.log(`Fact-check model: ${factCheckModel()}.`);
  const tally = { stored: 0, kept: 0, skipped: 0, held: 0, invalid: 0, unchecked: 0 };
  for (const o of todo) {
    try {
      const r = await generateBeginnerVariant(o.id, deps);
      tally[r.status]++;
      console.log(`${r.status}: ${o.title}${"reason" in r ? ` (${r.reason})` : ""}`);
    } catch (e) {
      if (e instanceof HeldForAccuracyError) tally.held++;
      else if (e instanceof InvalidContentError) tally.invalid++;
      else if (e instanceof FactCheckUnavailableError) tally.unchecked++;
      else throw e;
      console.log(`not stored: ${o.title}: ${(e as Error).message}`);
    }
  }
  console.log(`Done. ${JSON.stringify(tally)}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => closePool());

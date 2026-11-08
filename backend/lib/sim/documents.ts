// REQ-162 (docs/sims.md 12): the authored scenario documents and their
// golden paths, in seed order. Phase 1a lists them for the tests; Phase 1b's
// seed reads the same list.
import { join } from "node:path";

export interface DocumentEntry {
  course: string; // the track code the objective belongs to
  slug: string;
  file: string;
  golden: string | null;
}

const ROOT = join(__dirname, "..", "..", "supabase", "seed", "sims");

function entry(course: string, slug: string): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.sim.json`), golden: join(ROOT, course, `${slug}.golden.json`) };
}

// Phase 1a step 5 adds the four prototype ports here (tamponade after CABG,
// TicketBurst launch day, the Lakeshore clinic app, Dana's knee valgus); the
// list is empty until they land, and every test over it is a no-op until then.
export const ALL_DOCUMENTS: readonly DocumentEntry[] = [];

export { entry as documentEntry };

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

// Phase 1a step 5: the prototype ports. Tamponade after CABG and the TicketBurst
// launch day (AWSSAA) are ported; the Lakeshore clinic app (PMP) and Dana's
// knee valgus (NASMCPT) are still to come (PR #64's remaining work).
export const ALL_DOCUMENTS: readonly DocumentEntry[] = [entry("CCRNADULT", "tamponade-after-cabg"), entry("AWSSAA", "ticketburst-launch-day")];

export { entry as documentEntry };

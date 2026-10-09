import { after } from "next/server";
import { queryOne } from "@/lib/db";
import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { loadObjective, ensureGeneration, pendingGeneration } from "@/lib/lesson-generation";

// The objective immediately after this one in course order: same unit with
// the next sort_order, or -- if this is the unit's last objective -- the
// first objective of the next unit in the same track. Ordering entirely by
// (unit.sort_order, objective.sort_order) as one tuple comparison covers
// both cases without special-casing "last in unit."
//
// REQ-074: also returns the next objective's title and unit so the lesson
// screen's "Next objective" button can navigate with the same params the
// course dashboard passes, without a second round trip.
export interface NextObjective {
  id: string;
  title: string;
  unit_id: string;
  unit_title: string;
}

async function findNextObjective(objectiveId: string): Promise<NextObjective | null> {
  const row = await queryOne<NextObjective>(
    `with cur as (
       select cu.track_id, cu.sort_order as unit_sort, o.sort_order as obj_sort
       from objectives o
       join course_units cu on cu.id = o.unit_id
       where o.id = $1
     )
     select o.id, o.title, cu.id as unit_id, cu.title as unit_title
     from objectives o
     join course_units cu on cu.id = o.unit_id
     join cur on cu.track_id = cur.track_id
     where (cu.sort_order, o.sort_order) > (cur.unit_sort, cur.obj_sort)
     order by cu.sort_order, o.sort_order
     limit 1`,
    [objectiveId]
  );
  return row ?? null;
}

// POST /api/objectives/:id/lesson/prefetch-next -- best-effort nudge fired by
// the mobile lesson screen as soon as it opens objective :id, to warm the
// cache for whatever comes next in course order. The learner spends real
// time working through guess/teach/fade/solo on the current objective --
// normally well over a minute -- which is usually more than enough head
// start for the next objective's ~20s generation to finish invisibly, so by
// the time they actually navigate there GET returns an instant cache hit
// instead of triggering generation in the interactive path.
//
// Always responds quickly; the generation itself (if any) continues via
// after() regardless of what this response says. Never spends a second
// Anthropic call redundantly: checks the cache, then the shared
// `pendingGeneration` in-flight map (shared with the lesson route itself,
// and claimed synchronously by ensureGeneration before any await), so a
// prefetch racing a real GET/POST for the same objective always collapses
// onto one generation -- including the intro half, not just fade/solo.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    await requireAcknowledgementForObjective(id, user.id);

    const next = await findNextObjective(id);
    if (!next) return ok({ nextObjectiveId: null, next: null, status: "none" });
    const nextId = next.id;

    // The next objective is very likely still in the same track/unit as the
    // current one, but check anyway rather than assume -- a track boundary
    // shouldn't be possible given findNextObjectiveId only looks within one
    // track, but a disclaimer-gated track's acknowledgement is still a real
    // precondition worth enforcing explicitly rather than inferring it.
    await requireAcknowledgementForObjective(nextId, user.id);

    const alreadyInFlight = pendingGeneration.has(nextId);
    if (alreadyInFlight) {
      return ok({ nextObjectiveId: nextId, next, status: "in-flight" });
    }

    const existing = await queryOne<{ id: string }>(
      `select id from lesson_content where objective_id = $1`,
      [nextId]
    );
    if (existing) return ok({ nextObjectiveId: nextId, next, status: "already-cached" });

    const objRow = await loadObjective(nextId);
    if (!objRow) return notFound("Next objective not found");

    // Fully fire-and-forget: nobody is waiting on this response for actual
    // lesson content, so there's no reason to await the intro half inline
    // the way GET/POST do for a real visit.
    const handle = ensureGeneration(nextId, objRow);
    after(() => handle.fullPromise.catch(() => {}));

    return ok({ nextObjectiveId: nextId, next, status: "started" });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

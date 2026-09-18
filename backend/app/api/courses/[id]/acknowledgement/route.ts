import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

interface TrackRow {
  id: string;
  requires_acknowledgement: boolean;
  disclaimer_key: string | null;
  disclaimer_version: number;
}

// Shared by both handlers: a track the caller owns, or null.
async function loadTrack(trackId: string, userId: string): Promise<TrackRow | null> {
  return queryOne<TrackRow>(
    `select id, requires_acknowledgement, disclaimer_key, disclaimer_version
       from subject_tracks where id = $1 and user_id = $2`,
    [trackId, userId]
  );
}

// GET /api/courses/:id/acknowledgement — whether this user still owes an
// acknowledgement for this track, and which disclaimer to show them.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const track = await loadTrack(id, user.id);
    if (!track) return notFound("Track not found");

    if (!track.requires_acknowledgement) {
      return ok({ required: false, acknowledged: true });
    }

    const existing = await queryOne<{ acknowledged_at: string }>(
      `select acknowledged_at from track_acknowledgements
        where user_id = $1 and track_id = $2 and disclaimer_version = $3`,
      [user.id, id, track.disclaimer_version]
    );

    return ok({
      required: true,
      acknowledged: !!existing,
      acknowledgedAt: existing?.acknowledged_at ?? null,
      disclaimerKey: track.disclaimer_key,
      disclaimerVersion: track.disclaimer_version,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/courses/:id/acknowledgement — record that the user accepted the
// current disclaimer. Body: { disclaimerVersion } -- the client echoes back
// the version it actually displayed, so agreeing to a stale disclaimer that
// was superseded mid-session can't be recorded as agreement to the new one.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const track = await loadTrack(id, user.id);
    if (!track) return notFound("Track not found");
    if (!track.requires_acknowledgement) {
      return badRequest("This course doesn't require an acknowledgement.");
    }

    const body = await req.json().catch(() => ({}));
    const shown = body?.disclaimerVersion;
    if (typeof shown !== "number") return badRequest("disclaimerVersion is required");
    if (shown !== track.disclaimer_version) {
      return badRequest("This disclaimer has been updated. Reload the course and read it again.");
    }

    const row = await queryOne(
      `insert into track_acknowledgements (user_id, track_id, disclaimer_version, disclaimer_key)
       values ($1, $2, $3, $4)
       on conflict (user_id, track_id, disclaimer_version) do update
         set acknowledged_at = track_acknowledgements.acknowledged_at
       returning acknowledged_at`,
      [user.id, id, track.disclaimer_version, track.disclaimer_key ?? "general"]
    );

    return ok({ acknowledged: true, acknowledgedAt: (row as { acknowledged_at: string }).acknowledged_at }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

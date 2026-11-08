import { queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { compareNoteIds, visibleReleaseNotes, type ReleaseNote } from "@/lib/release-notes";

// REQ-140: per-learner "What's new" state (app_users.whats_new_seen_id,
// migration 054). The notes themselves are in lib/release-notes.ts.

export interface WhatsNewState {
  entries: ReleaseNote[]; // newest first, gates applied
  unseenIds: string[]; // newest first; the app shows the first one
  seenId: string | null;
}

export const UNKNOWN_NOTE_MESSAGE = "That release note doesn't exist.";

// Pure. Never dismissed anything (null): only the newest note, once -- an
// existing learner is not handed the whole history. Otherwise every note
// newer than the marker. A marker naming a note since removed or gated off
// still works: the comparison is by id order, not by position.
export function unseenNoteIds(entries: ReleaseNote[], seenId: string | null): string[] {
  if (entries.length === 0) return [];
  if (seenId === null) return [entries[0].id];
  return entries.filter((e) => compareNoteIds(e.id, seenId) > 0).map((e) => e.id);
}

export function whatsNewState(entries: ReleaseNote[], seenId: string | null): WhatsNewState {
  return { entries, unseenIds: unseenNoteIds(entries, seenId), seenId };
}

export async function seenNoteId(userId: string): Promise<string | null> {
  const row = await queryOne<{ whats_new_seen_id: string | null }>(
    `select whats_new_seen_id from app_users where id = $1`,
    [userId]
  );
  return row?.whats_new_seen_id ?? null;
}

export async function whatsNewFor(userId: string): Promise<WhatsNewState> {
  return whatsNewState(visibleReleaseNotes(), await seenNoteId(userId));
}

// Moves the marker to `id` if that is newer; never back. Idempotent, and two
// devices dismissing at once both end on the newer id (one conditional
// UPDATE). Only an id this server currently shows is accepted.
export async function markNoteSeen(userId: string, id: unknown): Promise<WhatsNewState> {
  if (typeof id !== "string" || id.length === 0) throw new UserFacingError("id is required", 400);
  const entries = visibleReleaseNotes();
  if (!entries.some((e) => e.id === id)) throw new UserFacingError(UNKNOWN_NOTE_MESSAGE, 400);
  await queryOne(
    `update app_users set whats_new_seen_id = $2
      where id = $1 and (whats_new_seen_id is null or whats_new_seen_id collate "C" < $2 collate "C")
      returning id`,
    [userId, id]
  );
  return whatsNewState(entries, await seenNoteId(userId));
}

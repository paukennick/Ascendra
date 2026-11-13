// REQ-249 (Nick, 2026-11-12: "can we create an icon or maybe a filter for
// courses with sims?"): the course card's sims badge and Explore's "Has
// sims" filter. Both read `sim_count` from GET /api/courses, which counts the
// served sims on the course, by the start route's rule (0 while sims are
// off; backend/lib/sim-count.ts). Pure functions, so
// src/lib/courseSims.test.ts can check them without a screen.

export interface SimCounted {
  sim_count?: number | null;
}

// The count, or 0 for anything that is not a whole number above zero (an
// older server sends none).
export function simCountOf(track: SimCounted): number {
  const n = track.sim_count;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : 0;
}

export function hasSims(track: SimCounted): boolean {
  return simCountOf(track) > 0;
}

// What the card shows: a short label beside the other badges, and the words
// a screen reader says (the badge row is outside the reading order, so the
// card's button carries them). Null: no badge.
export function simBadge(track: SimCounted): { label: string; accessibilityLabel: string } | null {
  const n = simCountOf(track);
  if (n === 0) return null;
  return {
    label: n === 1 ? "1 sim" : `${n} sims`,
    accessibilityLabel: n === 1 ? "Has 1 simulation" : `Has ${n} simulations`,
  };
}

// The "Has sims" chip: AND with search, category and verification.
export function matchesSimsFilter(track: SimCounted, simsOnly: boolean): boolean {
  return !simsOnly || hasSims(track);
}

// The chip is shown only when some listed course has sims (none do while
// sims are switched off).
export function showSimsFilter(tracks: readonly SimCounted[] | null | undefined): boolean {
  return !!tracks && tracks.some(hasSims);
}

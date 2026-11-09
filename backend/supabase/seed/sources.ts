// REQ-142: a cited source with the dates that keep it honest. Every authored
// lab's sources carry these (seed/labs/*.ts), so `npm run currency:report`
// can list what is due for a re-check without touching the network, and the
// seed tests refuse a source without them.
//
//   checkedAt  the day a person last confirmed the source says what we use
//              it for (YYYY-MM-DD). Backfilled from git history when the
//              repo had no date (REQ-142): the day the line was last edited.
//   recheckBy  when to look again. Defaults to checkedAt plus the kind's
//              interval; set it explicitly when the publisher has announced
//              a change date (a new exam outline, a guideline update).
//   kind       what the source is, which sets the default interval:
//              exam outlines and references change on a yearly cycle or
//              slower; clinical guidelines and cloud prices / service limits
//              change often enough that six months is the safer default.

export const SOURCE_KINDS = ["exam_outline", "reference", "clinical_guideline", "cloud_pricing_limits"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const RECHECK_MONTHS: Record<SourceKind, number> = {
  exam_outline: 12,
  reference: 12,
  clinical_guideline: 6,
  cloud_pricing_limits: 6,
};

export interface SourceRef {
  url: string;
  kind: SourceKind;
  checkedAt: string;
  recheckBy?: string;
}

export const source = (url: string, kind: SourceKind, checkedAt: string, recheckBy?: string): SourceRef =>
  recheckBy ? { url, kind, checkedAt, recheckBy } : { url, kind, checkedAt };

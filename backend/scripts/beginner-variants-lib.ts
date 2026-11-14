// REQ-262: the pure parts of scripts/beginner-variants.ts (unit tested).
//
// The script is a DRY RUN unless --confirm is given, and --confirm needs
// --max-usd (an upper bound it will not exceed), so a run can never be started
// by accident or without a stated ceiling.

export interface VariantArgs {
  course: string | null;
  limit: number | null;
  confirm: boolean;
  maxUsd: number | null;
}

export function parseVariantArgs(argv: string[]): VariantArgs & { errors: string[] } {
  const errors: string[] = [];
  const value = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const course = value("--course")?.trim().toUpperCase() || null;
  const limitRaw = value("--limit");
  const maxRaw = value("--max-usd");
  const limit = limitRaw === undefined ? null : Number(limitRaw);
  const maxUsd = maxRaw === undefined ? null : Number(maxRaw);
  const confirm = argv.includes("--confirm");
  if (!course) errors.push("--course <CODE> is required (one course at a time).");
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) errors.push("--limit must be a whole number, 1 or more.");
  if (maxUsd !== null && (!Number.isFinite(maxUsd) || maxUsd <= 0)) errors.push("--max-usd must be a number above 0.");
  if (confirm && maxUsd === null) errors.push("--confirm needs --max-usd <dollars>: the most this run may cost.");
  return { course, limit, confirm, maxUsd, errors };
}

// How many objectives a ceiling pays for at the per-objective upper bound.
export function affordableCount(maxUsd: number, perObjectiveUsd: number): number {
  return perObjectiveUsd > 0 ? Math.floor(maxUsd / perObjectiveUsd) : 0;
}

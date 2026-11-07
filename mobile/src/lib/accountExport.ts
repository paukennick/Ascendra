// REQ-098: GET /api/account/export returns at most a page of rows per
// section and lists, under `more`, each section that has further rows with
// the offset to ask for next. This fetches those pages and merges them, so
// the learner still gets everything in one export. Pure apart from `get`, so
// it can be tested without the network.

type Get = (path: string) => Promise<Record<string, unknown>>;

// A runaway server answer (an offset that never ends) stops here.
export const MAX_EXPORT_PAGES = 200;

export async function fetchFullExport(get: Get): Promise<Record<string, unknown>> {
  const first = await get("/api/account/export");
  const out: Record<string, unknown> = { ...first };
  const more = (first.more && typeof first.more === "object" ? first.more : {}) as Record<string, { nextOffset?: unknown }>;
  delete out.more;
  let pages = 0;
  for (const [section, info] of Object.entries(more)) {
    let offset = info?.nextOffset;
    const rows = Array.isArray(out[section]) ? [...(out[section] as unknown[])] : [];
    while (typeof offset === "number" && pages < MAX_EXPORT_PAGES) {
      pages++;
      const page = await get(
        `/api/account/export?section=${encodeURIComponent(section)}&offset=${offset}`
      );
      if (Array.isArray(page.rows)) rows.push(...page.rows);
      offset = page.nextOffset;
    }
    out[section] = rows;
    if (typeof offset === "number") out.incomplete = true;
  }
  return out;
}

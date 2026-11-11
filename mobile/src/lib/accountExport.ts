// REQ-135: GET /api/account/export returns at most a page of rows per
// section and lists, under `more`, each section that has further rows with
// the offset to ask for next. This fetches those pages and merges them, so
// the learner still gets everything in one export. Pure apart from `get`, so
// it can be tested without the network.

type Get = (path: string) => Promise<Record<string, unknown>>;

// A runaway server answer (an offset that never ends) stops here. REQ-118:
// pages are 500 rows (and at most ~1 MB) since Audit 3, and a section can be
// deferred whole to paging (nextOffset 0), so this matches the server's
// 600-pages-an-hour limit (300k rows) instead of 200 pages of 5,000.
export const MAX_EXPORT_PAGES = 600;

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

// REQ-205 (FAIL-905): on the web, "Export my data" gave the browser's share
// sheet (or nothing, on a desktop browser). It now downloads a JSON file: a
// Blob, an object URL and a temporary link that is clicked. The browser
// pieces are passed in so this can be tested without a browser.
export interface DownloadAnchor {
  href: string;
  download: string;
  style?: { display: string };
  click(): void;
}
export interface DownloadEnv {
  makeBlob(text: string, type: string): unknown;
  createObjectURL(blob: unknown): string;
  revokeObjectURL(url: string): void;
  createAnchor(): DownloadAnchor;
  append(a: DownloadAnchor): void;
  remove(a: DownloadAnchor): void;
  defer(fn: () => void): void;
}

// REQ-217 (FAIL-1055): the phone's share sheet takes the export as text through
// the system's Binder (about 1 MB for everything in flight, Android), so a
// large export made the share fail or the app close. Over this size the phone
// sends the learner to the web download (REQ-205) instead. (A real file
// share needs expo-file-system and expo-sharing: a new build, not an update.)
export const MAX_SHARE_CHARS = 200_000;
export const LARGE_EXPORT_MESSAGE =
  "Your export is bigger than the phone's share sheet can carry. Sign in to Ascendra in a web browser and use Export my data there to download it as a file.";

export function exportFitsShareSheet(text: string): boolean {
  return text.length <= MAX_SHARE_CHARS;
}

export function exportFileName(now: Date = new Date()): string {
  return `ascendra-data-export-${now.toISOString().slice(0, 10)}.json`;
}

export function downloadJson(data: unknown, fileName: string, env: DownloadEnv): void {
  const url = env.createObjectURL(env.makeBlob(JSON.stringify(data, null, 2), "application/json"));
  const a = env.createAnchor();
  a.href = url;
  a.download = fileName;
  if (a.style) a.style.display = "none";
  env.append(a);
  a.click();
  env.remove(a);
  // Revoked a moment later: some browsers start the download after click().
  env.defer(() => env.revokeObjectURL(url));
}

// The real browser's pieces. Only called on the web.
export function browserDownloadEnv(): DownloadEnv {
  const g = globalThis as unknown as {
    Blob: new (parts: string[], o: { type: string }) => unknown;
    URL: { createObjectURL(b: unknown): string; revokeObjectURL(u: string): void };
    document: { createElement(t: string): DownloadAnchor; body: { appendChild(n: unknown): void; removeChild(n: unknown): void } };
    setTimeout(fn: () => void, ms: number): unknown;
  };
  return {
    makeBlob: (text, type) => new g.Blob([text], { type }),
    createObjectURL: (b) => g.URL.createObjectURL(b),
    revokeObjectURL: (u) => g.URL.revokeObjectURL(u),
    createAnchor: () => g.document.createElement("a"),
    append: (a) => g.document.body.appendChild(a),
    remove: (a) => g.document.body.removeChild(a),
    defer: (fn) => void g.setTimeout(fn, 1000),
  };
}

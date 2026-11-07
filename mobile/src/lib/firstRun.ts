// REQ-119 (Audit 3 product M2): the course list on the first-run "What are
// you working toward?" step. Matches title, code, description and category
// (like Explore), shows a short list so a cheap phone isn't rendering 90
// rows, and says how many more there are.

export interface PickableTrack {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  category_sort_order?: number | null;
}

export const FIRST_RUN_LIST_MAX = 12;

export function pickableCourses<T extends PickableTrack>(tracks: readonly T[], search: string, max = FIRST_RUN_LIST_MAX): { items: T[]; more: number } {
  const q = search.trim().toLowerCase();
  const matches = tracks
    .filter((t) => {
      if (!q) return true;
      return [t.title, t.code, t.description ?? "", t.category_name ?? "", t.subcategory_name ?? ""].join(" ").toLowerCase().includes(q);
    })
    .slice()
    .sort((a, b) => {
      if (q) {
        // Title or code starting with the search first, then containing it,
        // then a description or category match.
        const rank = (t: T) => {
          const title = t.title.toLowerCase();
          const code = t.code.toLowerCase();
          if (title.startsWith(q) || code.startsWith(q)) return 0;
          return title.includes(q) || code.includes(q) ? 1 : 2;
        };
        const d = rank(a) - rank(b);
        if (d !== 0) return d;
      }
      const ac = a.category_sort_order ?? 999;
      const bc = b.category_sort_order ?? 999;
      return ac !== bc ? ac - bc : a.title.localeCompare(b.title);
    });
  return { items: matches.slice(0, max), more: Math.max(0, matches.length - max) };
}

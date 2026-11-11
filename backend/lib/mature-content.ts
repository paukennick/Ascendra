import { query } from "@/lib/db";

// REQ-224 (Nick, 2026-11-10): the mental health courses (EPPP first, then NCE,
// NCMHCE, ASWB Clinical and the Washington psychology jurisprudence course)
// include frank clinical material -- suicide risk, abuse, violence, trauma --
// where the exam tests it. Before any of it is shown the learner confirms,
// once per account and notice version, that they are 18 or older and want to
// see it. This is separate from the study notice (lib/study-notice.ts), which
// everyone accepts, and from the 16+ sign-up confirmation (migration 070).
//
// Recorded in mature_content_confirmations (migration 077): one row per
// account, category and version, the first one kept. The app shows the
// notice on the intake form when a mental health course is picked, on the
// Explore category filter, and whenever a mental health course is opened or
// started without a confirmation (mobile/src/lib/matureContent.ts holds the
// text and the same version; a mobile test checks they match). The server
// refuses every mental health course route without it: 403 with
// code "mature_content_required" and a plain message, never a 5xx.
//
// Bump the version when the notice's meaning changes: everyone is asked
// again the next time they open a mental health course.
export const MATURE_CONTENT_NOTICE_VERSION = "2026-11-10";
export const MATURE_CONTENT_MIN_AGE = 18;

// education_categories slugs whose courses are gated. Kept in step with the
// check constraint on mature_content_confirmations.category_slug (077).
export const MATURE_CATEGORIES = ["mental-health"] as const;
export type MatureCategory = (typeof MATURE_CATEGORIES)[number];

export const MATURE_SOURCES = ["intake", "catalog", "course"] as const;
export type MatureSource = (typeof MATURE_SOURCES)[number];

export const MATURE_CONTENT_REQUIRED_CODE = "mature_content_required";
export const MATURE_CONTENT_REQUIRED_MESSAGE =
  "This course includes frank clinical material for adults. Confirm you're 18 or older to open it (update the app if you don't see the notice).";
export const MATURE_NOTICE_OUTDATED_MESSAGE =
  "This notice has been updated. Close it and open the course again to read the current version.";

export function isMatureCategory(slug: unknown): slug is MatureCategory {
  return typeof slug === "string" && (MATURE_CATEGORIES as readonly string[]).includes(slug);
}

export function isMatureSource(s: unknown): s is MatureSource {
  return typeof s === "string" && (MATURE_SOURCES as readonly string[]).includes(s);
}

// The body the 403 carries, so the app can show the notice and retry.
export function matureContentRequiredBody(category: MatureCategory) {
  return {
    code: MATURE_CONTENT_REQUIRED_CODE,
    category,
    noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
    minAge: MATURE_CONTENT_MIN_AGE,
  };
}

// SQL: the mature category of the track aliased `track` if the learner in
// `userParam` has NOT confirmed it at the current version, else null. For
// queries that already read the track row (GET /api/courses/:id), so the gate
// costs no extra round trip. The slugs and version are constants of this
// file, never request input.
export function matureContentNeededSql(track: string, userParam: string): string {
  const slugs = MATURE_CATEGORIES.map((s) => `'${s}'`).join(", ");
  return `(select ec.slug
             from education_subcategories esc join education_categories ec on ec.id = esc.category_id
            where esc.id = ${track}.subcategory_id and ec.slug in (${slugs})
              and not exists (select 1 from mature_content_confirmations mcc
                               where mcc.user_id = ${userParam} and mcc.category_slug = ec.slug
                                 and mcc.notice_version = '${MATURE_CONTENT_NOTICE_VERSION}'))`;
}

export interface MatureCategoryState {
  category: MatureCategory;
  confirmed: boolean;
  confirmedAt: string | null;
  noticeVersion: string;
  minAge: number;
}

export async function matureContentState(userId: string): Promise<MatureCategoryState[]> {
  const rows = await query<{ category_slug: string; confirmed_at: Date }>(
    `select category_slug, confirmed_at from mature_content_confirmations
      where user_id = $1 and notice_version = $2`,
    [userId, MATURE_CONTENT_NOTICE_VERSION]
  );
  return MATURE_CATEGORIES.map((category) => {
    const row = rows.find((r) => r.category_slug === category);
    return {
      category,
      confirmed: !!row,
      confirmedAt: row ? new Date(row.confirmed_at).toISOString() : null,
      noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
      minAge: MATURE_CONTENT_MIN_AGE,
    };
  });
}

// Idempotent: a repeat (a retry, a second phone) keeps the first row.
export async function recordMatureContentConfirmation(userId: string, category: MatureCategory, source: MatureSource): Promise<void> {
  await query(
    `insert into mature_content_confirmations (user_id, category_slug, notice_version, min_age, source)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, category_slug, notice_version) do nothing`,
    [userId, category, MATURE_CONTENT_NOTICE_VERSION, MATURE_CONTENT_MIN_AGE, source]
  );
}

// The gated category of each of these tracks that the learner has not
// confirmed (one query), for routes that take several tracks at once (the
// intake targets). Unknown ids are simply absent.
export async function unconfirmedMatureCategories(userId: string, trackIds: string[]): Promise<MatureCategory[]> {
  if (!trackIds.length) return [];
  const rows = await query<{ needed: string | null }>(
    `select ${matureContentNeededSql("st", "$1")} as needed
       from subject_tracks st where st.id = any($2::uuid[])`,
    [userId, trackIds]
  );
  return [...new Set(rows.map((r) => r.needed).filter(isMatureCategory))];
}

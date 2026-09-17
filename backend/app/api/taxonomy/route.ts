import { query } from "@/lib/db";
import { ok, serverError, unauthorized } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

type TaxonomyRow = {
  category_id: string;
  category_slug: string;
  category_name: string;
  category_sort_order: number;
  subcategory_id: string;
  subcategory_slug: string;
  subcategory_name: string;
  freshness_model:
    | "certification_aligned"
    | "technology_aligned"
    | "academic_foundational";
  subcategory_sort_order: number;
};

// GET /api/taxonomy — stable navigation taxonomy, grouped for mobile clients.
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const rows = await query<TaxonomyRow>(
      `select * from view_education_taxonomy
       order by category_sort_order, subcategory_sort_order`,
    );

    const categories = Array.from(
      rows
        .reduce(
          (groups, row) => {
            const category = groups.get(row.category_id) ?? {
              id: row.category_id,
              slug: row.category_slug,
              name: row.category_name,
              sortOrder: row.category_sort_order,
              subcategories: [],
            };
            category.subcategories.push({
              id: row.subcategory_id,
              slug: row.subcategory_slug,
              name: row.subcategory_name,
              freshnessModel: row.freshness_model,
              sortOrder: row.subcategory_sort_order,
            });
            groups.set(row.category_id, category);
            return groups;
          },
          new Map<
            string,
            {
              id: string;
              slug: string;
              name: string;
              sortOrder: number;
              subcategories: Array<{
                id: string;
                slug: string;
                name: string;
                freshnessModel: TaxonomyRow["freshness_model"];
                sortOrder: number;
              }>;
            }
          >(),
        )
        .values(),
    );

    return ok({ categories });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

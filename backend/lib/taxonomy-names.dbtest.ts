// REQ-318 (migration 087): with every migration applied, the taxonomy names
// that were built on an exam body's mark are descriptive, by unchanged slug,
// and 087 is idempotent: replaying it after an old name came back (a replay
// of 019) restores the new name, and replaying it again changes nothing.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, closePool } from "./db";
import { ownerClient, closeOwner } from "./test-owner";

const SQL = readFileSync(join(__dirname, "..", "supabase", "migrations", "087_taxonomy_names_without_marks.sql"), "utf8");

after(async () => {
  await closePool();
  await closeOwner();
});

async function subName(category: string, slug: string): Promise<string | undefined> {
  const r = await query<{ name: string }>(
    `select s.name from education_subcategories s join education_categories c on c.id = s.category_id where c.slug = $1 and s.slug = $2`,
    [category, slug]
  );
  return r[0]?.name;
}

describe("REQ-318: migration 087", () => {
  test("the vendor categories and subcategories carry descriptive names", async () => {
    const cats = await query<{ slug: string; name: string }>(
      `select slug, name from education_categories where slug = any($1::text[]) order by slug`,
      [["aws-certifications", "cloud-native-certifications", "comptia-certifications"]]
    );
    assert.deepEqual(cats, [
      { slug: "aws-certifications", name: "Cloud Certifications (AWS track)" },
      { slug: "cloud-native-certifications", name: "Cloud Native and Containers" },
      { slug: "comptia-certifications", name: "Vendor-Neutral IT Certifications (CompTIA track)" },
    ]);
    assert.equal(await subName("project-management-certifications", "pmi-certifications"), "Project, Program and Portfolio Certifications (PMI track)");
    assert.equal(await subName("healthcare-nursing", "nclex-preparation"), "Nursing Licensure Exam Preparation");
    const hc = await query<{ description: string }>(`select description from education_categories where slug = 'healthcare-nursing'`);
    assert.doesNotMatch(hc[0].description, /NCLEX/);
  });

  test("no category or subcategory name starts with a covered body's mark", async () => {
    const rows = await query<{ name: string }>(
      `select name from education_categories union all select name from education_subcategories`
    );
    const head = /^(AWS|Amazon|Microsoft|Azure|Google|CompTIA|PMI|CNCF|Linux Foundation|Kubernetes|Red Hat|OpenShift|Docker|NCLEX)\b/;
    assert.deepEqual(rows.map((r) => r.name).filter((n) => head.test(n)), []);
  });

  test("replaying 087 restores a name an earlier migration put back, and a second replay changes nothing", async () => {
    const c = await ownerClient();
    try {
      await c.query("begin");
      await c.query(`update education_subcategories set name = 'AWS Certifications' where slug = 'aws-certifications'`);
      await c.query(SQL);
      const r = await c.query<{ name: string }>(`select name from education_subcategories where slug = 'aws-certifications'`);
      assert.deepEqual(r.rows.map((x) => x.name), ["Cloud Certifications (AWS track)"]);
      const before = await c.query(`select ctid::text as ctid, slug, name from education_subcategories order by id`);
      await c.query(SQL);
      const again = await c.query(`select ctid::text as ctid, slug, name from education_subcategories order by id`);
      assert.deepEqual(again.rows, before.rows, "a second replay writes no new row version (ctid unchanged)");
      await c.query("rollback");
    } finally {
      c.release();
    }
  });
});
